-- Migration: Update students table to use school_id foreign key (One-to-Many Relationship)
-- Run this SQL in your Supabase SQL Editor AFTER creating the schools table
-- WARNING: This migration will drop existing school data if students already exist
-- Make sure to backup your data before running this migration

-- Relationship: One School -> Many Students (One-to-Many)
-- Each student belongs to exactly one school
-- One school can have many students

-- Step 1: Make school column nullable to allow transition period
-- This allows inserts with only school_id while we migrate
ALTER TABLE public.students 
ALTER COLUMN school DROP NOT NULL;

-- Step 2: Add new school_id column (nullable initially for data migration)
ALTER TABLE public.students 
ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES public.schools(id) ON DELETE RESTRICT;

-- Step 3: If you have existing data, you need to map old school TEXT values to school_id
-- This is a sample migration - adjust based on your existing data
-- Example: Map school names to school IDs (uncomment and modify as needed)
/*
UPDATE public.students s
SET school_id = (
    SELECT id FROM public.schools 
    WHERE name = s.school OR name_ar = s.school 
    LIMIT 1
)
WHERE school_id IS NULL AND school IS NOT NULL;
*/

-- Step 4: Make school_id NOT NULL (only after data migration is complete)
-- Uncomment the line below after verifying your data migration
-- ALTER TABLE public.students ALTER COLUMN school_id SET NOT NULL;

-- Step 5: Create index on school_id for faster lookups and joins
CREATE INDEX IF NOT EXISTS students_school_id_idx ON public.students(school_id);

-- Step 6: Drop old school TEXT column and index (only after verifying school_id is populated)
-- Uncomment the lines below after verifying your data migration
-- DROP INDEX IF EXISTS public.students_school_idx;
-- ALTER TABLE public.students DROP COLUMN IF EXISTS school;

-- Step 7: Add foreign key constraint name for better management (optional)
-- This helps with constraint management and documentation
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'students_school_id_fkey'
    ) THEN
        ALTER TABLE public.students
        ADD CONSTRAINT students_school_id_fkey 
        FOREIGN KEY (school_id) 
        REFERENCES public.schools(id) 
        ON DELETE RESTRICT;
    END IF;
END $$;

