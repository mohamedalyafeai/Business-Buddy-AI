-- Explicitly prevent updates to audit logs (immutable records)
CREATE POLICY "Audit logs cannot be updated"
ON public.audit_logs
FOR UPDATE
TO authenticated
USING (false);

-- Explicitly prevent deletions of audit logs (permanent records)
CREATE POLICY "Audit logs cannot be deleted"
ON public.audit_logs
FOR DELETE
TO authenticated
USING (false);