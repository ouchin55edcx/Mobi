-- ============================================================================
-- MOBI — Update drivers & buses tables for new registration flow
-- ============================================================================

-- Update drivers table
ALTER TABLE public.drivers
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS location JSONB,
ADD COLUMN IF NOT EXISTS permis_url TEXT,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED'));

-- Add user_id link to auth
ALTER TABLE public.drivers
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- Drop old columns we don't need
ALTER TABLE public.drivers DROP COLUMN IF EXISTS cin;
ALTER TABLE public.drivers DROP COLUMN IF EXISTS license_number;
ALTER TABLE public.drivers DROP COLUMN IF EXISTS approval_status;

-- Indexes
CREATE INDEX IF NOT EXISTS drivers_user_id_idx ON public.drivers(user_id);
CREATE INDEX IF NOT EXISTS drivers_status_idx ON public.drivers(status);

-- Update buses table
ALTER TABLE public.buses
ADD COLUMN IF NOT EXISTS bus_type TEXT,
ADD COLUMN IF NOT EXISTS image_url TEXT,
ADD COLUMN IF NOT EXISTS carte_grise_url TEXT;

-- Drop old columns we don't need
ALTER TABLE public.buses DROP COLUMN IF EXISTS status;

-- Indexes
CREATE INDEX IF NOT EXISTS buses_driver_id_idx ON public.buses(driver_id);

-- RLS for drivers
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "drivers_insert" ON public.drivers;
DROP POLICY IF EXISTS "drivers_select_own" ON public.drivers;
DROP POLICY IF EXISTS "drivers_update_own" ON public.drivers;

CREATE POLICY "drivers_insert" ON public.drivers
    FOR INSERT WITH CHECK (true);

CREATE POLICY "drivers_select_own" ON public.drivers
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "drivers_update_own" ON public.drivers
    FOR UPDATE USING (auth.uid() = user_id);

-- RLS for buses
ALTER TABLE public.buses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "buses_insert" ON public.buses;
DROP POLICY IF EXISTS "buses_select_own" ON public.buses;

CREATE POLICY "buses_insert" ON public.buses
    FOR INSERT WITH CHECK (true);

CREATE POLICY "buses_select_own" ON public.buses
    FOR SELECT USING (
        driver_id IN (
            SELECT id FROM public.drivers WHERE user_id = auth.uid()
        )
    );
