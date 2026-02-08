
-- 1. Fix Email Harvesting: Restrict team_invitations policies to authenticated users only
DROP POLICY IF EXISTS "Users can view invitations for their workflows" ON public.team_invitations;
DROP POLICY IF EXISTS "Users can update invitations for their workflows" ON public.team_invitations;
DROP POLICY IF EXISTS "Users can create invitations for their workflows" ON public.team_invitations;
DROP POLICY IF EXISTS "Users can delete their own invitations" ON public.team_invitations;

CREATE POLICY "Users can view invitations for their workflows"
ON public.team_invitations
FOR SELECT
TO authenticated
USING (
  (EXISTS (SELECT 1 FROM workflows w WHERE w.id = team_invitations.workflow_id AND w.user_id = auth.uid()))
  OR
  (invitee_email = (SELECT email FROM auth.users WHERE id = auth.uid())::text)
);

CREATE POLICY "Users can create invitations for their workflows"
ON public.team_invitations
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (SELECT 1 FROM workflows w WHERE w.id = team_invitations.workflow_id AND w.user_id = auth.uid())
);

CREATE POLICY "Users can update invitations for their workflows"
ON public.team_invitations
FOR UPDATE
TO authenticated
USING (
  (EXISTS (SELECT 1 FROM workflows w WHERE w.id = team_invitations.workflow_id AND w.user_id = auth.uid()))
  OR
  (invitee_email = (SELECT email FROM auth.users WHERE id = auth.uid())::text)
);

CREATE POLICY "Users can delete their own invitations"
ON public.team_invitations
FOR DELETE
TO authenticated
USING (
  EXISTS (SELECT 1 FROM workflows w WHERE w.id = team_invitations.workflow_id AND w.user_id = auth.uid())
);

-- 2. Add missing UPDATE policy for workflow_versions
CREATE POLICY "Users can update their workflow versions"
ON public.workflow_versions
FOR UPDATE
TO authenticated
USING (
  EXISTS (SELECT 1 FROM workflows w WHERE w.id = workflow_versions.workflow_id AND w.user_id = auth.uid())
);
