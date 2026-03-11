import { useEffect, useRef, useCallback, useState } from 'react';

/**
 * useChatSocket Hook
 * Manages real-time socket connections for chat
 * Automatically connects/disconnects based on dependencies
 */
export const useChatSocket = (channelId: string | null | undefined) => {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const socketRef = useRef<WebSocket | null>(null);

  const connect = useCallback(() => {
    if (!channelId || socketRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      setConnectionError(null);
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const url = `${protocol}//${window.location.host}/api/chat/ws?channel=${channelId}`;
      
      const socket = new WebSocket(url);

      socket.addEventListener('open', () => {
        console.log('[Socket] Connected');
        setIsConnected(true);
      });

      socket.addEventListener('error', (event) => {
        console.error('[Socket] Error:', event);
        setConnectionError('Failed to connect to chat server');
        setIsConnected(false);
      });

      socket.addEventListener('close', () => {
        console.log('[Socket] Disconnected');
        setIsConnected(false);
      });

      socketRef.current = socket;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Socket connection failed';
      setConnectionError(message);
      setIsConnected(false);
    }
  }, [channelId]);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
      setIsConnected(false);
    }
  }, []);

  const send = useCallback((data: string | Record<string, any>) => {
    if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) {
      console.warn('[Socket] Not connected, cannot send message');
      return false;
    }

    try {
      const message = typeof data === 'string' ? data : JSON.stringify(data);
      socketRef.current.send(message);
      return true;
    } catch (err) {
      console.error('[Socket] Failed to send message:', err);
      return false;
    }
  }, []);

  // Auto-connect when channel changes
  useEffect(() => {
    connect();
    return () => {
      disconnect();
    };
  }, [channelId, connect, disconnect]);

  return {
    isConnected,
    connectionError,
    socket: socketRef.current,
    send,
    connect,
    disconnect,
  };
};

export default useChatSocket;
