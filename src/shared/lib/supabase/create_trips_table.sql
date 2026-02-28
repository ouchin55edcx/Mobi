-- Create trips table for Mobi app
-- Run this SQL in your Supabase SQL Editor

-- Create the trips table
CREATE TABLE IF NOT EXISTS public.trips (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    booking_id UUID, -- Will add foreign key constraint after bookings table is created
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    driver_id UUID, -- Will add foreign key constraint after drivers table is created
    type TEXT NOT NULL CHECK (type IN ('PICKUP', 'DROPOFF')),
    
    -- Timing Fields
    leave_home_time TIMESTAMP WITH TIME ZONE,
    reach_pickup_time TIMESTAMP WITH TIME ZONE,
    reach_destination_time TIMESTAMP WITH TIME ZONE,
    estimated_arrival_time TIMESTAMP WITH TIME ZONE,
    
    -- Route Data (JSONB)
    home_to_pickup_route JSONB,
    pickup_to_destination_route JSONB,
    total_route JSONB,
    
    -- Location References (JSONB)
    home_location JSONB,
    pickup_location JSONB,
    pickup_point_location JSONB,
    destination_location JSONB,
    pickup_point_id UUID, -- References pickup_points table if exists
    
    -- Status
    status TEXT DEFAULT 'PENDING' CHECK (status IN ('GENERATED', 'CONFIRMED', 'ACTIVE', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED')),
    driver_assigned BOOLEAN DEFAULT false,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS trips_booking_id_idx ON public.trips(booking_id);
CREATE INDEX IF NOT EXISTS trips_student_id_idx ON public.trips(student_id);
CREATE INDEX IF NOT EXISTS trips_driver_id_idx ON public.trips(driver_id);
CREATE INDEX IF NOT EXISTS trips_status_idx ON public.trips(status);
CREATE INDEX IF NOT EXISTS trips_type_idx ON public.trips(type);
CREATE INDEX IF NOT EXISTS trips_student_status_idx ON public.trips(student_id, status);
CREATE INDEX IF NOT EXISTS trips_driver_status_idx ON public.trips(driver_id, status) WHERE driver_id IS NOT NULL;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_trips_updated_at
    BEFORE UPDATE ON public.trips
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;

-- Create policy to allow students to read their own trips
CREATE POLICY "Allow students to read own trips" ON public.trips
    FOR SELECT
    USING (true);

-- Create policy to allow students to update their own trips (limited)
CREATE POLICY "Allow students to update own trips" ON public.trips
    FOR UPDATE
    USING (true);

-- Note: Adjust RLS policies based on your authentication setup
-- If you're using Supabase Auth, you might want to use:
-- USING (auth.uid() = student_id) for user-specific access

-- ============================================
-- Add foreign key constraints (run after bookings and drivers tables are created)
-- ============================================

-- Add foreign key to bookings table (if it exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'bookings') THEN
        -- Add foreign key constraint if it doesn't already exist
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_schema = 'public' 
            AND constraint_name = 'trips_booking_id_fkey'
        ) THEN
            ALTER TABLE public.trips 
            ADD CONSTRAINT trips_booking_id_fkey 
            FOREIGN KEY (booking_id) 
            REFERENCES public.bookings(id) 
            ON DELETE CASCADE;
        END IF;
    END IF;
END $$;

-- Add foreign key to drivers table (if it exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'drivers') THEN
        -- Add foreign key constraint if it doesn't already exist
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_schema = 'public' 
            AND constraint_name = 'trips_driver_id_fkey'
        ) THEN
            ALTER TABLE public.trips 
            ADD CONSTRAINT trips_driver_id_fkey 
            FOREIGN KEY (driver_id) 
            REFERENCES public.drivers(id) 
            ON DELETE SET NULL;
        END IF;
    END IF;
END $$;

