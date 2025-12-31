-- Create workflows table
CREATE TABLE public.workflows (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL DEFAULT 'Untitled Workflow',
  trigger_type TEXT NOT NULL,
  trigger_config JSONB DEFAULT '{}',
  ai_action_type TEXT NOT NULL,
  ai_config JSONB DEFAULT '{}',
  output_action_type TEXT NOT NULL,
  output_config JSONB DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.workflows ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own workflows"
ON public.workflows FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own workflows"
ON public.workflows FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own workflows"
ON public.workflows FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own workflows"
ON public.workflows FOR DELETE
USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_workflows_updated_at
BEFORE UPDATE ON public.workflows
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();