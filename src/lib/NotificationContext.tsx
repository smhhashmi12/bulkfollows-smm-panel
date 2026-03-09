import React, { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { authAPI } from './api';
import { getSessionUser, supabase } from './supabase';

type NotificationType = 'info' | 'success' | 'warning' | 'error';
type NotificationSource = 'system' | 'announcement' | 'chat';

type AnnouncementRow = {
    id: string;
    subject: string;
    message: string;
    type?: NotificationType;
    status?: string;
    created_at?: string | null;
    updated_at?: string | null;
};

type ChatChannelRow = {
    id: string;
    user_id: string;
    platform: string;
    last_message: string | null;
    last_sender_role: 'user' | 'admin' | null;
    last_message_at: string | null;
};

export interface Notification {
    id: string;
    title: string;
    message: string;
    type: NotificationType;
    timestamp: Date;
    read: boolean;
    source?: NotificationSource;
    sourceKey?: string;
}

interface NotificationContextType {
    notifications: Notification[];
    unreadCount: number;
    addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
    markAsRead: (id: string) => void;
    markAllAsRead: () => void;
    deleteNotification: (id: string) => void;
    clearAll: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

const buildSystemNotification = (): Notification => ({
    id: 'welcome',
    title: 'Welcome',
    message: 'Welcome to BulkFollows SMM Panel',
    type: 'info',
    timestamp: new Date(),
    read: false,
    source: 'system',
    sourceKey: 'system:welcome',
});

const formatPlatformLabel = (platform: string) =>
    platform
        .split('-')
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ') || 'Live';

const mapAnnouncementType = (value?: string): NotificationType => {
    if (value === 'warning') return 'warning';
    if (value === 'success') return 'success';
    return 'info';
};

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [notifications, setNotifications] = useState<Notification[]>([buildSystemNotification()]);
    const seenSourceKeysRef = useRef<Set<string>>(new Set(['system:welcome']));

    const unreadCount = useMemo(() => notifications.filter((notification) => !notification.read).length, [notifications]);

    const pushNotification = (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
        const sourceKey = notification.sourceKey || `notification:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`;

        if (seenSourceKeysRef.current.has(sourceKey)) {
            return;
        }

        seenSourceKeysRef.current.add(sourceKey);

        const newNotification: Notification = {
            ...notification,
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            timestamp: new Date(),
            read: false,
            sourceKey,
        };

        setNotifications((prev) => [newNotification, ...prev].slice(0, 50));
    };

    const addNotification = (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
        pushNotification(notification);
    };

    const markAsRead = (id: string) => {
        setNotifications((prev) =>
            prev.map((notification) => (notification.id === id ? { ...notification, read: true } : notification))
        );
    };

    const markAllAsRead = () => {
        setNotifications((prev) => prev.map((notification) => ({ ...notification, read: true })));
    };

    const deleteNotification = (id: string) => {
        setNotifications((prev) => {
            const target = prev.find((notification) => notification.id === id);
            if (target?.sourceKey) {
                seenSourceKeysRef.current.delete(target.sourceKey);
            }
            return prev.filter((notification) => notification.id !== id);
        });
    };

    const clearAll = () => {
        seenSourceKeysRef.current = new Set(['system:welcome']);
        setNotifications([buildSystemNotification()]);
    };

    useEffect(() => {
        let cancelled = false;
        let activeChannels: Array<{ unsubscribe?: () => void }> = [];

        const cleanupChannels = () => {
            activeChannels.forEach((channel) => {
                if (typeof channel.unsubscribe === 'function') {
                    channel.unsubscribe();
                }
            });
            activeChannels = [];
        };

        const attachRealtimeSubscriptions = async () => {
            cleanupChannels();

            const sessionUser = await getSessionUser().catch(() => null);
            if (!sessionUser || cancelled) {
                return;
            }

            const currentUser = await authAPI.getCurrentUser().catch(() => null);
            const role = currentUser?.role || (sessionUser.app_metadata?.role === 'admin' ? 'admin' : 'user');
            const userId = sessionUser.id;

            const announcementsChannel = supabase
                .channel(`notifications:announcements:${role}:${userId}`)
                .on(
                    'postgres_changes',
                    {
                        event: 'INSERT',
                        schema: 'public',
                        table: 'announcements',
                        filter: 'status=eq.published',
                    },
                    (payload) => {
                        const announcement = payload.new as AnnouncementRow;
                        pushNotification({
                            title: 'New Announcement',
                            message: announcement.subject || 'A new announcement was published.',
                            type: mapAnnouncementType(announcement.type),
                            source: 'announcement',
                            sourceKey: `announcement:${announcement.id}:${announcement.updated_at || announcement.created_at || ''}`,
                        });
                    }
                )
                .on(
                    'postgres_changes',
                    {
                        event: 'UPDATE',
                        schema: 'public',
                        table: 'announcements',
                        filter: 'status=eq.published',
                    },
                    (payload) => {
                        const announcement = payload.new as AnnouncementRow;
                        const previous = payload.old as AnnouncementRow;
                        const becamePublished = previous?.status !== 'published' && announcement.status === 'published';
                        const changedWhilePublished =
                            previous?.status === 'published' &&
                            (previous?.subject !== announcement.subject || previous?.message !== announcement.message);

                        if (!becamePublished && !changedWhilePublished) {
                            return;
                        }

                        pushNotification({
                            title: becamePublished ? 'Announcement Published' : 'Announcement Updated',
                            message: announcement.subject || 'An announcement was updated.',
                            type: mapAnnouncementType(announcement.type),
                            source: 'announcement',
                            sourceKey: `announcement:${announcement.id}:${announcement.updated_at || announcement.created_at || ''}`,
                        });
                    }
                )
                .subscribe();

            activeChannels.push(announcementsChannel);

            const chatChannel = supabase
                .channel(`notifications:chat:${role}:${userId}`)
                .on(
                    'postgres_changes',
                    {
                        event: 'UPDATE',
                        schema: 'public',
                        table: 'chat_channels',
                        ...(role === 'user' ? { filter: `user_id=eq.${userId}` } : {}),
                    },
                    (payload) => {
                        const channel = payload.new as ChatChannelRow;
                        const previous = payload.old as ChatChannelRow;

                        if (!channel?.last_message_at || !channel?.last_message) {
                            return;
                        }

                        if (
                            previous?.last_message_at === channel.last_message_at &&
                            previous?.last_message === channel.last_message
                        ) {
                            return;
                        }

                        if (role === 'user') {
                            if (channel.last_sender_role !== 'admin') return;

                            pushNotification({
                                title: 'New Chat Reply',
                                message: channel.last_message,
                                type: 'info',
                                source: 'chat',
                                sourceKey: `chat:user:${channel.id}:${channel.last_message_at}`,
                            });
                            return;
                        }

                        if (channel.last_sender_role !== 'user') return;

                        pushNotification({
                            title: 'New Support Message',
                            message: `${formatPlatformLabel(channel.platform)} chat: ${channel.last_message}`,
                            type: 'info',
                            source: 'chat',
                            sourceKey: `chat:admin:${channel.id}:${channel.last_message_at}`,
                        });
                    }
                )
                .subscribe();

            activeChannels.push(chatChannel);
        };

        void attachRealtimeSubscriptions();

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange(() => {
            void attachRealtimeSubscriptions();
        });

        return () => {
            cancelled = true;
            cleanupChannels();
            subscription.unsubscribe();
        };
    }, []);

    return (
        <NotificationContext.Provider
            value={{ notifications, unreadCount, addNotification, markAsRead, markAllAsRead, deleteNotification, clearAll }}
        >
            {children}
        </NotificationContext.Provider>
    );
};

export const useNotifications = (): NotificationContextType => {
    const context = useContext(NotificationContext);
    if (context === undefined) {
        throw new Error('useNotifications must be used within a NotificationProvider');
    }
    return context;
};
