-- Create table for workflow shares
CREATE TABLE public.workflow_shares (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID NOT NULL REFERENCES public.workflows(id) ON DELETE CASCADE,
    share_token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    expires_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN NOT NULL DEFAULT true,
    view_count INTEGER NOT NULL DEFAULT 0
);

-- Enable RLS
ALTER TABLE public.workflow_shares ENABLE ROW LEVEL SECURITY;

-- Users can create shares for their own workflows
CREATE POLICY "Users can create shares for their workflows"
ON public.workflow_shares
FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.workflows w
        WHERE w.id = workflow_id AND w.user_id = auth.uid()
    )
);

-- Users can view their own shares
CREATE POLICY "Users can view their own shares"
ON public.workflow_shares
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.workflows w
        WHERE w.id = workflow_id AND w.user_id = auth.uid()
    )
);

-- Users can update their own shares
CREATE POLICY "Users can update their own shares"
ON public.workflow_shares
FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM public.workflows w
        WHERE w.id = workflow_id AND w.user_id = auth.uid()
    )
);

-- Users can delete their own shares
CREATE POLICY "Users can delete their own shares"
ON public.workflow_shares
FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM public.workflows w
        WHERE w.id = workflow_id AND w.user_id = auth.uid()
    )
);

-- Create index for faster token lookups
CREATE INDEX idx_workflow_shares_token ON public.workflow_shares(share_token);
CREATE INDEX idx_workflow_shares_workflow_id ON public.workflow_shares(workflow_id);