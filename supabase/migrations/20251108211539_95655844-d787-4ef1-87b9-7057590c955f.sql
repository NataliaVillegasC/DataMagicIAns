-- Temporarily disable RLS on candidates and grant permissions to authenticated users
ALTER TABLE public.candidates DISABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.candidates TO authenticated;