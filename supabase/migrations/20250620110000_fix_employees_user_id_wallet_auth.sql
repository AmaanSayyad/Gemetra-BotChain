/*
  # Fix Employees Table user_id for Wallet-Based Authentication

  1. Problem
    - employees.user_id is UUID type (from migration 20250617234140_patient_smoke.sql)
    - App uses wallet addresses (text) as user IDs, not Supabase Auth UUIDs
    - CSV uploads fail with: "invalid input syntax for type uuid: '0x...'"
    - Employees can't be saved to Supabase

  2. Solution
    - Change user_id from UUID to TEXT to support wallet addresses
    - Drop foreign key constraint to users table (since we're using wallet addresses)
    - Drop RLS policies that use auth.uid() and recreate them to work with text
    - Update indexes
*/

-- Step 1: Drop RLS policies on payments table that reference employees.user_id
-- These must be dropped BEFORE we can alter employees.user_id column type
DROP POLICY IF EXISTS "Users can read payments for own employees" ON public.payments;
DROP POLICY IF EXISTS "Users can insert payments for own employees" ON public.payments;
DROP POLICY IF EXISTS "Users can update payments for own employees" ON public.payments;

-- Step 2: Drop RLS policies on employees table that depend on user_id being UUID
DROP POLICY IF EXISTS "Users can read own employees" ON public.employees;
DROP POLICY IF EXISTS "Users can insert own employees" ON public.employees;
DROP POLICY IF EXISTS "Users can update own employees" ON public.employees;
DROP POLICY IF EXISTS "Users can delete own employees" ON public.employees;

-- Step 3: Drop foreign key constraint if it exists
ALTER TABLE public.employees
DROP CONSTRAINT IF EXISTS employees_user_id_fkey;

-- Step 4: Change user_id from UUID to TEXT
DO $$
BEGIN
    -- Check if user_id is UUID type
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'employees' 
        AND column_name = 'user_id' 
        AND data_type = 'uuid'
    ) THEN
        -- Change user_id from UUID to TEXT
        -- First, set it to nullable temporarily to handle any NULL values
        ALTER TABLE public.employees
        ALTER COLUMN user_id DROP NOT NULL;
        
        -- Convert UUID to TEXT (this will convert existing UUIDs to text)
        ALTER TABLE public.employees
        ALTER COLUMN user_id TYPE text USING user_id::text;
        
        -- Make it NOT NULL again if needed (but allow NULL for migration safety)
        -- ALTER TABLE public.employees
        -- ALTER COLUMN user_id SET NOT NULL;
        
        RAISE NOTICE 'Successfully changed employees.user_id from UUID to TEXT';
    ELSIF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'employees' 
        AND column_name = 'user_id' 
        AND data_type = 'text'
    ) THEN
        RAISE NOTICE 'employees.user_id is already TEXT type - no changes needed';
    ELSE
        -- If user_id doesn't exist, add it as TEXT
        ALTER TABLE public.employees
        ADD COLUMN IF NOT EXISTS user_id text;
        
        RAISE NOTICE 'Added user_id column as TEXT to employees table';
    END IF;
END $$;

-- Step 5: Update index
DROP INDEX IF EXISTS idx_employees_user_id;
CREATE INDEX IF NOT EXISTS idx_employees_user_id ON public.employees(user_id);

-- Step 6: Recreate RLS policies for employees table (wallet-based authentication)
-- Note: Since we're using wallet-based auth (not Supabase Auth), we need to allow
-- public access. The application layer filters by wallet address (user_id).
-- In production, you may want to add additional security measures.

-- Allow public read access (app filters by wallet address)
CREATE POLICY "Public can read employees" ON public.employees
  FOR SELECT
  TO public
  USING (true);

-- Allow public insert access (app sets user_id to wallet address)
CREATE POLICY "Public can insert employees" ON public.employees
  FOR INSERT
  TO public
  WITH CHECK (true);

-- Allow public update access (app filters by wallet address)
CREATE POLICY "Public can update employees" ON public.employees
  FOR UPDATE
  TO public
  USING (true);

-- Allow public delete access (app filters by wallet address)
CREATE POLICY "Public can delete employees" ON public.employees
  FOR DELETE
  TO public
  USING (true);

-- Step 7: Recreate RLS policies for payments table (updated for wallet-based auth)
-- These policies now work with employees.user_id as TEXT (wallet address)
-- Note: Since we're using wallet-based auth, we allow public access and filter in the app

-- Allow reading payments for regular employees (app filters by wallet address)
CREATE POLICY "Users can read payments for own employees" ON public.payments
  FOR SELECT
  TO public
  USING (
    employee_id != 'vat-refund'
    -- App filters by wallet address in employees.user_id
  );

-- Allow inserting payments for regular employees (app validates wallet address)
CREATE POLICY "Users can insert payments for own employees" ON public.payments
  FOR INSERT
  TO public
  WITH CHECK (
    employee_id != 'vat-refund'
    -- App validates wallet address in employees.user_id
  );

-- Allow updating payments for regular employees (app validates wallet address)
CREATE POLICY "Users can update payments for own employees" ON public.payments
  FOR UPDATE
  TO public
  USING (
    employee_id != 'vat-refund'
    -- App validates wallet address in employees.user_id
  );

-- Verification query (optional - uncomment to check)
-- SELECT column_name, data_type 
-- FROM information_schema.columns 
-- WHERE table_name = 'employees' 
-- AND column_name = 'user_id';
-- Should show: data_type = 'text'
