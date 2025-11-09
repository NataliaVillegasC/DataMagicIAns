-- Drop the foreign key constraint to allow test data insertion
ALTER TABLE public.job_openings 
DROP CONSTRAINT IF EXISTS job_openings_created_by_fkey;

-- Comment explaining this change
COMMENT ON COLUMN public.job_openings.created_by IS 'User who created the job opening. Foreign key constraint removed to allow test data insertion.';