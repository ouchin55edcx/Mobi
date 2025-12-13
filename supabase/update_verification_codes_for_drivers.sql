-- Update verification_codes table to support both students and drivers
-- Run this SQL in your Supabase SQL Editor after creating the drivers table

-- Drop the foreign key constraint on student_id
ALTER TABLE public.verification_codes
DROP CONSTRAINT IF EXISTS verification_codes_student_id_fkey;

-- Make student_id nullable and add user_type and driver_id columns
ALTER TABLE public.verification_codes
ALTER COLUMN student_id DROP NOT NULL;

-- Add user_type column to distinguish between student and driver
ALTER TABLE public.verification_codes
ADD COLUMN IF NOT EXISTS user_type TEXT CHECK (user_type IN ('student', 'driver'));

-- Add driver_id column for driver verification codes
ALTER TABLE public.verification_codes
ADD COLUMN IF NOT EXISTS driver_id UUID REFERENCES public.drivers(id) ON DELETE CASCADE;

-- Create index on driver_id for faster lookups
CREATE INDEX IF NOT EXISTS verification_codes_driver_id_idx ON public.verification_codes(driver_id);

-- Create index on user_type for filtering
CREATE INDEX IF NOT EXISTS verification_codes_user_type_idx ON public.verification_codes(user_type);

-- Add email_verified column to drivers table
ALTER TABLE public.drivers 
ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false NOT NULL;

-- Create index on email_verified for drivers
CREATE INDEX IF NOT EXISTS drivers_email_verified_idx ON public.drivers(email_verified);

-- Update existing records to have user_type = 'student'
UPDATE public.verification_codes
SET user_type = 'student'
WHERE user_type IS NULL AND student_id IS NOT NULL;

-- Note: The verification service will need to be updated to set user_type when creating codes
-- For now, student_id can still be used for students, and driver_id for drivers

