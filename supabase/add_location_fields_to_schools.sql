-- Migration: Add location fields and is_active to schools table
-- Run this SQL in your Supabase SQL Editor if you already created the schools table
-- This adds the new location fields and is_active column

-- Step 1: Add location fields
ALTER TABLE public.schools 
ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Step 2: Update existing schools with default location (Casablanca coordinates)
-- You should update these with actual school locations
UPDATE public.schools 
SET 
    latitude = 33.5731,
    longitude = -7.5898,
    city = 'Casablanca',
    is_active = true
WHERE latitude IS NULL OR longitude IS NULL;

-- Step 3: Make latitude and longitude NOT NULL after setting default values
ALTER TABLE public.schools 
ALTER COLUMN latitude SET NOT NULL,
ALTER COLUMN longitude SET NOT NULL;

-- Step 4: Create indexes
CREATE INDEX IF NOT EXISTS schools_is_active_idx ON public.schools(is_active);
CREATE INDEX IF NOT EXISTS schools_location_idx ON public.schools(latitude, longitude);

-- Step 5: Update mock data with actual locations (if needed)
-- Uncomment and update the following with actual school locations:
/*
UPDATE public.schools SET 
    latitude = 33.5731, 
    longitude = -7.5898, 
    address = 'Boulevard Mohamed V', 
    city = 'Casablanca'
WHERE name = 'University of Casablanca';

UPDATE public.schools SET 
    latitude = 33.9716, 
    longitude = -6.8498, 
    address = 'Avenue des Nations Unies', 
    city = 'Rabat'
WHERE name = 'Mohammed V University';

-- Add more UPDATE statements for other schools...
*/

