-- Create buses table for Mobi app
-- Run this SQL in your Supabase SQL Editor

-- Create the buses table
CREATE TABLE IF NOT EXISTS public.buses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    driver_id UUID NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    brand TEXT NOT NULL,
    year INTEGER NOT NULL CHECK (year >= 1900 AND year <= EXTRACT(YEAR FROM CURRENT_DATE)),
    plate_number TEXT NOT NULL,
    parking_location JSONB NOT NULL,
    capacity INTEGER NOT NULL CHECK (capacity >= 7),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create index on driver_id for faster lookups
CREATE INDEX IF NOT EXISTS buses_driver_id_idx ON public.buses(driver_id);

-- Create index on type for filtering
CREATE INDEX IF NOT EXISTS buses_type_idx ON public.buses(type);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_buses_updated_at
    BEFORE UPDATE ON public.buses
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE public.buses ENABLE ROW LEVEL SECURITY;

-- Create policy to allow public insert
CREATE POLICY "Allow public insert" ON public.buses
    FOR INSERT
    WITH CHECK (true);

-- Create policy to allow public select
CREATE POLICY "Allow public select" ON public.buses
    FOR SELECT
    USING (true);

-- Create policy to allow public update
CREATE POLICY "Allow public update" ON public.buses
    FOR UPDATE
    USING (true);

-- Note: Adjust RLS policies based on your authentication setup

