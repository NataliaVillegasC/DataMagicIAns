-- Add missing fields to candidates table
ALTER TABLE public.candidates
  ADD COLUMN IF NOT EXISTS social_links jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS professional_summary text,
  ADD COLUMN IF NOT EXISTS experience jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS independent_work boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS education jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS languages jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS document_language text DEFAULT 'en',
  ADD COLUMN IF NOT EXISTS certifications jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS generic_skills jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS achievements jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS volunteering jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS professional_affiliations jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS interests jsonb DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.candidates.social_links IS 'Social media and professional profile links';
COMMENT ON COLUMN public.candidates.professional_summary IS 'Professional summary or bio';
COMMENT ON COLUMN public.candidates.experience IS 'Work experience history';
COMMENT ON COLUMN public.candidates.independent_work IS 'Preference for independent work';
COMMENT ON COLUMN public.candidates.education IS 'Educational background';
COMMENT ON COLUMN public.candidates.languages IS 'Languages spoken';
COMMENT ON COLUMN public.candidates.document_language IS 'Primary language of CV/documents';
COMMENT ON COLUMN public.candidates.certifications IS 'Professional certifications';
COMMENT ON COLUMN public.candidates.generic_skills IS 'General/soft skills';
COMMENT ON COLUMN public.candidates.achievements IS 'Professional achievements';
COMMENT ON COLUMN public.candidates.volunteering IS 'Volunteer experience';
COMMENT ON COLUMN public.candidates.professional_affiliations IS 'Professional organizations and memberships';
COMMENT ON COLUMN public.candidates.interests IS 'Personal and professional interests';