-- Clean up orphaned data and fix foreign key constraints

-- Delete job openings with invalid created_by references
DELETE FROM public.job_openings 
WHERE created_by NOT IN (SELECT id FROM public.profiles);

-- Delete candidates with invalid source_user_id references
DELETE FROM public.candidates 
WHERE source_user_id IS NOT NULL 
AND source_user_id NOT IN (SELECT id FROM public.profiles);

-- Drop old foreign key on job_openings
ALTER TABLE public.job_openings 
DROP CONSTRAINT IF EXISTS job_openings_created_by_fkey;

-- Add new foreign key referencing profiles
ALTER TABLE public.job_openings 
ADD CONSTRAINT job_openings_created_by_fkey 
FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Fix candidates table as well
ALTER TABLE public.candidates 
DROP CONSTRAINT IF EXISTS candidates_source_user_id_fkey;

ALTER TABLE public.candidates 
ADD CONSTRAINT candidates_source_user_id_fkey 
FOREIGN KEY (source_user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;