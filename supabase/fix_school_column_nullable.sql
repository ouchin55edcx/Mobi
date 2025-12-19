-- Quick Fix: Make school column nullable to allow inserts with school_id
-- Run this SQL immediately in your Supabase SQL Editor to fix the error
-- This allows the transition period where both school (TEXT) and school_id (UUID) can coexist

-- Make school column nullable (removes NOT NULL constraint)
ALTER TABLE public.students 
ALTER COLUMN school DROP NOT NULL;

-- Verify the change
-- You can check by running: SELECT column_name, is_nullable FROM information_schema.columns WHERE table_name = 'students' AND column_name = 'school';
-- Should show: is_nullable = 'YES'

