-- Migration: Add location fields to bookings table
-- This adds the necessary fields for storing trip route information

-- Add location columns to bookings table
ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS pickup_location JSONB,
ADD COLUMN IF NOT EXISTS destination_location JSONB,
ADD COLUMN IF NOT EXISTS route_coordinates JSONB,
ADD COLUMN IF NOT EXISTS driver_id UUID REFERENCES public.drivers(id),
ADD COLUMN IF NOT EXISTS bus_id UUID REFERENCES public.buses(id);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS bookings_driver_id_idx ON public.bookings(driver_id);
CREATE INDEX IF NOT EXISTS bookings_bus_id_idx ON public.bookings(bus_id);

-- Add comments for documentation
COMMENT ON COLUMN public.bookings.pickup_location IS 'JSON object with latitude and longitude for pickup point';
COMMENT ON COLUMN public.bookings.destination_location IS 'JSON object with latitude and longitude for destination';
COMMENT ON COLUMN public.bookings.route_coordinates IS 'Array of JSON objects with latitude and longitude for route path';
