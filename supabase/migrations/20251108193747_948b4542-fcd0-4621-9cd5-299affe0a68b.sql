-- Create job_openings table
CREATE TABLE IF NOT EXISTS public.job_openings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_by UUID NOT NULL,
  title VARCHAR NOT NULL,
  description TEXT,
  department VARCHAR,
  location VARCHAR,
  job_type VARCHAR,
  status VARCHAR DEFAULT 'open',
  urgency VARCHAR DEFAULT 'normal',
  salary_min INTEGER,
  salary_max INTEGER,
  required_skills JSON,
  nice_to_have_skills JSON,
  target_close_date DATE,
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create candidates table
CREATE TABLE IF NOT EXISTS public.candidates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  source_user_id UUID,
  email VARCHAR NOT NULL,
  full_name VARCHAR,
  current_position VARCHAR,
  current_company VARCHAR,
  location VARCHAR,
  availability VARCHAR,
  cv_url VARCHAR,
  cv_file_name VARCHAR,
  phone VARCHAR,
  linkedin_url VARCHAR,
  github_url VARCHAR,
  years_experience INTEGER,
  cv_upload_date TIMESTAMP WITHOUT TIME ZONE,
  extracted_skills JSON,
  notes TEXT,
  status VARCHAR DEFAULT 'new',
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create applications table
CREATE TABLE IF NOT EXISTS public.applications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  candidate_id UUID NOT NULL,
  job_opening_id UUID NOT NULL,
  status VARCHAR DEFAULT 'applied',
  ai_match_score NUMERIC,
  skill_match_score NUMERIC,
  culture_fit_score NUMERIC,
  predicted_success NUMERIC,
  retention_risk NUMERIC,
  ai_recommendation VARCHAR,
  red_flags JSON,
  interview_date TIMESTAMP WITHOUT TIME ZONE,
  interview_notes TEXT,
  interview_rating NUMERIC,
  applied_date TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create skills table
CREATE TABLE IF NOT EXISTS public.skills (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR NOT NULL,
  category VARCHAR,
  description TEXT,
  level_required VARCHAR,
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Enable Row Level Security
ALTER TABLE public.job_openings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skills ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Allow all operations for now (MVP without auth)
CREATE POLICY "Allow all on job_openings" ON public.job_openings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on candidates" ON public.candidates FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on applications" ON public.applications FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on skills" ON public.skills FOR ALL USING (true) WITH CHECK (true);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Add triggers for updated_at
CREATE TRIGGER update_job_openings_updated_at
BEFORE UPDATE ON public.job_openings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_candidates_updated_at
BEFORE UPDATE ON public.candidates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_applications_updated_at
BEFORE UPDATE ON public.applications
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();