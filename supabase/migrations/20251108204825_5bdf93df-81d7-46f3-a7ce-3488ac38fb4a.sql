-- Fix Security Issues: Add company scoping and proper RLS policies

-- Step 1: Add company column to candidates table
ALTER TABLE public.candidates 
ADD COLUMN IF NOT EXISTS company text;

-- Populate company for existing candidates based on source_user_id
UPDATE public.candidates c
SET company = p.company
FROM public.profiles p
WHERE c.source_user_id = p.id AND c.company IS NULL;

-- Step 2: Add company column to job_openings table
ALTER TABLE public.job_openings
ADD COLUMN IF NOT EXISTS company text;

-- Populate company for existing job openings based on created_by
UPDATE public.job_openings jo
SET company = p.company
FROM public.profiles p
WHERE jo.created_by = p.id AND jo.company IS NULL;

-- Step 3: Drop overly permissive RLS policies
DROP POLICY IF EXISTS "Anyone authenticated can view candidates" ON public.candidates;
DROP POLICY IF EXISTS "Anyone authenticated can view applications" ON public.applications;
DROP POLICY IF EXISTS "Anyone authenticated can view job openings" ON public.job_openings;

-- Step 4: Create company-scoped RLS policies for candidates
CREATE POLICY "Users can view own company candidates"
ON public.candidates FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.company = candidates.company
  )
);

CREATE POLICY "Recruiters can insert own company candidates"
ON public.candidates FOR INSERT
TO authenticated
WITH CHECK (
  (has_role(auth.uid(), 'recruiter'::app_role) OR 
   has_role(auth.uid(), 'admin'::app_role) OR 
   has_role(auth.uid(), 'hiring_manager'::app_role))
  AND
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.company = candidates.company
  )
);

-- Step 5: Create company-scoped RLS policies for job_openings
CREATE POLICY "Users can view own company job openings"
ON public.job_openings FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.company = job_openings.company
  )
);

CREATE POLICY "Recruiters can insert own company job openings"
ON public.job_openings FOR INSERT
TO authenticated
WITH CHECK (
  (has_role(auth.uid(), 'recruiter'::app_role) OR 
   has_role(auth.uid(), 'admin'::app_role) OR 
   has_role(auth.uid(), 'hiring_manager'::app_role))
  AND
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.company = job_openings.company
  )
);

-- Step 6: Create company-scoped RLS policies for applications
-- Applications are linked via candidates and job_openings, so we check both
CREATE POLICY "Users can view own company applications"
ON public.applications FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM public.candidates c
    JOIN public.profiles p ON p.id = auth.uid()
    WHERE c.id = applications.candidate_id
    AND c.company = p.company
  )
  OR
  EXISTS (
    SELECT 1
    FROM public.job_openings jo
    JOIN public.profiles p ON p.id = auth.uid()
    WHERE jo.id = applications.job_opening_id
    AND jo.company = p.company
  )
);

CREATE POLICY "Recruiters can insert own company applications"
ON public.applications FOR INSERT
TO authenticated
WITH CHECK (
  (has_role(auth.uid(), 'recruiter'::app_role) OR 
   has_role(auth.uid(), 'admin'::app_role) OR 
   has_role(auth.uid(), 'hiring_manager'::app_role))
  AND
  EXISTS (
    SELECT 1 
    FROM public.candidates c
    JOIN public.profiles p ON p.id = auth.uid()
    WHERE c.id = applications.candidate_id
    AND c.company = p.company
  )
);

-- Step 7: Add DELETE policy for applications (GDPR compliance)
CREATE POLICY "Recruiters can delete own company applications"
ON public.applications FOR DELETE
TO authenticated
USING (
  (has_role(auth.uid(), 'recruiter'::app_role) OR 
   has_role(auth.uid(), 'admin'::app_role))
  AND
  EXISTS (
    SELECT 1 
    FROM public.candidates c
    JOIN public.profiles p ON p.id = auth.uid()
    WHERE c.id = applications.candidate_id
    AND c.company = p.company
  )
);

-- Step 8: Create storage policies for cv_uploads bucket
CREATE POLICY "Users can upload CVs for own company candidates"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'cv_uploads'
  AND (has_role(auth.uid(), 'recruiter'::app_role) OR 
       has_role(auth.uid(), 'admin'::app_role) OR 
       has_role(auth.uid(), 'hiring_manager'::app_role))
);

CREATE POLICY "Users can view own company CVs"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'cv_uploads'
);

CREATE POLICY "Users can update own company CVs"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'cv_uploads'
  AND (has_role(auth.uid(), 'recruiter'::app_role) OR 
       has_role(auth.uid(), 'admin'::app_role))
);

CREATE POLICY "Users can delete own company CVs"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'cv_uploads'
  AND (has_role(auth.uid(), 'recruiter'::app_role) OR 
       has_role(auth.uid(), 'admin'::app_role))
);