-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own company interviews" ON public.interviews;
DROP POLICY IF EXISTS "Recruiters can create interviews" ON public.interviews;

-- Create updated policies that handle NULL company
CREATE POLICY "Users can view interviews for their candidates"
ON public.interviews
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM candidates
    WHERE candidates.id = interviews.candidate_id
    AND candidates.source_user_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM candidates
    JOIN profiles ON profiles.id = auth.uid()
    WHERE candidates.id = interviews.candidate_id
    AND candidates.company IS NOT NULL
    AND candidates.company = profiles.company
  )
);

-- Recruiters can create interviews for their own candidates
CREATE POLICY "Recruiters can create interviews for their candidates"
ON public.interviews
FOR INSERT
WITH CHECK (
  (has_role(auth.uid(), 'recruiter'::app_role) OR 
   has_role(auth.uid(), 'admin'::app_role) OR 
   has_role(auth.uid(), 'hiring_manager'::app_role))
  AND
  (
    EXISTS (
      SELECT 1 FROM candidates
      WHERE candidates.id = interviews.candidate_id
      AND candidates.source_user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM candidates
      JOIN profiles ON profiles.id = auth.uid()
      WHERE candidates.id = interviews.candidate_id
      AND candidates.company IS NOT NULL
      AND candidates.company = profiles.company
    )
  )
);