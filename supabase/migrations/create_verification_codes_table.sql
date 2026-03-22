-- Create verification_codes table for email verification
-- Run this SQL in your Supabase SQL Editor

-- Create the verification_codes table
CREATE TABLE IF NOT EXISTS public.verification_codes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    code TEXT NOT NULL,
    attempts INTEGER DEFAULT 0 NOT NULL,
    max_attempts INTEGER DEFAULT 5 NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    verified BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    verified_at TIMESTAMP WITH TIME ZONE
);

-- Create index on student_id for faster lookups
CREATE INDEX IF NOT EXISTS verification_codes_student_id_idx ON public.verification_codes(student_id);

-- Create index on email for faster lookups
CREATE INDEX IF NOT EXISTS verification_codes_email_idx ON public.verification_codes(email);

-- Create index on code for verification lookups
CREATE INDEX IF NOT EXISTS verification_codes_code_idx ON public.verification_codes(code);

-- Create index on expires_at for cleanup queries
CREATE INDEX IF NOT EXISTS verification_codes_expires_at_idx ON public.verification_codes(expires_at);

-- Add email_verified column to students table
ALTER TABLE public.students 
ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false NOT NULL;

-- Create index on email_verified for filtering
CREATE INDEX IF NOT EXISTS students_email_verified_idx ON public.students(email_verified);

-- Enable Row Level Security (RLS)
ALTER TABLE public.verification_codes ENABLE ROW LEVEL SECURITY;

-- Create policy to allow public insert (for creating verification codes)
CREATE POLICY "Allow public insert verification codes" ON public.verification_codes
    FOR INSERT
    WITH CHECK (true);

-- Create policy to allow public select (for verifying codes)
CREATE POLICY "Allow public select verification codes" ON public.verification_codes
    FOR SELECT
    USING (true);

-- Create policy to allow public update (for updating attempts and verified status)
CREATE POLICY "Allow public update verification codes" ON public.verification_codes
    FOR UPDATE
    USING (true);

-- Function to automatically expire old verification codes (optional cleanup)
CREATE OR REPLACE FUNCTION cleanup_expired_verification_codes()
RETURNS void AS $$
BEGIN
    DELETE FROM public.verification_codes
    WHERE expires_at < NOW() AND verified = false;
END;
$$ LANGUAGE plpgsql;

-- Note: You can set up a cron job or scheduled task to run cleanup_expired_verification_codes()
-- For Supabase, you can use pg_cron extension if available

