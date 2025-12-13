-- Create bookings table for Mobi app
-- Run this SQL in your Supabase SQL Editor

-- Create the bookings table
CREATE TABLE IF NOT EXISTS public.bookings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('PICKUP', 'DROPOFF')),
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    -- Ensure end_time is after start_time
    CONSTRAINT valid_time_range CHECK (end_time > start_time)
);

-- Create index on student_id for faster lookups
CREATE INDEX IF NOT EXISTS bookings_student_id_idx ON public.bookings(student_id);

-- Create index on type for filtering
CREATE INDEX IF NOT EXISTS bookings_type_idx ON public.bookings(type);

-- Create index on status for filtering
CREATE INDEX IF NOT EXISTS bookings_status_idx ON public.bookings(status);

-- Create index on start_time for date range queries
CREATE INDEX IF NOT EXISTS bookings_start_time_idx ON public.bookings(start_time);

-- Create index on end_time for date range queries
CREATE INDEX IF NOT EXISTS bookings_end_time_idx ON public.bookings(end_time);

-- Create composite index for common queries
CREATE INDEX IF NOT EXISTS bookings_student_status_idx ON public.bookings(student_id, status);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_bookings_updated_at
    BEFORE UPDATE ON public.bookings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- Create policy to allow students to insert their own bookings
CREATE POLICY "Allow students to insert bookings" ON public.bookings
    FOR INSERT
    WITH CHECK (true);

-- Create policy to allow students to read their own bookings
CREATE POLICY "Allow students to read own bookings" ON public.bookings
    FOR SELECT
    USING (true);

-- Create policy to allow students to update their own bookings
CREATE POLICY "Allow students to update own bookings" ON public.bookings
    FOR UPDATE
    USING (true);

-- Create policy to allow students to delete their own bookings
CREATE POLICY "Allow students to delete own bookings" ON public.bookings
    FOR DELETE
    USING (true);

-- Note: Adjust RLS policies based on your authentication setup
-- If you're using Supabase Auth, you might want to use:
-- USING (auth.uid() = student_id) for user-specific access

