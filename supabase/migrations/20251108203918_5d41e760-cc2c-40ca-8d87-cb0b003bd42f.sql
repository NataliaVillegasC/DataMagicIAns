-- Enable RLS on users table (legacy table, will be replaced by profiles)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Enable RLS on ai_insights table
ALTER TABLE public.ai_insights ENABLE ROW LEVEL SECURITY;