import React, { useEffect, useMemo, useRef, useState } from 'react';
import { getSessionUser, supabase } from '../lib/supabase';
import { chatAPI, ChatChannel, ChatMessage } from '../lib/chat';
import { chatPlatforms, getChatPlatform, ChatPlatformId } from './chat/chatConfig';

const formatTime = (value: string) =>
  new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

const LiveChatWidget: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [activePlatform, setActivePlatform] = useState<ChatPlatformId>('live');
  const [userId, setUserId] = useState<string | null>(null);
  const [channels, setChannels] = useState<Record<ChatPlatformId, ChatChannel | null>>(() => {
    const seed = {} as Record<ChatPlatformId, ChatChannel | null>;
    chatPlatforms.forEach((platform) => {
      seed[platform.id] = null;
    });
    return seed;
  });
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [loadingChannels, setLoadingChannels] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollAnchorRef = useRef<HTMLDivElement | null>(null);

  const activeChannel = channels[activePlatform];
  const isClosed = activeChannel?.status === 'closed';

  const platformMeta = useMemo(() => getChatPlatform(activePlatform), [activePlatform]);

  const loadUserSession = async () => {
    const user = await getSessionUser();
    setUserId(user?.id ?? null);
  };

  const loadChannels = async () => {
    setLoadingChannels(true);
    try {
      const data = await chatAPI.getUserChannels();
      const map = {} as Record<ChatPlatformId, ChatChannel | null>;
      chatPlatforms.forEach((platform) => {
        map[platform.id] = null;
      });
      data.forEach((channel) => {
        map[channel.platform] = channel;
      });
      setChannels(map);
    } catch (err) {
      console.error('Failed to load chat channels:', err);
      setError('Unable to load chat channels right now.');
    } finally {
      setLoadingChannels(false);
    }
  };

  const loadMessages = async (channelId: string) => {
    setLoadingMessages(true);
    try {
      const data = await chatAPI.getChannelMessages(channelId);
      setMessages(data);
    } catch (err) {
      console.error('Failed to load chat messages:', err);
      setError('Unable to load chat messages right now.');
    } finally {
      setLoadingMessages(false);
    }
  };

  const ensureChannel = async () => {
    if (!userId) {
      throw new Error('Please login to start a chat.');
    }
    if (activeChannel) return activeChannel;
    const channel = await chatAPI.upsertChannel(userId, activePlatform);
    setChannels((prev) => ({ ...prev, [activePlatform]: channel }));
    return channel;
  };

  const appendMessage = (message: ChatMessage) => {
    setMessages((prev) => {
      if (prev.some((item) => item.id === message.id)) return prev;
      return [...prev, message];
    });
    setChannels((prev) => {
      const channel = prev[activePlatform];
      if (!channel) return prev;
      return {
        ...prev,
        [activePlatform]: {
          ...channel,
          last_message: message.body,
          last_sender_role: message.sender_role,
          last_message_at: message.created_at,
          updated_at: message.created_at,
        },
      };
    });
  };

  const handleSend = async () => {
    const text = draft.trim();
    if (!text || sending) return;
    if (isClosed) {
      setError('This chat is closed. Please start a new request.');
      return;
    }
    setError(null);
    setSending(true);
    try {
      const channel = await ensureChannel();
      const message = await chatAPI.sendMessage({
        channelId: channel.id,
        senderId: userId,
        senderRole: 'user',
        body: text,
      });
      appendMessage(message);
      setDraft('');
    } catch (err) {
      console.error('Failed to send chat message:', err);
      setError('Message failed to send. Try again.');
    } finally {
      setSending(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    loadUserSession();
  }, [open]);

  useEffect(() => {
    if (!open || !userId) return;
    loadChannels();
  }, [open, userId]);

  useEffect(() => {
    if (!open) return;
    if (activeChannel?.id) {
      loadMessages(activeChannel.id);
      return;
    }
    setMessages([]);
  }, [open, activeChannel?.id, activePlatform]);

  useEffect(() => {
    if (!open || !activeChannel?.id) return;
    const channel = supabase
      .channel(`chat_messages:${activeChannel.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `channel_id=eq.${activeChannel.id}`,
        },
        (payload) => {
          appendMessage(payload.new as ChatMessage);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [open, activeChannel?.id, activePlatform]);

  useEffect(() => {
    if (!open || !userId) return;
    const channel = supabase
      .channel(`chat_channels:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'chat_channels',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const updated = payload.new as ChatChannel;
          setChannels((prev) => ({
            ...prev,
            [updated.platform]: { ...(prev[updated.platform] || updated), ...updated },
          }));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [open, userId]);

  useEffect(() => {
    if (!open) return;
    scrollAnchorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, open]);

  return (
    <div className="fixed bottom-5 right-5 z-[60]">
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="ds-btn-primary px-4 py-3 rounded-full flex items-center gap-2 shadow-purple-glow"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M4 5h16v11H9l-5 4V5z" />
          </svg>
          <span className="text-sm font-semibold">Live Chat</span>
        </button>
      )}

      {open && (
        <div className="w-[92vw] max-w-[390px] bg-brand-container border border-brand-border rounded-2xl shadow-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-brand-border bg-black/30">
            <div>
              <p className="text-sm font-semibold text-white">Support Chat</p>
              <p className="text-xs text-gray-400">Online - Avg reply 2-5 min</p>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="h-8 w-8 rounded-full bg-black/30 text-gray-300 hover:text-white hover:bg-black/50 transition"
              aria-label="Close chat"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4 mx-auto" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>

          <div className="px-3 py-3 border-b border-brand-border overflow-x-auto ds-scrollbar">
            <div className="flex items-center gap-2">
              {chatPlatforms.map((platform) => (
                <button
                  key={platform.id}
                  onClick={() => setActivePlatform(platform.id)}
                  className={`inline-flex items-center gap-2 px-3 py-2 rounded-full text-xs font-semibold transition ${
                    activePlatform === platform.id ? 'ds-btn-primary text-white' : 'ds-pill text-gray-300 hover:text-white'
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

          <div className="px-4 py-4 h-64 overflow-y-auto ds-scrollbar space-y-3">
            {loadingChannels && (
              <p className="text-xs text-gray-400 text-center">Loading chat channels...</p>
            )}
            {!userId && !loadingChannels && (
              <div className="text-center space-y-3">
                <p className="text-sm text-gray-300">Login required to start a live chat.</p>
                <a href="#/login" className="ds-btn-primary inline-flex px-4 py-2 rounded-lg text-sm font-semibold">
                  Go to Login
                </a>
              </div>
            )}
            {userId && !activeChannel && !loadingChannels && !loadingMessages && (
              <div className="text-center space-y-3">
                <div className="inline-flex items-center gap-2 text-xs px-3 py-2 rounded-full ds-pill text-gray-300">
                  <span className={`h-6 w-6 rounded-full flex items-center justify-center ${platformMeta.accent}`}>
                    {platformMeta.icon}
                  </span>
                  {platformMeta.label} chat not started
                </div>
                <p className="text-sm text-gray-400">Send your first message to open this chat.</p>
              </div>
            )}
            {loadingMessages && (
              <p className="text-xs text-gray-400 text-center">Loading messages...</p>
            )}
            {!loadingMessages &&
              activeChannel &&
              messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.sender_role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                      message.sender_role === 'user'
                        ? 'bg-brand-accent/40 text-white border border-brand-accent/40'
                        : 'bg-black/30 text-gray-200 border border-brand-border'
                    }`}
                  >
                    <p>{message.body}</p>
                    <span className="block text-[10px] text-gray-400 mt-1">{formatTime(message.created_at)}</span>
                  </div>
                </div>
              ))}
            <div ref={scrollAnchorRef} />
          </div>

          <div className="p-3 border-t border-brand-border bg-black/20">
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
                placeholder={
                  !userId
                    ? 'Login to send a message'
                    : isClosed
                      ? 'Chat closed by admin'
                      : `Message via ${platformMeta.label}...`
                }
                disabled={!userId || sending || isClosed}
                className="flex-1 bg-black/30 border border-brand-border rounded-lg px-3 py-2 text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-purple disabled:opacity-60"
              />
              <button
                onClick={handleSend}
                disabled={!userId || sending || isClosed}
                className="ds-btn-primary px-3 py-2 rounded-lg text-sm font-semibold disabled:opacity-60"
              >
                Send
              </button>
            </div>
            <p className="text-[11px] text-gray-500 mt-2">Press Enter to send. Shift+Enter for new line.</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default LiveChatWidget;
