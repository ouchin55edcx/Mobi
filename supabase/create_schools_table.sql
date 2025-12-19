-- Create schools table for Mobi app
-- Run this SQL in your Supabase SQL Editor

-- Create the schools table
CREATE TABLE IF NOT EXISTS public.schools (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    name_ar TEXT NOT NULL,
    -- Location (VERY IMPORTANT)
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    address TEXT,
    city TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create index on name for faster lookups
CREATE INDEX IF NOT EXISTS schools_name_idx ON public.schools(name);

-- Create index on is_active for filtering active schools
CREATE INDEX IF NOT EXISTS schools_is_active_idx ON public.schools(is_active);

-- Create index on location for geospatial queries
CREATE INDEX IF NOT EXISTS schools_location_idx ON public.schools(latitude, longitude);

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_schools_updated_at
    BEFORE UPDATE ON public.schools
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;

-- Create policy to allow public read access
CREATE POLICY "Allow public select" ON public.schools
    FOR SELECT
    USING (true);

-- Insert mock data with location information
INSERT INTO public.schools (name, name_ar, latitude, longitude, address, city, is_active) VALUES
    ('University of Casablanca', 'جامعة الدار البيضاء', 33.5731, -7.5898, 'Boulevard Mohamed V', 'Casablanca', true),
    ('Mohammed V University', 'جامعة محمد الخامس', 33.9716, -6.8498, 'Avenue des Nations Unies', 'Rabat', true),
    ('Ibn Tofail University', 'جامعة ابن طفيل', 34.0209, -6.8416, 'Route de Kenitra', 'Kenitra', true),
    ('Cadi Ayyad University', 'جامعة القاضي عياض', 31.6295, -7.9811, 'Boulevard Abdelkrim Khattabi', 'Marrakech', true),
    ('Hassan II University', 'جامعة الحسن الثاني', 33.5731, -7.5898, 'Route d''El Jadida', 'Casablanca', true),
    ('Sidi Mohamed Ben Abdellah University', 'جامعة سيدي محمد بن عبد الله', 33.9716, -5.5557, 'Route d''Imouzzer', 'Fes', true),
    ('Ibn Zohr University', 'جامعة ابن زهر', 30.4278, -9.5981, 'Avenue Allal El Fassi', 'Agadir', true),
    ('Abdelmalek Essaâdi University', 'جامعة عبد المالك السعدي', 35.7595, -5.8339, 'Route de Sebta', 'Tetouan', true),
    ('Moulay Ismail University', 'جامعة مولاي إسماعيل', 33.8945, -5.5471, 'Route de Meknes', 'Meknes', true),
    ('Chouaib Doukkali University', 'جامعة شعيب الدكالي', 33.2316, -8.5004, 'Route de Casablanca', 'El Jadida', true)
ON CONFLICT DO NOTHING;

