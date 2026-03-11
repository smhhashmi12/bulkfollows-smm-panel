import { useCallback, useEffect, useRef, useState } from 'react';
import { chatAPI, ChatChannel, ChatMessage, ChatPlatformId } from '../lib/chat';
import { chatPlatforms } from '../components/chat/chatConfig';

/**
 * useChat Hook
 * Manages chat state and operations
 * Reduces LiveChatWidget to a simpler presentational component
 */
export const useChat = (userId: string | null) => {
  const [activePlatform, setActivePlatform] = useState<ChatPlatformId>('live');
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

  const activeChannel = channels[activePlatform];
  const isClosed = activeChannel?.status === 'closed';

  // Load channels for all platforms
  const loadChannels = useCallback(async () => {
    if (!userId) return;
    setLoadingChannels(true);
    setError(null);
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
      setError(err instanceof Error ? err.message : 'Failed to load channels');
      console.error('[Chat] Failed to load channels:', err);
    } finally {
      setLoadingChannels(false);
    }
  }, [userId]);

  // Load messages for active channel
  const loadMessages = useCallback(async () => {
    if (!activeChannel?.id) return;
    setLoadingMessages(true);
    setError(null);
    try {
      const data = await chatAPI.getChannelMessages(activeChannel.id);
      setMessages(data.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load messages');
      console.error('[Chat] Failed to load messages:', err);
    } finally {
      setLoadingMessages(false);
    }
  }, [activeChannel?.id]);

  // Send message
  const sendMessage = useCallback(async (text: string) => {
    if (!activeChannel?.id || !text.trim()) return;
    setSending(true);
    setError(null);
    try {
      await chatAPI.sendMessage(activeChannel.id, text);
      setDraft('');
      await loadMessages();  // Refresh messages
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message');
      console.error('[Chat] Failed to send message:', err);
    } finally {
      setSending(false);
    }
  }, [activeChannel?.id, loadMessages]);

  // Load channels on mount
  useEffect(() => {
    loadChannels();
  }, [loadChannels]);

  // Load messages when active platform changes
  useEffect(() => {
    loadMessages();
  }, [activePlatform, loadMessages]);

  return {
    // State
    activePlatform,
    channels,
    messages,
    draft,
    activeChannel,
    isClosed,
    
    // Loading states
    loadingChannels,
    loadingMessages,
    sending,
    error,
    
    // Actions
    setActivePlatform,
    setDraft,
    loadChannels,
    loadMessages,
    sendMessage,
    setError,
  };
};

export default useChat;
