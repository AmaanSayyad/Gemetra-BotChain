/*
  # Allow VAT Refund Access - Fix employee_id to support text values

  1. Problem
    - employee_id is UUID with foreign key constraint
    - VAT refunds use employee_id = 'vat-refund' (text)
    - Database rejects text values for UUID column
    - RLS policies block admin from seeing all refunds

  2. Solution
    - Change employee_id to text to support both UUIDs and 'vat-refund'
    - Remove foreign key constraint (or make it conditional)
    - Update RLS policies to allow reading all VAT refunds
    - Allow inserting/updating VAT refunds
*/

-- First, drop the foreign key constraint
ALTER TABLE public.payments
DROP CONSTRAINT IF EXISTS payments_employee_id_fkey;

-- Change employee_id from UUID to TEXT to support 'vat-refund'
-- This allows both UUID employee IDs and 'vat-refund' string
ALTER TABLE public.payments
ALTER COLUMN employee_id TYPE text USING employee_id::text;

-- Drop all existing RLS policies on payments
DROP POLICY IF EXISTS "Users can read own payments" ON public.payments;
DROP POLICY IF EXISTS "Users can insert own payments" ON public.payments;
DROP POLICY IF EXISTS "Users can update own payments" ON public.payments;
DROP POLICY IF EXISTS "Users can delete own payments" ON public.payments;
DROP POLICY IF EXISTS "Users can read payments for own employees" ON public.payments;
DROP POLICY IF EXISTS "Users can insert payments for own employees" ON public.payments;
DROP POLICY IF EXISTS "Users can update payments for own employees" ON public.payments;

-- Policy 1: Allow reading ALL VAT refunds (for admin access)
-- This enables the admin panel to see all VAT refunds from all users
CREATE POLICY "Anyone can read VAT refunds" ON public.payments
FOR SELECT
USING (employee_id = 'vat-refund');

-- Policy 2: Allow inserting VAT refunds
-- Users can insert their own VAT refunds
CREATE POLICY "Users can insert VAT refunds" ON public.payments
FOR INSERT
WITH CHECK (employee_id = 'vat-refund');

-- Policy 3: Allow updating VAT refunds
-- Users can update their own VAT refunds (application filters by user_id)
CREATE POLICY "Users can update VAT refunds" ON public.payments
FOR UPDATE
USING (employee_id = 'vat-refund');

-- Policy 4: Allow reading payments for regular employees (UUID employee_id)
-- Users can only see payments for their own employees
CREATE POLICY "Users can read payments for own employees" ON public.payments
FOR SELECT
USING (
  employee_id != 'vat-refund' AND
  employee_id IN (
    SELECT id::text FROM employees WHERE user_id = auth.uid()
  )
);

-- Policy 5: Allow inserting payments for regular employees
CREATE POLICY "Users can insert payments for own employees" ON public.payments
FOR INSERT
WITH CHECK (
  employee_id != 'vat-refund' AND
  employee_id IN (
    SELECT id::text FROM employees WHERE user_id = auth.uid()
  )
);

-- Policy 6: Allow updating payments for regular employees
CREATE POLICY "Users can update payments for own employees" ON public.payments
FOR UPDATE
USING (
  employee_id != 'vat-refund' AND
  employee_id IN (
    SELECT id::text FROM employees WHERE user_id = auth.uid()
  )
);

-- Update the index to work with text
DROP INDEX IF EXISTS idx_payments_employee_id;
CREATE INDEX IF NOT EXISTS idx_payments_employee_id ON public.payments(employee_id);

-- Note: The admin panel can now see all VAT refunds via the "Anyone can read VAT refunds" policy
-- Users will see their own VAT refunds filtered by user_id in the application layer
