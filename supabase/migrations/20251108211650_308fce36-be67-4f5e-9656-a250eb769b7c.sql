-- Temporarily disable RLS on applications and grant permissions to authenticated users
ALTER TABLE public.applications DISABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.applications TO authenticated;