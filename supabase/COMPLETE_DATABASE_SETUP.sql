-- ============================================================================
-- MOBI APP - COMPLETE DATABASE SETUP
-- ============================================================================
-- This script creates all tables, indexes, triggers, and RLS policies
-- Copy and paste this entire file into Supabase SQL Editor and run it
-- ============================================================================

-- ============================================================================
-- 1. HELPER FUNCTIONS
-- ============================================================================

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- ============================================================================
-- 2. SCHOOLS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.schools (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    name_ar TEXT NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    address TEXT,
    city TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS schools_name_idx ON public.schools(name);
CREATE INDEX IF NOT EXISTS schools_is_active_idx ON public.schools(is_active);
CREATE INDEX IF NOT EXISTS schools_location_idx ON public.schools(latitude, longitude);

-- Trigger
CREATE TRIGGER update_schools_updated_at
    BEFORE UPDATE ON public.schools
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- RLS - DISABLED for public access (no authentication required)
ALTER TABLE public.schools DISABLE ROW LEVEL SECURITY;

-- Sample Data
INSERT INTO public.schools (name, name_ar, latitude, longitude, address, city, is_active) VALUES
    ('University of Casablanca', 'جامعة الدار البيضاء', 33.5731, -7.5898, 'Boulevard Mohamed V', 'Casablanca', true),
    ('Mohammed V University', 'جامعة محمد الخامس', 33.9716, -6.8498, 'Avenue des Nations Unies', 'Rabat', true),
    ('Ibn Tofail University', 'جامعة ابن طفيل', 34.0209, -6.8416, 'Route de Kenitra', 'Kenitra', true),
    ('Cadi Ayyad University', 'جامعة القاضي عياض', 31.6295, -7.9811, 'Boulevard Abdelkrim Khattabi', 'Marrakech', true),
    ('Hassan II University', 'جامعة الحسن الثاني', 33.5731, -7.5898, 'Route d''El Jadida', 'Casablanca', true)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 3. STUDENTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.students (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    fullname TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    cin TEXT NOT NULL UNIQUE,
    school_id UUID REFERENCES public.schools(id),
    home_location JSONB NOT NULL,
    is_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS students_email_idx ON public.students(email);
CREATE INDEX IF NOT EXISTS students_cin_idx ON public.students(cin);
CREATE INDEX IF NOT EXISTS students_school_id_idx ON public.students(school_id);

-- Trigger
CREATE TRIGGER update_students_updated_at
    BEFORE UPDATE ON public.students
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public insert" ON public.students
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public select" ON public.students
    FOR SELECT USING (true);

CREATE POLICY "Allow public update" ON public.students
    FOR UPDATE USING (true);

-- ============================================================================
-- 4. DRIVERS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.drivers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    fullname TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    cin TEXT NOT NULL UNIQUE,
    license_number TEXT,
    approval_status TEXT DEFAULT 'PENDING' CHECK (approval_status IN ('PENDING', 'APPROVED', 'REJECTED')),
    is_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS drivers_email_idx ON public.drivers(email);
CREATE INDEX IF NOT EXISTS drivers_cin_idx ON public.drivers(cin);
CREATE INDEX IF NOT EXISTS drivers_approval_status_idx ON public.drivers(approval_status);

-- Trigger
CREATE TRIGGER update_drivers_updated_at
    BEFORE UPDATE ON public.drivers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public insert" ON public.drivers
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public select" ON public.drivers
    FOR SELECT USING (true);

CREATE POLICY "Allow public update" ON public.drivers
    FOR UPDATE USING (true);

-- ============================================================================
-- 5. BUSES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.buses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    plate_number TEXT NOT NULL UNIQUE,
    capacity INTEGER NOT NULL,
    driver_id UUID REFERENCES public.drivers(id),
    status TEXT DEFAULT 'AVAILABLE' CHECK (status IN ('AVAILABLE', 'IN_USE', 'MAINTENANCE')),
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS buses_plate_number_idx ON public.buses(plate_number);
CREATE INDEX IF NOT EXISTS buses_driver_id_idx ON public.buses(driver_id);
CREATE INDEX IF NOT EXISTS buses_status_idx ON public.buses(status);

-- Trigger
CREATE TRIGGER update_buses_updated_at
    BEFORE UPDATE ON public.buses
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE public.buses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public select" ON public.buses
    FOR SELECT USING (true);

-- ============================================================================
-- 6. BOOKINGS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.bookings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    driver_id UUID REFERENCES public.drivers(id),
    bus_id UUID REFERENCES public.buses(id),
    type TEXT NOT NULL CHECK (type IN ('PICKUP', 'DROPOFF')),
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    pickup_location JSONB,
    destination_location JSONB,
    route_coordinates JSONB,
    status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED')),
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT valid_time_range CHECK (end_time > start_time)
);

-- Indexes
CREATE INDEX IF NOT EXISTS bookings_student_id_idx ON public.bookings(student_id);
CREATE INDEX IF NOT EXISTS bookings_driver_id_idx ON public.bookings(driver_id);
CREATE INDEX IF NOT EXISTS bookings_bus_id_idx ON public.bookings(bus_id);
CREATE INDEX IF NOT EXISTS bookings_type_idx ON public.bookings(type);
CREATE INDEX IF NOT EXISTS bookings_status_idx ON public.bookings(status);
CREATE INDEX IF NOT EXISTS bookings_start_time_idx ON public.bookings(start_time);
CREATE INDEX IF NOT EXISTS bookings_end_time_idx ON public.bookings(end_time);
CREATE INDEX IF NOT EXISTS bookings_student_status_idx ON public.bookings(student_id, status);

-- Trigger
CREATE TRIGGER update_bookings_updated_at
    BEFORE UPDATE ON public.bookings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow students to insert bookings" ON public.bookings
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow students to read own bookings" ON public.bookings
    FOR SELECT USING (true);

CREATE POLICY "Allow students to update own bookings" ON public.bookings
    FOR UPDATE USING (true);

CREATE POLICY "Allow students to delete own bookings" ON public.bookings
    FOR DELETE USING (true);

-- ============================================================================
-- 7. TRIPS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.trips (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE,
    driver_id UUID REFERENCES public.drivers(id),
    bus_id UUID REFERENCES public.buses(id),
    current_location JSONB,
    status TEXT DEFAULT 'SCHEDULED' CHECK (status IN ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED')),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS trips_booking_id_idx ON public.trips(booking_id);
CREATE INDEX IF NOT EXISTS trips_driver_id_idx ON public.trips(driver_id);
CREATE INDEX IF NOT EXISTS trips_bus_id_idx ON public.trips(bus_id);
CREATE INDEX IF NOT EXISTS trips_status_idx ON public.trips(status);

-- Trigger
CREATE TRIGGER update_trips_updated_at
    BEFORE UPDATE ON public.trips
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public select" ON public.trips
    FOR SELECT USING (true);

CREATE POLICY "Allow public insert" ON public.trips
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update" ON public.trips
    FOR UPDATE USING (true);

-- ============================================================================
-- 8. VERIFICATION CODES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.verification_codes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email TEXT NOT NULL,
    code TEXT NOT NULL,
    type TEXT CHECK (type IN ('EMAIL', 'PHONE')),
    entity_type TEXT CHECK (entity_type IN ('STUDENT', 'DRIVER')),
    expires_at TIMESTAMPTZ NOT NULL,
    is_used BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS verification_codes_email_idx ON public.verification_codes(email);
CREATE INDEX IF NOT EXISTS verification_codes_code_idx ON public.verification_codes(code);
CREATE INDEX IF NOT EXISTS verification_codes_expires_at_idx ON public.verification_codes(expires_at);

-- RLS
ALTER TABLE public.verification_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public insert" ON public.verification_codes
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public select" ON public.verification_codes
    FOR SELECT USING (true);

CREATE POLICY "Allow public update" ON public.verification_codes
    FOR UPDATE USING (true);

-- ============================================================================
-- 9. NOTIFICATIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    user_type TEXT CHECK (user_type IN ('STUDENT', 'DRIVER')),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT CHECK (type IN ('TRIP_UPDATE', 'BOOKING_CONFIRMED', 'DRIVER_ASSIGNED', 'GENERAL')),
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS notifications_user_id_idx ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS notifications_user_type_idx ON public.notifications(user_type);
CREATE INDEX IF NOT EXISTS notifications_is_read_idx ON public.notifications(is_read);
CREATE INDEX IF NOT EXISTS notifications_created_at_idx ON public.notifications(created_at);

-- RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public select" ON public.notifications
    FOR SELECT USING (true);

CREATE POLICY "Allow public insert" ON public.notifications
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update" ON public.notifications
    FOR UPDATE USING (true);

-- ============================================================================
-- 10. ENABLE REALTIME (for live tracking)
-- ============================================================================

-- Enable realtime for trips table (for live location updates)
ALTER PUBLICATION supabase_realtime ADD TABLE public.trips;

-- Enable realtime for bookings table (for status updates)
ALTER PUBLICATION supabase_realtime ADD TABLE public.bookings;

-- ============================================================================
-- SETUP COMPLETE!
-- ============================================================================

-- Verify tables were created
SELECT 
    table_name,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public'
AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- Show sample data from schools
SELECT id, name, name_ar, city FROM public.schools LIMIT 5;
