-- Drop old restrictive policies
DROP POLICY IF EXISTS "Users can view comments on their workflows" ON public.workflow_comments;
DROP POLICY IF EXISTS "Users can create comments on their workflows" ON public.workflow_comments;

-- New SELECT policy: owner OR accepted invitee can view comments
CREATE POLICY "Owners and accepted invitees can view comments"
ON public.workflow_comments
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.workflows w
    WHERE w.id = workflow_comments.workflow_id
      AND w.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.team_invitations ti
    WHERE ti.workflow_id = workflow_comments.workflow_id
      AND ti.status = 'accepted'
      AND ti.invitee_email = (SELECT email FROM auth.users WHERE id = auth.uid())::text
  )
);

-- New INSERT policy: owner OR accepted invitee can create comments
CREATE POLICY "Owners and accepted invitees can create comments"
ON public.workflow_comments
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND (
    EXISTS (
      SELECT 1 FROM public.workflows w
      WHERE w.id = workflow_comments.workflow_id
        AND w.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.team_invitations ti
      WHERE ti.workflow_id = workflow_comments.workflow_id
        AND ti.status = 'accepted'
        AND ti.invitee_email = (SELECT email FROM auth.users WHERE id = auth.uid())::text
    )
  )
);