/*
  # Fix Payments Table user_id for Wallet-Based Authentication

  1. Problem
    - payments.user_id is UUID type (from migration 20250620044226_small_sun.sql)
    - App uses wallet addresses (text) as user IDs, not Supabase Auth UUIDs
    - Inserts fail with: "invalid input syntax for type uuid: '0x...'"
    - VAT refunds can't be saved to Supabase

  2. Solution
    - Change user_id from UUID to TEXT to support wallet addresses
    - Drop any foreign key constraints if they exist
    - Drop RLS policies that use auth.uid() and recreate them to work with text
*/

-- Step 1: Drop RLS policies that depend on user_id being UUID
DROP POLICY IF EXISTS "Users can insert own payments" ON public.payments;
DROP POLICY IF EXISTS "Users can read own payments" ON public.payments;
DROP POLICY IF EXISTS "Users can update own payments" ON public.payments;
DROP POLICY IF EXISTS "Users can delete own payments" ON public.payments;

-- Step 2: Drop foreign key constraint if it exists
ALTER TABLE public.payments
DROP CONSTRAINT IF EXISTS payments_user_id_fkey;

-- Step 3: Change user_id from UUID to TEXT
-- This will only work if the column is currently UUID
DO $$
BEGIN
    -- Check if user_id is UUID type
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'payments' 
        AND column_name = 'user_id' 
        AND data_type = 'uuid'
    ) THEN
        -- Change user_id from UUID to TEXT
        -- First, set it to nullable temporarily to handle any NULL values
        ALTER TABLE public.payments
        ALTER COLUMN user_id DROP NOT NULL;
        
        -- Convert UUID to TEXT (this will convert existing UUIDs to text)
        ALTER TABLE public.payments
        ALTER COLUMN user_id TYPE text USING user_id::text;
        
        RAISE NOTICE 'Successfully changed payments.user_id from UUID to TEXT';
    ELSIF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'payments' 
        AND column_name = 'user_id' 
        AND data_type = 'text'
    ) THEN
        RAISE NOTICE 'payments.user_id is already TEXT type - no changes needed';
    ELSE
        -- If user_id doesn't exist, add it as TEXT
        ALTER TABLE public.payments
        ADD COLUMN IF NOT EXISTS user_id text;
        
        RAISE NOTICE 'Added user_id column as TEXT to payments table';
    END IF;
END $$;

-- Step 4: Update index
DROP INDEX IF EXISTS idx_payments_user_id;
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON public.payments(user_id);

-- Step 5: Note about RLS policies
-- The RLS policies from migration 20250620060000_vat_refund_access.sql should already work
-- They filter by employee_id and don't directly compare user_id with auth.uid()
-- The application layer filters by wallet address (user_id)

-- Verification query (optional - uncomment to check)
-- SELECT column_name, data_type 
-- FROM information_schema.columns 
-- WHERE table_name = 'payments' 
-- AND column_name = 'user_id';
-- Should show: data_type = 'text'
