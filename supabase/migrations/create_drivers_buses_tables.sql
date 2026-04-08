-- ============================================================================
-- MOBI — Create drivers & buses tables
-- Run this in Supabase SQL Editor
-- ============================================================================

-- Drop existing if you want a clean slate
-- DROP TABLE IF EXISTS public.buses CASCADE;
-- DROP TABLE IF EXISTS public.drivers CASCADE;

-- ============================================================================
-- 1. DRIVERS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.drivers (
    id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id         UUID REFERENCES auth.users(id) UNIQUE,
    fullname        TEXT NOT NULL,
    email           TEXT NOT NULL UNIQUE,
    city            TEXT,
    location        JSONB,
    permis_url      TEXT,
    status          TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
    created_at      TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at      TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS drivers_user_id_idx      ON public.drivers(user_id);
CREATE INDEX IF NOT EXISTS drivers_email_idx        ON public.drivers(email);
CREATE INDEX IF NOT EXISTS drivers_status_idx       ON public.drivers(status);

-- Auto update updated_at
CREATE OR REPLACE TRIGGER update_drivers_updated_at
    BEFORE UPDATE ON public.drivers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 2. BUSES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.buses (
    id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    driver_id           UUID NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
    bus_type            TEXT NOT NULL,
    capacity            INTEGER NOT NULL CHECK (capacity >= 7),
    plate_number        TEXT NOT NULL UNIQUE,
    image_url           TEXT,
    carte_grise_url     TEXT,
    created_at          TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at          TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS buses_driver_id_idx      ON public.buses(driver_id);
CREATE INDEX IF NOT EXISTS buses_plate_number_idx   ON public.buses(plate_number);

-- Auto update updated_at
CREATE OR REPLACE TRIGGER update_buses_updated_at
    BEFORE UPDATE ON public.buses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 3. ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "drivers_insert" ON public.drivers;
DROP POLICY IF EXISTS "drivers_select_own" ON public.drivers;
DROP POLICY IF EXISTS "drivers_update_own" ON public.drivers;

-- Anyone can insert (registration)
CREATE POLICY "drivers_insert" ON public.drivers
    FOR INSERT WITH CHECK (true);

-- Drivers can only read their own data
CREATE POLICY "drivers_select_own" ON public.drivers
    FOR SELECT USING (auth.uid() = user_id);

-- Drivers can only update their own data
CREATE POLICY "drivers_update_own" ON public.drivers
    FOR UPDATE USING (auth.uid() = user_id);

-- Public read access for drivers (needed for bookings to fetch driver info)
CREATE POLICY "drivers_public_read" ON public.drivers
    FOR SELECT USING (true);

-- Buses RLS
ALTER TABLE public.buses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "buses_insert" ON public.buses;
DROP POLICY IF EXISTS "buses_select_own" ON public.buses;
DROP POLICY IF EXISTS "buses_select_assigned" ON public.buses;

-- Anyone can insert (registration)
CREATE POLICY "buses_insert" ON public.buses
    FOR INSERT WITH CHECK (true);

-- Drivers can read their own buses
CREATE POLICY "buses_select_own" ON public.buses
    FOR SELECT USING (
        driver_id IN (
            SELECT id FROM public.drivers WHERE user_id = auth.uid()
        )
    );

-- Public read for assigned buses (needed for student trip details)
CREATE POLICY "buses_select_assigned" ON public.buses
    FOR SELECT USING (true);

-- ============================================================================
-- 4. ENABLE REALTIME (for live trip tracking)
-- ============================================================================

ALTER PUBLICATION supabase_realtime ADD TABLE public.drivers;
ALTER PUBLICATION supabase_realtime ADD TABLE public.buses;

-- ============================================================================
-- 5. VERIFY TABLES WERE CREATED
-- ============================================================================

SELECT table_name, column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('drivers', 'buses')
ORDER BY table_name, ordinal_position;
