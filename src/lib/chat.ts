import { supabase } from './supabase';
import type { ChatPlatformId } from '../components/chat/chatConfig';

export type ChatStatus = 'open' | 'pending' | 'closed';
export type ChatRole = 'user' | 'admin';

export type ChatChannel = {
  id: string;
  user_id: string;
  platform: ChatPlatformId;
  status: ChatStatus;
  last_message: string | null;
  last_sender_role: ChatRole | null;
  last_message_at: string | null;
  created_at: string;
  updated_at?: string | null;
};

export type ChatMessage = {
  id: string;
  channel_id: string;
  sender_id: string | null;
  sender_role: ChatRole;
  body: string;
  created_at: string;
};

export type ChatChannelWithProfile = ChatChannel & {
  user_profiles?: {
    username: string;
    email: string;
  } | null;
};

export const chatAPI = {
  async getUserChannels() {
    const { data, error } = await supabase
      .from('chat_channels')
      .select('*')
      .order('updated_at', { ascending: false })
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []) as ChatChannel[];
  },

  async getAdminChannels() {
    const { data, error } = await supabase
      .from('chat_channels')
      .select(
        'id, user_id, platform, status, last_message, last_sender_role, last_message_at, created_at, updated_at, user_profiles (username, email)'
      )
      .order('updated_at', { ascending: false })
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []) as ChatChannelWithProfile[];
  },

  async upsertChannel(userId: string, platform: ChatPlatformId) {
    const { data, error } = await supabase
      .from('chat_channels')
      .upsert(
        {
          user_id: userId,
          platform,
          status: 'open',
        },
        { onConflict: 'user_id,platform' }
      )
      .select('*')
      .single();
    if (error) throw error;
    return data as ChatChannel;
  },

  async getChannelMessages(channelId: string) {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('channel_id', channelId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return (data || []) as ChatMessage[];
  },

  async sendMessage(payload: {
    channelId: string;
    senderId: string | null;
    senderRole: ChatRole;
    body: string;
  }) {
    const { data, error } = await supabase
      .from('chat_messages')
      .insert({
        channel_id: payload.channelId,
        sender_id: payload.senderId,
        sender_role: payload.senderRole,
        body: payload.body,
      })
      .select('*')
      .single();
    if (error) throw error;
    return data as ChatMessage;
  },
};
