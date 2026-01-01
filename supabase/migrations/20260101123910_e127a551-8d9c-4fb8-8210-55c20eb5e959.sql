-- Create workflow execution history table
CREATE TABLE public.workflow_executions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workflow_id UUID NOT NULL REFERENCES public.workflows(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'running',
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  results JSONB DEFAULT '[]'::jsonb,
  error TEXT,
  context JSONB DEFAULT '{}'::jsonb
);

-- Enable Row Level Security
ALTER TABLE public.workflow_executions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own execution history" 
ON public.workflow_executions 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own executions" 
ON public.workflow_executions 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own executions" 
ON public.workflow_executions 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own executions" 
ON public.workflow_executions 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX idx_workflow_executions_workflow_id ON public.workflow_executions(workflow_id);
CREATE INDEX idx_workflow_executions_user_id ON public.workflow_executions(user_id);
CREATE INDEX idx_workflow_executions_started_at ON public.workflow_executions(started_at DESC);

-- Add conditions column to workflows table for conditional logic
ALTER TABLE public.workflows ADD COLUMN IF NOT EXISTS conditions JSONB DEFAULT '[]'::jsonb;