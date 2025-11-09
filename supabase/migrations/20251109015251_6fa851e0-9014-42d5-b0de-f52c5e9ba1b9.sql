-- Make created_by nullable to allow direct data insertion for testing
ALTER TABLE public.job_openings 
ALTER COLUMN created_by DROP NOT NULL;

-- Comment explaining this is for testing purposes
COMMENT ON COLUMN public.job_openings.created_by IS 'User who created the job opening. Nullable to allow test data insertion.';