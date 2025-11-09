-- Create interviews table
CREATE TABLE IF NOT EXISTS public.interviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  candidate_id UUID NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  scheduled_by UUID NOT NULL,
  interview_type VARCHAR(50) NOT NULL,
  scheduled_date TIMESTAMP WITH TIME ZONE NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  location VARCHAR(255),
  notes TEXT,
  status VARCHAR(20) DEFAULT 'scheduled',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.interviews ENABLE ROW LEVEL SECURITY;

-- Users can view interviews for their company candidates
CREATE POLICY "Users can view own company interviews"
ON public.interviews
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM candidates
    JOIN profiles ON profiles.id = auth.uid()
    WHERE candidates.id = interviews.candidate_id
    AND candidates.company = profiles.company
  )
);

-- Recruiters can create interviews
CREATE POLICY "Recruiters can create interviews"
ON public.interviews
FOR INSERT
WITH CHECK (
  (has_role(auth.uid(), 'recruiter'::app_role) OR 
   has_role(auth.uid(), 'admin'::app_role) OR 
   has_role(auth.uid(), 'hiring_manager'::app_role))
  AND
  EXISTS (
    SELECT 1 FROM candidates
    JOIN profiles ON profiles.id = auth.uid()
    WHERE candidates.id = interviews.candidate_id
    AND candidates.company = profiles.company
  )
);

-- Recruiters can update interviews
CREATE POLICY "Recruiters can update interviews"
ON public.interviews
FOR UPDATE
USING (
  scheduled_by = auth.uid() OR 
  has_role(auth.uid(), 'admin'::app_role)
);

-- Recruiters can delete interviews
CREATE POLICY "Recruiters can delete interviews"
ON public.interviews
FOR DELETE
USING (
  scheduled_by = auth.uid() OR 
  has_role(auth.uid(), 'admin'::app_role)
);

-- Create index for faster lookups
CREATE INDEX idx_interviews_candidate_id ON public.interviews(candidate_id);
CREATE INDEX idx_interviews_scheduled_date ON public.interviews(scheduled_date);