-- ============================================================================
-- MOBI — Remove driver_id from bookings table
-- ============================================================================

-- Drop the foreign key constraint first (if it exists)
ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_driver_id_fkey;

-- Drop the driver_id column
ALTER TABLE public.bookings DROP COLUMN IF EXISTS driver_id;

-- Verify
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'bookings'
AND table_schema = 'public'
ORDER BY ordinal_position;
