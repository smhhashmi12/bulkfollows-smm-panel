-- Live chat channels
CREATE TABLE IF NOT EXISTS public.chat_channels (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'pending', 'closed')),
  last_message TEXT,
  last_sender_role TEXT CHECK (last_sender_role IN ('user', 'admin')),
  last_message_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, platform)
);

-- Live chat messages
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  channel_id UUID NOT NULL REFERENCES public.chat_channels(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  sender_role TEXT NOT NULL CHECK (sender_role IN ('user', 'admin')),
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_channels_user_id ON public.chat_channels(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_channels_platform ON public.chat_channels(platform);
CREATE INDEX IF NOT EXISTS idx_chat_messages_channel_id ON public.chat_messages(channel_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON public.chat_messages(created_at DESC);

ALTER TABLE public.chat_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Chat channel policies
CREATE POLICY "Users can view their own chat channels"
  ON public.chat_channels FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own chat channels"
  ON public.chat_channels FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own chat channels"
  ON public.chat_channels FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all chat channels"
  ON public.chat_channels FOR SELECT
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update all chat channels"
  ON public.chat_channels FOR UPDATE
  USING (public.is_admin(auth.uid()));

-- Chat message policies
CREATE POLICY "Users can view messages in their channels"
  ON public.chat_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.chat_channels c
      WHERE c.id = chat_messages.channel_id
        AND c.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can send messages in their channels"
  ON public.chat_messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.chat_channels c
      WHERE c.id = chat_messages.channel_id
        AND c.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all chat messages"
  ON public.chat_messages FOR SELECT
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can send chat messages"
  ON public.chat_messages FOR INSERT
  WITH CHECK (public.is_admin(auth.uid()));

-- Update chat channel timestamps on message insert
CREATE OR REPLACE FUNCTION public.update_chat_channel_on_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.chat_channels
  SET last_message = NEW.body,
      last_sender_role = NEW.sender_role,
      last_message_at = NEW.created_at,
      updated_at = NOW()
  WHERE id = NEW.channel_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS update_chat_channel_on_message ON public.chat_messages;
CREATE TRIGGER update_chat_channel_on_message
  AFTER INSERT ON public.chat_messages
  FOR EACH ROW EXECUTE FUNCTION public.update_chat_channel_on_message();

-- Keep updated_at current on channels
DROP TRIGGER IF EXISTS update_chat_channels_updated_at ON public.chat_channels;
CREATE TRIGGER update_chat_channels_updated_at BEFORE UPDATE ON public.chat_channels
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_channels;
