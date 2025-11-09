-- Temporarily disable RLS on job_openings and grant permissions to authenticated users
ALTER TABLE public.job_openings DISABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.job_openings TO authenticated;
