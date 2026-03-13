import React, { useEffect, useState } from 'react';
import { getSessionUser } from '../lib/supabase';
import useChat from '../hooks/useChat';
import useChatSocket from '../hooks/useChatSocket';
import { chatPlatforms, getChatPlatform } from './chat/chatConfig';

const formatTime = (value: string) =>
  new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

const LiveChatWidget: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  // load session when widget opens
  useEffect(() => {
    if (!open) return;
    getSessionUser().then((u) => setUserId(u?.id ?? null));
  }, [open]);

  const {
    activePlatform,
    setActivePlatform,
    messages,
    draft,
    setDraft,
    activeChannel,
    isClosed,
    loadingChannels,
    loadingMessages,
    sending,
    error,
    sendMessage,
  } = useChat(userId);
  const { isConnected, connectionError } = useChatSocket(activeChannel?.id ?? null);

  const toggleOpen = () => setOpen((prev) => !prev);

  const platformMeta = getChatPlatform(activePlatform);
  const handleSend = () => sendMessage(draft);

  return (
    <div className={`fixed bottom-4 right-4 w-80 shadow-lg ${open ? 'h-96' : 'h-12'} transition-all`}>
      <div className="bg-brand-dark text-white p-2 flex justify-between items-center cursor-pointer" onClick={toggleOpen}>
        <span>{open ? 'Live Chat' : 'Chat'}</span>
        <span>{open ? '−' : '+'}</span>
      </div>
      {open && (
        <div className="bg-brand-dark text-white h-full flex flex-col rounded-b-lg overflow-hidden">
          <div className="px-3 py-3 border-b border-brand-border overflow-x-auto ds-scrollbar bg-black/20">
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
            <div className="mt-2 text-[11px] text-gray-400">
              {connectionError
                ? `Connection: ${connectionError}`
                : isConnected
                  ? 'Connection: live'
                  : 'Connection: idle'}
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
          </div>

          <div className="p-3 border-t border-brand-border bg-black/20">
            {error && <p className="text-xs text-red-400 mb-2">{error}</p>}
            <div className="flex items-center gap-2">
              <input
                id="live-chat-message"
                name="liveChatMessage"
                aria-label="Chat message"
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
