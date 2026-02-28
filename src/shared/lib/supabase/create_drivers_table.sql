-- Create drivers table for Mobi app
-- Run this SQL in your Supabase SQL Editor

-- Create the drivers table
CREATE TABLE IF NOT EXISTS public.drivers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    fullname TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    cin TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create index on email for faster lookups
CREATE INDEX IF NOT EXISTS drivers_email_idx ON public.drivers(email);

-- Create index on cin for faster lookups
CREATE INDEX IF NOT EXISTS drivers_cin_idx ON public.drivers(cin);

-- Create index on status for filtering
CREATE INDEX IF NOT EXISTS drivers_status_idx ON public.drivers(status);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_drivers_updated_at
    BEFORE UPDATE ON public.drivers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;

-- Create policy to allow public insert
CREATE POLICY "Allow public insert" ON public.drivers
    FOR INSERT
    WITH CHECK (true);

-- Create policy to allow public select
CREATE POLICY "Allow public select" ON public.drivers
    FOR SELECT
    USING (true);

-- Create policy to allow public update
CREATE POLICY "Allow public update" ON public.drivers
    FOR UPDATE
    USING (true);

-- Note: Adjust RLS policies based on your authentication setup
-- If you're using Supabase Auth, you might want to use:
-- USING (auth.uid() = user_id) for user-specific access

