import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { chatAPI, ChatChannelWithProfile, ChatMessage } from '../../lib/chat';
import { chatPlatforms, getChatPlatform, ChatPlatformId } from '../../components/chat/chatConfig';

type PlatformFilter = ChatPlatformId | 'all';

const formatRelativeTime = (value?: string | null) => {
  if (!value) return 'No messages yet';
  const date = new Date(value);
  return date.toLocaleString();
};

const AdminChatPage: React.FC = () => {
  const [adminId, setAdminId] = useState<string | null>(null);
  const [channels, setChannels] = useState<ChatChannelWithProfile[]>([]);
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [platformFilter, setPlatformFilter] = useState<PlatformFilter>('all');
  const [search, setSearch] = useState('');
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollAnchorRef = useRef<HTMLDivElement | null>(null);

  const selectedChannel = useMemo(
    () => channels.find((channel) => channel.id === selectedChannelId) || null,
    [channels, selectedChannelId]
  );

  const loadChannels = useCallback(async () => {
    try {
      const data = await chatAPI.getAdminChannels();
      setChannels(data);
      setLoading(false);
    } catch (err) {
      console.error('Failed to load admin chat channels:', err);
      setError('Unable to load chat channels.');
      setLoading(false);
    }
  }, []);

  const loadMessages = useCallback(async (channelId: string) => {
    setLoadingMessages(true);
    try {
      const data = await chatAPI.getChannelMessages(channelId);
      setMessages(data);
    } catch (err) {
      console.error('Failed to load chat messages:', err);
      setError('Unable to load chat messages.');
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  const appendMessage = useCallback((message: ChatMessage) => {
    setMessages((prev) => {
      if (prev.some((item) => item.id === message.id)) return prev;
      return [...prev, message];
    });
  }, []);

  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getUser();
      setAdminId(data.user?.id ?? null);
      await loadChannels();
    };
    init();
  }, [loadChannels]);

  useEffect(() => {
    if (!selectedChannelId && channels.length) {
      setSelectedChannelId(channels[0].id);
    }
  }, [channels, selectedChannelId]);

  useEffect(() => {
    if (!selectedChannelId) {
      setMessages([]);
      return;
    }
    loadMessages(selectedChannelId);
  }, [selectedChannelId, loadMessages]);

  useEffect(() => {
    const channel = supabase
      .channel('admin-chat-channels')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_channels' },
        () => loadChannels()
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'chat_channels' },
        () => loadChannels()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadChannels]);

  useEffect(() => {
    if (!selectedChannelId) return;
    const channel = supabase
      .channel(`admin-chat-messages:${selectedChannelId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `channel_id=eq.${selectedChannelId}`,
        },
        (payload) => {
          appendMessage(payload.new as ChatMessage);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedChannelId, appendMessage]);

  useEffect(() => {
    scrollAnchorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages]);

  const handleSend = async () => {
    const text = draft.trim();
    if (!text || !selectedChannelId || sending || !adminId) return;
    setError(null);
    setSending(true);
    try {
      const message = await chatAPI.sendMessage({
        channelId: selectedChannelId,
        senderId: adminId,
        senderRole: 'admin',
        body: text,
      });
      appendMessage(message);
      setDraft('');
    } catch (err) {
      console.error('Failed to send admin reply:', err);
      setError('Message failed to send.');
    } finally {
      setSending(false);
    }
  };

  const toggleStatus = async () => {
    if (!selectedChannel) return;
    const nextStatus = selectedChannel.status === 'closed' ? 'open' : 'closed';
    try {
      await supabase
        .from('chat_channels')
        .update({ status: nextStatus })
        .eq('id', selectedChannel.id);
    } catch (err) {
      console.error('Failed to update chat status:', err);
      setError('Unable to update chat status.');
    }
  };

  const filteredChannels = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    return channels.filter((channel) => {
      if (platformFilter !== 'all' && channel.platform !== platformFilter) return false;
      if (!normalized) return true;
      const name = channel.user_profiles?.username?.toLowerCase() || '';
      const email = channel.user_profiles?.email?.toLowerCase() || '';
      return name.includes(normalized) || email.includes(normalized) || channel.platform.includes(normalized);
    });
  }, [channels, platformFilter, search]);

  useEffect(() => {
    if (!filteredChannels.length) {
      setSelectedChannelId(null);
      return;
    }
    if (!selectedChannelId || !filteredChannels.some((channel) => channel.id === selectedChannelId)) {
      setSelectedChannelId(filteredChannels[0].id);
    }
  }, [filteredChannels, selectedChannelId]);

  return (
    <div className="ds-page space-y-6">
      <div className="ds-section flex flex-col gap-2">
        <h1 className="text-2xl font-semibold text-white">Live Chat Inbox</h1>
        <p className="text-sm text-gray-400">
          Real-time conversations from users. Reply instantly and manage statuses.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
        <div className="bg-brand-container border border-brand-border rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-brand-border space-y-3">
            <div className="relative">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by username, email, or platform..."
                className="w-full bg-brand-input border border-brand-border rounded-xl px-4 py-2 text-sm text-white placeholder-slate-400 focus:ring-2 focus:ring-brand-purple focus:outline-none"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setPlatformFilter('all')}
                className={`inline-flex items-center gap-2 px-3 py-2 rounded-full text-xs font-semibold transition ${
                  platformFilter === 'all' ? 'ds-btn-primary text-white' : 'ds-pill text-gray-300 hover:text-white'
                }`}
              >
                All
              </button>
              {chatPlatforms.map((platform) => (
                <button
                  key={platform.id}
                  onClick={() => setPlatformFilter(platform.id)}
                  className={`inline-flex items-center gap-2 px-3 py-2 rounded-full text-xs font-semibold transition ${
                    platformFilter === platform.id
                      ? 'ds-btn-primary text-white'
                      : 'ds-pill text-gray-300 hover:text-white'
                  }`}
                >
                  <span className={`h-6 w-6 rounded-full flex items-center justify-center ${platform.accent}`}>
                    {platform.icon}
                  </span>
                  {platform.label}
                </button>
              ))}
            </div>
          </div>

          <div className="max-h-[62vh] overflow-y-auto ds-scrollbar">
            {loading && <p className="text-xs text-gray-400 text-center py-6">Loading chats...</p>}
            {!loading && filteredChannels.length === 0 && (
              <p className="text-xs text-gray-400 text-center py-6">No chats found.</p>
            )}
            <div className="flex flex-col divide-y divide-brand-border">
              {filteredChannels.map((channel) => {
                const platform = getChatPlatform(channel.platform);
                const active = channel.id === selectedChannelId;
                const displayName = channel.user_profiles?.username || 'User';
                const displayEmail = channel.user_profiles?.email || 'Unknown email';
                return (
                  <button
                    key={channel.id}
                    onClick={() => setSelectedChannelId(channel.id)}
                    className={`text-left px-4 py-3 transition ${
                      active ? 'bg-brand-accent/20' : 'hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-white">{displayName}</p>
                        <p className="text-xs text-gray-400">{displayEmail}</p>
                        <p className="text-xs text-gray-500 mt-1 truncate max-w-[230px]">
                          {channel.last_message || 'No messages yet'}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span className={`inline-flex items-center gap-2 px-2 py-1 rounded-full text-[10px] ${platform.accent}`}>
                          {platform.icon}
                          {platform.label}
                        </span>
                        <span className="text-[10px] text-gray-500">{formatRelativeTime(channel.last_message_at)}</span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="bg-brand-container border border-brand-border rounded-2xl overflow-hidden flex flex-col min-h-[520px]">
          <div className="p-4 border-b border-brand-border flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-white">
                {selectedChannel?.user_profiles?.username || 'Select a chat'}
              </p>
              <p className="text-xs text-gray-400">
                {selectedChannel?.user_profiles?.email || 'Pick a conversation from the left panel.'}
              </p>
            </div>
            {selectedChannel && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">
                  {getChatPlatform(selectedChannel.platform).label}
                </span>
                <button
                  onClick={toggleStatus}
                  className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    selectedChannel.status === 'closed'
                      ? 'bg-gray-500/20 text-gray-200'
                      : 'bg-emerald-500/20 text-emerald-200'
                  }`}
                >
                  {selectedChannel.status === 'closed' ? 'Closed' : 'Open'}
                </button>
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto ds-scrollbar p-4 space-y-3">
            {loadingMessages && (
              <p className="text-xs text-gray-400 text-center">Loading messages...</p>
            )}
            {!loadingMessages &&
              messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.sender_role === 'admin' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                      message.sender_role === 'admin'
                        ? 'bg-brand-accent/40 text-white border border-brand-accent/40'
                        : 'bg-black/30 text-gray-200 border border-brand-border'
                    }`}
                  >
                    <p>{message.body}</p>
                    <span className="block text-[10px] text-gray-400 mt-1">
                      {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              ))}
            <div ref={scrollAnchorRef} />
          </div>

          <div className="p-4 border-t border-brand-border bg-black/20">
            {error && <p className="text-xs text-red-400 mb-2">{error}</p>}
            <div className="flex items-center gap-2">
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder={selectedChannel ? 'Write a reply...' : 'Select a chat to reply'}
                disabled={!selectedChannel || !adminId || sending}
                className="flex-1 bg-black/30 border border-brand-border rounded-lg px-3 py-2 text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-purple disabled:opacity-60"
              />
              <button
                onClick={handleSend}
                disabled={!selectedChannel || !adminId || sending}
                className="ds-btn-primary px-3 py-2 rounded-lg text-sm font-semibold disabled:opacity-60"
              >
                Send
              </button>
            </div>
            <p className="text-[11px] text-gray-500 mt-2">Press Enter to send. Shift+Enter for new line.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminChatPage;
