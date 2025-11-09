-- Create app_role enum for roles
CREATE TYPE public.app_role AS ENUM ('admin', 'recruiter', 'hiring_manager');

-- Create profiles table for user data (not auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  company TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create user_roles table (CRITICAL: roles in separate table)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, role)
);

-- Enable RLS on new tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- RLS Policies for user_roles
CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Only admins can manage roles"
  ON public.user_roles FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Update RLS policies for existing tables
-- Job openings: authenticated users can view, only recruiters/admins can modify
DROP POLICY IF EXISTS "Allow all on job_openings" ON public.job_openings;

CREATE POLICY "Anyone authenticated can view job openings"
  ON public.job_openings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Recruiters can create job openings"
  ON public.job_openings FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'recruiter') OR 
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'hiring_manager')
  );

CREATE POLICY "Recruiters can update their job openings"
  ON public.job_openings FOR UPDATE
  TO authenticated
  USING (
    created_by = auth.uid() OR 
    public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Recruiters can delete their job openings"
  ON public.job_openings FOR DELETE
  TO authenticated
  USING (
    created_by = auth.uid() OR 
    public.has_role(auth.uid(), 'admin')
  );

-- Candidates: authenticated users can view, only recruiters/admins can modify
DROP POLICY IF EXISTS "Allow all on candidates" ON public.candidates;

CREATE POLICY "Anyone authenticated can view candidates"
  ON public.candidates FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Recruiters can create candidates"
  ON public.candidates FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'recruiter') OR 
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'hiring_manager')
  );

CREATE POLICY "Recruiters can update candidates"
  ON public.candidates FOR UPDATE
  TO authenticated
  USING (
    source_user_id = auth.uid() OR 
    public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Recruiters can delete candidates"
  ON public.candidates FOR DELETE
  TO authenticated
  USING (
    source_user_id = auth.uid() OR 
    public.has_role(auth.uid(), 'admin')
  );

-- Applications: authenticated users can view, only recruiters/admins can modify
DROP POLICY IF EXISTS "Allow all on applications" ON public.applications;

CREATE POLICY "Anyone authenticated can view applications"
  ON public.applications FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Recruiters can create applications"
  ON public.applications FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'recruiter') OR 
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'hiring_manager')
  );

CREATE POLICY "Recruiters can update applications"
  ON public.applications FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'recruiter') OR 
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'hiring_manager')
  );

-- Skills: read-only for all authenticated users
DROP POLICY IF EXISTS "Allow all on skills" ON public.skills;

CREATE POLICY "Anyone authenticated can view skills"
  ON public.skills FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only admins can manage skills"
  ON public.skills FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- AI Insights: same as applications
CREATE POLICY "Anyone authenticated can view ai_insights"
  ON public.ai_insights FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Recruiters can create ai_insights"
  ON public.ai_insights FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'recruiter') OR 
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'hiring_manager')
  );

-- Trigger to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  );
  
  -- Assign default 'recruiter' role to new users
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'recruiter');
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Update timestamp trigger for profiles
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Storage bucket RLS for CV uploads
CREATE POLICY "Authenticated users can upload CVs"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'cv_uploads' AND
    (public.has_role(auth.uid(), 'recruiter') OR 
     public.has_role(auth.uid(), 'admin') OR
     public.has_role(auth.uid(), 'hiring_manager'))
  );

CREATE POLICY "Authenticated users can view CVs"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'cv_uploads');

CREATE POLICY "Recruiters can update CVs"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'cv_uploads' AND
    (public.has_role(auth.uid(), 'recruiter') OR 
     public.has_role(auth.uid(), 'admin') OR
     public.has_role(auth.uid(), 'hiring_manager'))
  );

CREATE POLICY "Recruiters can delete CVs"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'cv_uploads' AND
    (public.has_role(auth.uid(), 'recruiter') OR 
     public.has_role(auth.uid(), 'admin') OR
     public.has_role(auth.uid(), 'hiring_manager'))
  );