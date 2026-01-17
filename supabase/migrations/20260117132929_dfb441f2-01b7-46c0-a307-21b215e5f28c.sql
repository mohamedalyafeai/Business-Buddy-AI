-- Create table for storing custom templates (synced across devices)
CREATE TABLE public.custom_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'automation',
  nodes JSONB NOT NULL DEFAULT '[]'::jsonb,
  conditions JSONB NOT NULL DEFAULT '[]'::jsonb,
  external_service TEXT, -- 'zapier', 'make', or null
  webhook_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.custom_templates ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own custom templates" 
ON public.custom_templates 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own custom templates" 
ON public.custom_templates 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own custom templates" 
ON public.custom_templates 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own custom templates" 
ON public.custom_templates 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_custom_templates_updated_at
BEFORE UPDATE ON public.custom_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster lookups
CREATE INDEX idx_custom_templates_user_id ON public.custom_templates(user_id);
CREATE INDEX idx_custom_templates_category ON public.custom_templates(category);