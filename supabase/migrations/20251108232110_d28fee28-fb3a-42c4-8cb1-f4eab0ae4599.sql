-- Create survey responses table
CREATE TABLE IF NOT EXISTS public.candidate_surveys (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  candidate_id UUID NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  survey_token UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  
  -- Survey completion status
  completed BOOLEAN DEFAULT FALSE,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  
  -- OCEAN Personality Scores (0-100)
  ocean_openness INTEGER,
  ocean_conscientiousness INTEGER,
  ocean_extraversion INTEGER,
  ocean_agreeableness INTEGER,
  ocean_emotional_stability INTEGER,
  
  -- Situational Judgment Test Score
  sjt_score INTEGER,
  
  -- Emotional Intelligence Score
  eq_score INTEGER,
  eq_self_awareness INTEGER,
  eq_self_regulation INTEGER,
  eq_empathy INTEGER,
  eq_relationship_management INTEGER,
  eq_motivation INTEGER,
  
  -- Competency Scores
  competency_leadership INTEGER,
  competency_problem_solving INTEGER,
  competency_adaptability INTEGER,
  competency_teamwork INTEGER,
  
  -- Values Alignment
  values_alignment_score INTEGER,
  values_innovation INTEGER,
  values_integrity INTEGER,
  values_collaboration INTEGER,
  values_excellence INTEGER,
  values_customer_focus INTEGER,
  
  -- Raw responses (JSONB for flexibility)
  ocean_responses JSONB,
  sjt_responses JSONB,
  eq_responses JSONB,
  competency_responses JSONB,
  values_responses JSONB,
  technical_skills JSONB,
  role_fit_responses JSONB,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.candidate_surveys ENABLE ROW LEVEL SECURITY;

-- Policy: Recruiters can view surveys for their candidates
CREATE POLICY "Recruiters can view surveys for their candidates"
ON public.candidate_surveys
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.candidates
    WHERE candidates.id = candidate_surveys.candidate_id
    AND candidates.source_user_id = auth.uid()
  )
);

-- Policy: Survey can be accessed via token (public access for filling survey)
CREATE POLICY "Survey can be accessed via token"
ON public.candidate_surveys
FOR SELECT
USING (true);

-- Policy: Survey can be inserted via token
CREATE POLICY "Survey can be inserted via token"
ON public.candidate_surveys
FOR INSERT
WITH CHECK (true);

-- Policy: Survey can be updated via token
CREATE POLICY "Survey can be updated via token"
ON public.candidate_surveys
FOR UPDATE
USING (true);

-- Create index for faster lookups
CREATE INDEX idx_candidate_surveys_candidate_id ON public.candidate_surveys(candidate_id);
CREATE INDEX idx_candidate_surveys_token ON public.candidate_surveys(survey_token);

-- Create trigger for updated_at
CREATE TRIGGER update_candidate_surveys_updated_at
BEFORE UPDATE ON public.candidate_surveys
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();