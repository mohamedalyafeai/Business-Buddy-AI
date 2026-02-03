-- Fix the overly permissive notifications INSERT policy
DROP POLICY IF EXISTS "System can create notifications" ON public.notifications;

-- Create a more secure policy - users can create notifications for themselves
CREATE POLICY "Users can create their own notifications" 
ON public.notifications FOR INSERT 
WITH CHECK (auth.uid() = user_id);