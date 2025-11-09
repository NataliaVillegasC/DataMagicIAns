-- Insert demo user for MVP (no auth yet)
INSERT INTO public.users (id, email, full_name, role, company) 
VALUES (
  '123e4567-e89b-12d3-a456-426614174000'::uuid, 
  'recruiter@demo.com', 
  'Sarah Chen', 
  'recruiter', 
  'Demo Company'
)
ON CONFLICT (id) DO NOTHING;