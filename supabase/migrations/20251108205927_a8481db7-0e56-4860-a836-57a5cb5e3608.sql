-- Update the handle_new_user function to save company to profiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, company)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'company', '')
  );
  
  -- Assign default 'recruiter' role to new users
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'recruiter');
  
  RETURN NEW;
END;
$function$;