-- Harden chat_conversations: public -> authenticated
DROP POLICY IF EXISTS "Users can create their own conversations" ON public.chat_conversations;
DROP POLICY IF EXISTS "Users can delete their own conversations" ON public.chat_conversations;
DROP POLICY IF EXISTS "Users can update their own conversations" ON public.chat_conversations;
DROP POLICY IF EXISTS "Users can view their own conversations" ON public.chat_conversations;

CREATE POLICY "Users can view their own conversations" ON public.chat_conversations FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own conversations" ON public.chat_conversations FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own conversations" ON public.chat_conversations FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own conversations" ON public.chat_conversations FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Harden chat_messages: public -> authenticated
DROP POLICY IF EXISTS "Users can create their own messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can view their own messages" ON public.chat_messages;

CREATE POLICY "Users can view their own messages" ON public.chat_messages FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own messages" ON public.chat_messages FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Harden custom_templates: public -> authenticated
DROP POLICY IF EXISTS "Users can create their own custom templates" ON public.custom_templates;
DROP POLICY IF EXISTS "Users can delete their own custom templates" ON public.custom_templates;
DROP POLICY IF EXISTS "Users can update their own custom templates" ON public.custom_templates;
DROP POLICY IF EXISTS "Users can view their own custom templates" ON public.custom_templates;

CREATE POLICY "Users can view their own custom templates" ON public.custom_templates FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own custom templates" ON public.custom_templates FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own custom templates" ON public.custom_templates FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own custom templates" ON public.custom_templates FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Harden notifications: public -> authenticated
DROP POLICY IF EXISTS "Users can create their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can delete their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;

CREATE POLICY "Users can view their own notifications" ON public.notifications FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own notifications" ON public.notifications FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own notifications" ON public.notifications FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own notifications" ON public.notifications FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Harden profiles: public -> authenticated
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Harden workflow_comments: public -> authenticated
DROP POLICY IF EXISTS "Users can create comments on their workflows" ON public.workflow_comments;
DROP POLICY IF EXISTS "Users can delete their own comments" ON public.workflow_comments;
DROP POLICY IF EXISTS "Users can update their own comments" ON public.workflow_comments;
DROP POLICY IF EXISTS "Users can view comments on their workflows" ON public.workflow_comments;

CREATE POLICY "Users can view comments on their workflows" ON public.workflow_comments FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM workflows w WHERE w.id = workflow_comments.workflow_id AND w.user_id = auth.uid()));
CREATE POLICY "Users can create comments on their workflows" ON public.workflow_comments FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM workflows w WHERE w.id = workflow_comments.workflow_id AND w.user_id = auth.uid()));
CREATE POLICY "Users can update their own comments" ON public.workflow_comments FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own comments" ON public.workflow_comments FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Harden workflow_executions: public -> authenticated
DROP POLICY IF EXISTS "Users can create their own executions" ON public.workflow_executions;
DROP POLICY IF EXISTS "Users can delete their own executions" ON public.workflow_executions;
DROP POLICY IF EXISTS "Users can update their own executions" ON public.workflow_executions;
DROP POLICY IF EXISTS "Users can view their own execution history" ON public.workflow_executions;

CREATE POLICY "Users can view their own execution history" ON public.workflow_executions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own executions" ON public.workflow_executions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own executions" ON public.workflow_executions FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own executions" ON public.workflow_executions FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Harden workflow_shares: public -> authenticated
DROP POLICY IF EXISTS "Users can create shares for their workflows" ON public.workflow_shares;
DROP POLICY IF EXISTS "Users can delete their own shares" ON public.workflow_shares;
DROP POLICY IF EXISTS "Users can update their own shares" ON public.workflow_shares;
DROP POLICY IF EXISTS "Users can view their own shares" ON public.workflow_shares;

CREATE POLICY "Users can view their own shares" ON public.workflow_shares FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM workflows w WHERE w.id = workflow_shares.workflow_id AND w.user_id = auth.uid()));
CREATE POLICY "Users can create shares for their workflows" ON public.workflow_shares FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM workflows w WHERE w.id = workflow_shares.workflow_id AND w.user_id = auth.uid()));
CREATE POLICY "Users can update their own shares" ON public.workflow_shares FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM workflows w WHERE w.id = workflow_shares.workflow_id AND w.user_id = auth.uid()));
CREATE POLICY "Users can delete their own shares" ON public.workflow_shares FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM workflows w WHERE w.id = workflow_shares.workflow_id AND w.user_id = auth.uid()));

-- Harden workflows: public -> authenticated
DROP POLICY IF EXISTS "Users can create their own workflows" ON public.workflows;
DROP POLICY IF EXISTS "Users can delete their own workflows" ON public.workflows;
DROP POLICY IF EXISTS "Users can update their own workflows" ON public.workflows;
DROP POLICY IF EXISTS "Users can view their own workflows" ON public.workflows;

CREATE POLICY "Users can view their own workflows" ON public.workflows FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own workflows" ON public.workflows FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own workflows" ON public.workflows FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own workflows" ON public.workflows FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Harden audit_logs: public -> authenticated for insert/select
DROP POLICY IF EXISTS "Admins can create audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Admins can view all audit logs" ON public.audit_logs;

CREATE POLICY "Admins can view all audit logs" ON public.audit_logs FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can create audit logs" ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));