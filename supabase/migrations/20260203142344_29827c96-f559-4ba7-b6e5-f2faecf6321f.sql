-- Create notifications table for smart alerts
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info',
  is_read BOOLEAN NOT NULL DEFAULT false,
  action_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Policies for notifications
CREATE POLICY "Users can view their own notifications" 
ON public.notifications FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications" 
ON public.notifications FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notifications" 
ON public.notifications FOR DELETE 
USING (auth.uid() = user_id);

CREATE POLICY "System can create notifications" 
ON public.notifications FOR INSERT 
WITH CHECK (true);

-- Create workflow_comments table for team collaboration
CREATE TABLE public.workflow_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workflow_id UUID NOT NULL REFERENCES public.workflows(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  parent_id UUID REFERENCES public.workflow_comments(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.workflow_comments ENABLE ROW LEVEL SECURITY;

-- Policies for workflow_comments
CREATE POLICY "Users can view comments on their workflows" 
ON public.workflow_comments FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM workflows w 
  WHERE w.id = workflow_comments.workflow_id 
  AND w.user_id = auth.uid()
));

CREATE POLICY "Users can create comments on their workflows" 
ON public.workflow_comments FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM workflows w 
  WHERE w.id = workflow_comments.workflow_id 
  AND w.user_id = auth.uid()
));

CREATE POLICY "Users can update their own comments" 
ON public.workflow_comments FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comments" 
ON public.workflow_comments FOR DELETE 
USING (auth.uid() = user_id);

-- Create team_invitations table
CREATE TABLE public.team_invitations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workflow_id UUID NOT NULL REFERENCES public.workflows(id) ON DELETE CASCADE,
  inviter_id UUID NOT NULL,
  invitee_email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'viewer',
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT now() + interval '7 days'
);

-- Enable RLS
ALTER TABLE public.team_invitations ENABLE ROW LEVEL SECURITY;

-- Policies for team_invitations
CREATE POLICY "Users can view invitations for their workflows" 
ON public.team_invitations FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM workflows w 
  WHERE w.id = team_invitations.workflow_id 
  AND w.user_id = auth.uid()
) OR invitee_email = (SELECT email FROM auth.users WHERE id = auth.uid()));

CREATE POLICY "Users can create invitations for their workflows" 
ON public.team_invitations FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM workflows w 
  WHERE w.id = team_invitations.workflow_id 
  AND w.user_id = auth.uid()
));

CREATE POLICY "Users can update invitations for their workflows" 
ON public.team_invitations FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM workflows w 
  WHERE w.id = team_invitations.workflow_id 
  AND w.user_id = auth.uid()
) OR invitee_email = (SELECT email FROM auth.users WHERE id = auth.uid()));

CREATE POLICY "Users can delete their own invitations" 
ON public.team_invitations FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM workflows w 
  WHERE w.id = team_invitations.workflow_id 
  AND w.user_id = auth.uid()
));

-- Add trigger for updating comments timestamp
CREATE TRIGGER update_workflow_comments_updated_at
BEFORE UPDATE ON public.workflow_comments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;