-- Add RLS policies for users table (legacy table)
CREATE POLICY "Users can view their own user record"
  ON public.users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own user record"
  ON public.users FOR UPDATE
  USING (auth.uid() = id);