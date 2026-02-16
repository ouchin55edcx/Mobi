-- ============================================================================
-- MAKE SCHOOLS TABLE COMPLETELY PUBLIC (NO AUTH REQUIRED)
-- ============================================================================
-- Run this AFTER creating the schools table
-- This ensures anyone can read schools data without authentication
-- ============================================================================

-- Drop existing policies (if any)
DROP POLICY IF EXISTS "Allow public select" ON public.schools;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.schools;

-- Disable RLS temporarily to allow unrestricted access
ALTER TABLE public.schools DISABLE ROW LEVEL SECURITY;

-- OR if you want to keep RLS enabled but allow public access:
-- ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Allow anonymous read access" ON public.schools
--     FOR SELECT USING (true);

-- Verify the change
SELECT 
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'schools';

-- Test query (should work without auth)
SELECT COUNT(*) as total_schools FROM public.schools;
