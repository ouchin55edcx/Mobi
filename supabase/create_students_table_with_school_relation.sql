-- Create students table with school relationship (One-to-Many)
-- Run this SQL in your Supabase SQL Editor
-- IMPORTANT: Run create_schools_table.sql FIRST before running this script

-- Relationship: One School -> Many Students (One-to-Many)
-- Each student belongs to exactly one school
-- One school can have many students

-- Create the students table
CREATE TABLE IF NOT EXISTS public.students (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    fullname TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    cin TEXT NOT NULL UNIQUE,
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE RESTRICT,
    home_location JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    -- Foreign key constraint with explicit name
    CONSTRAINT students_school_id_fkey FOREIGN KEY (school_id) 
        REFERENCES public.schools(id) ON DELETE RESTRICT
);

-- Create index on email for faster lookups
CREATE INDEX IF NOT EXISTS students_email_idx ON public.students(email);

-- Create index on cin for faster lookups
CREATE INDEX IF NOT EXISTS students_cin_idx ON public.students(cin);

-- Create index on school_id for faster lookups and joins (One-to-Many relationship)
CREATE INDEX IF NOT EXISTS students_school_id_idx ON public.students(school_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_students_updated_at
    BEFORE UPDATE ON public.students
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

-- Create policy to allow authenticated users to insert their own records
-- Adjust this policy based on your authentication requirements
CREATE POLICY "Allow public insert" ON public.students
    FOR INSERT
    WITH CHECK (true);

-- Create policy to allow users to read their own records
-- Adjust this policy based on your authentication requirements
CREATE POLICY "Allow public select" ON public.students
    FOR SELECT
    USING (true);

-- Create policy to allow users to update their own records
-- Adjust this policy based on your authentication requirements
CREATE POLICY "Allow public update" ON public.students
    FOR UPDATE
    USING (true);

-- Note: Adjust RLS policies based on your authentication setup
-- If you're using Supabase Auth, you might want to use:
-- USING (auth.uid() = user_id) for user-specific access

