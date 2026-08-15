/*
  # Create/Fix Notifications Table for Wallet-Based Authentication

  1. Problem
    - notifications table may not exist yet
    - If it exists, it uses user_id uuid that references users table
    - App uses wallet addresses (text) as user IDs, not Supabase Auth UUIDs
    - RLS policies use auth.uid() which doesn't work with wallet-based auth
    - Notifications won't work with wallet addresses

  2. Solution
    - Create notifications table if it doesn't exist (with text user_id)
    - If it exists, change user_id from uuid to text to support wallet addresses
    - Remove foreign key constraint to users table
    - Update RLS policies to allow wallet-based access
*/

-- Create notifications table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.notifications (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id text NOT NULL, -- Use text for wallet addresses
    message text NOT NULL,
    is_read boolean DEFAULT FALSE,
    created_at timestamp with time zone DEFAULT now()
);

-- Enable Row Level Security (RLS) for the notifications table
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- IMPORTANT: Drop all existing RLS policies FIRST before altering column type
-- Policies must be dropped before we can change the column type
DROP POLICY IF EXISTS "Users can read their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can insert their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can delete their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Anyone can read notifications" ON public.notifications;
DROP POLICY IF EXISTS "Anyone can insert notifications" ON public.notifications;
DROP POLICY IF EXISTS "Anyone can update notifications" ON public.notifications;
DROP POLICY IF EXISTS "Anyone can delete notifications" ON public.notifications;

-- Drop foreign key constraint if it exists (in case table was created with UUID user_id)
ALTER TABLE public.notifications
DROP CONSTRAINT IF EXISTS notifications_user_id_fkey;

-- Change user_id from UUID to TEXT if it's currently UUID
-- This will only run if the column is UUID type
-- NOTE: Policies must be dropped first (done above)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'notifications' 
        AND column_name = 'user_id' 
        AND data_type = 'uuid'
    ) THEN
        ALTER TABLE public.notifications
        ALTER COLUMN user_id TYPE text USING user_id::text;
    END IF;
END $$;

-- New RLS policies for wallet-based authentication
-- Allow reading notifications for wallet address (application will filter by wallet)
CREATE POLICY "Anyone can read notifications" ON public.notifications
FOR SELECT
USING (true); -- Application filters by wallet address

-- Allow inserting notifications (application validates wallet)
CREATE POLICY "Anyone can insert notifications" ON public.notifications
FOR INSERT
WITH CHECK (true); -- Application validates wallet address

-- Allow updating notifications (application validates wallet)
CREATE POLICY "Anyone can update notifications" ON public.notifications
FOR UPDATE
USING (true); -- Application validates wallet address

-- Allow deleting notifications (application validates wallet)
CREATE POLICY "Anyone can delete notifications" ON public.notifications
FOR DELETE
USING (true); -- Application validates wallet address

-- Update the index to work with text
DROP INDEX IF EXISTS idx_notifications_user_id;
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);

-- Create index on created_at for ordering
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);

-- Note: The application layer (useNotifications hook) filters by wallet address
-- RLS policies allow access, but the app ensures users only see their own notifications
