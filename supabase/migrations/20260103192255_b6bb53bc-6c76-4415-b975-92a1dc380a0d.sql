-- Create app_role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

-- Create user_roles table
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create function to get user role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id
  LIMIT 1
$$;

-- RLS Policies for user_roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update roles"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Create workflow_versions table for versioning
CREATE TABLE public.workflow_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID REFERENCES public.workflows(id) ON DELETE CASCADE NOT NULL,
    version_number INTEGER NOT NULL DEFAULT 1,
    name TEXT NOT NULL,
    trigger_type TEXT NOT NULL,
    trigger_config JSONB DEFAULT '{}'::jsonb,
    ai_action_type TEXT NOT NULL,
    ai_config JSONB DEFAULT '{}'::jsonb,
    output_action_type TEXT NOT NULL,
    output_config JSONB DEFAULT '{}'::jsonb,
    conditions JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Enable RLS
ALTER TABLE public.workflow_versions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for workflow_versions
CREATE POLICY "Users can view their workflow versions"
ON public.workflow_versions
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.workflows w
        WHERE w.id = workflow_id AND w.user_id = auth.uid()
    )
);

CREATE POLICY "Users can create versions for their workflows"
ON public.workflow_versions
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.workflows w
        WHERE w.id = workflow_id AND w.user_id = auth.uid()
    )
);

CREATE POLICY "Users can delete their workflow versions"
ON public.workflow_versions
FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.workflows w
        WHERE w.id = workflow_id AND w.user_id = auth.uid()
    )
);

-- Create trigger to auto-save version on workflow update
CREATE OR REPLACE FUNCTION public.save_workflow_version()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    next_version INTEGER;
BEGIN
    -- Get next version number
    SELECT COALESCE(MAX(version_number), 0) + 1 INTO next_version
    FROM public.workflow_versions
    WHERE workflow_id = OLD.id;
    
    -- Save current state as a version
    INSERT INTO public.workflow_versions (
        workflow_id, version_number, name, trigger_type, trigger_config,
        ai_action_type, ai_config, output_action_type, output_config,
        conditions, created_by
    ) VALUES (
        OLD.id, next_version, OLD.name, OLD.trigger_type, OLD.trigger_config,
        OLD.ai_action_type, OLD.ai_config, OLD.output_action_type, OLD.output_config,
        OLD.conditions, OLD.user_id
    );
    
    RETURN NEW;
END;
$$;

CREATE TRIGGER save_workflow_version_trigger
BEFORE UPDATE ON public.workflows
FOR EACH ROW
EXECUTE FUNCTION public.save_workflow_version();