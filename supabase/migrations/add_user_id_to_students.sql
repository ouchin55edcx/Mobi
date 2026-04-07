-- ============================================
-- Migration: Add user_id to students table
-- ============================================
-- This links students to Supabase auth.users
-- ============================================

-- Add user_id column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'students'
        AND column_name = 'user_id'
    ) THEN
        ALTER TABLE public.students
        ADD COLUMN user_id UUID;

        -- Add foreign key constraint
        ALTER TABLE public.students
        ADD CONSTRAINT students_user_id_fkey
        FOREIGN KEY (user_id) REFERENCES auth.users(id);

        -- Create index for performance
        CREATE INDEX IF NOT EXISTS students_user_id_idx ON public.students(user_id);

        RAISE NOTICE 'Added user_id column to students table';
    ELSE
        RAISE NOTICE 'user_id column already exists in students table';
    END IF;
END $$;

-- Make user_id unique (one student per auth user)
ALTER TABLE public.students
ADD CONSTRAINT students_user_id_unique
UNIQUE (user_id);

-- Update existing RLS policies to use user_id
DROP POLICY IF EXISTS "Allow public insert" ON public.students;
DROP POLICY IF EXISTS "Allow public select" ON public.students;
DROP POLICY IF EXISTS "Allow public update" ON public.students;
DROP POLICY IF EXISTS "Allow public delete" ON public.students;
