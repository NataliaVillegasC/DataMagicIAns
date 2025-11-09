-- Add urgency field to job_openings table
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'job_openings' 
    AND column_name = 'urgency'
  ) THEN
    CREATE TYPE job_urgency AS ENUM ('low', 'medium', 'high', 'critical');
    ALTER TABLE public.job_openings 
    ADD COLUMN urgency job_urgency DEFAULT 'medium';
  END IF;
END $$;