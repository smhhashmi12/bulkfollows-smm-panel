import React, { useEffect, useState } from 'react';
import { getSessionUser } from '../lib/supabase';
import useChat from '../hooks/useChat';
import useChatSocket from '../hooks/useChatSocket';
import { chatPlatforms, getChatPlatform, ChatPlatformId } from './chat/chatConfig';
import { ChatMessage } from '../lib/chat';

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

  const chat = useChat(userId);
  const socket = useChatSocket(chat.activeChannel?.id ?? null);

  const toggleOpen = () => setOpen((prev) => !prev);

  const platformMeta = getChatPlatform(chat.activePlatform);

  return (
    <div className={`fixed bottom-4 right-4 w-80 shadow-lg ${open ? 'h-96' : 'h-12'} transition-all`}>
      <div className="bg-brand-dark text-white p-2 flex justify-between items-center cursor-pointer" onClick={toggleOpen}>
        <span>{open ? 'Live Chat' : 'Chat'}</span>
        <span>{open ? '−' : '+'}</span>
      </div>
      {open && (
        <div className="bg-white h-full flex flex-col">
          <div className="flex space-x-2 p-2">
            {chatPlatforms.map((p) => (
              <button
                key={p.id}
                onClick={() => chat.setActivePlatform(p.id)}
                className={`flex-1 py-1 rounded ${chat.activePlatform === p.id ? 'bg-brand-purple text-white' : 'bg-gray-100'}`}
              >
                {p.name}
              </button>
            ))}
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {chat.loadingMessages ? (
              <div>Loading messages...</div>
            ) : (
              chat.messages.map((m: ChatMessage) => (
                <div key={m.id} className="mb-2">
                  <div className="text-xs text-gray-500">{formatTime(m.created_at)}</div>
                  <div className="text-sm">{m.body}</div>
                </div>
              ))
            )}
          </div>
          <div className="p-2 border-t">
            <input
              className="w-full border rounded px-2 py-1"
              value={chat.draft}
              onChange={(e) => chat.setDraft(e.target.value)}
              disabled={chat.sending || !!chat.isClosed}
            />
            <button
              className="mt-1 w-full bg-brand-purple text-white py-1 rounded"
              onClick={() => chat.sendMessage(chat.draft)}
              disabled={chat.sending || !!chat.isClosed}
            >
              Send
            </button>
          </div>
          {chat.error && <div className="text-red-500 text-xs p-2">{chat.error}</div>}
        </div>
      )}
    </div>
  );
};

export default LiveChatWidget;
