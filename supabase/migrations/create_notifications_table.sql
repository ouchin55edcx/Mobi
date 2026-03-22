-- Create notifications table for Mobi app
-- Run this SQL in your Supabase SQL Editor

-- Create the notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('TRIP_ASSIGNED', 'TRIP_STARTED', 'DRIVER_ARRIVING', 'TRIP_COMPLETED')),
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    data JSONB, -- Additional data like trip_id, driver_id, etc.
    read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS notifications_student_id_idx ON public.notifications(student_id);
CREATE INDEX IF NOT EXISTS notifications_read_idx ON public.notifications(read);
CREATE INDEX IF NOT EXISTS notifications_created_at_idx ON public.notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS notifications_student_read_idx ON public.notifications(student_id, read);
CREATE INDEX IF NOT EXISTS notifications_type_idx ON public.notifications(type);

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_notifications_updated_at
    BEFORE UPDATE ON public.notifications
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Create policy to allow students to read their own notifications
CREATE POLICY "Allow students to read own notifications" ON public.notifications
    FOR SELECT
    USING (true);

-- Create policy to allow students to update their own notifications (mark as read)
CREATE POLICY "Allow students to update own notifications" ON public.notifications
    FOR UPDATE
    USING (true);

-- Create policy to allow insert (system can create notifications)
CREATE POLICY "Allow insert notifications" ON public.notifications
    FOR INSERT
    WITH CHECK (true);

