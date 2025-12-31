-- Create the update_updated_at_column function if it doesn't exist
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create table for admin-managed team analysis
CREATE TABLE public.team_analysis (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  overall TEXT,
  strengths TEXT[] DEFAULT '{}',
  weaknesses TEXT[] DEFAULT '{}',
  trends TEXT,
  rivalry_insights TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  UNIQUE(team_id)
);

-- Enable RLS
ALTER TABLE public.team_analysis ENABLE ROW LEVEL SECURITY;

-- Everyone can view team analysis
CREATE POLICY "Anyone can view team analysis"
ON public.team_analysis
FOR SELECT
USING (true);

-- Only admins can insert
CREATE POLICY "Admins can insert team analysis"
ON public.team_analysis
FOR INSERT
WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
);

-- Only admins can update
CREATE POLICY "Admins can update team analysis"
ON public.team_analysis
FOR UPDATE
USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
);

-- Only admins can delete
CREATE POLICY "Admins can delete team analysis"
ON public.team_analysis
FOR DELETE
USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_team_analysis_updated_at
BEFORE UPDATE ON public.team_analysis
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();