
-- Remove tables from realtime to prevent unauthorized channel subscriptions
ALTER PUBLICATION supabase_realtime DROP TABLE public.chat_messages;
ALTER PUBLICATION supabase_realtime DROP TABLE public.notifications;
