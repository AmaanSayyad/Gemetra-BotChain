/*
  # Diagnostic Check for VAT Refunds
  
  Run this query to check if your database schema is correct for VAT refunds.
  This will help identify why VAT refunds aren't appearing in the admin panel.
*/

-- Check payments table schema
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'payments' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check if employee_id is text (should be text for VAT refunds)
SELECT 
  column_name, 
  data_type
FROM information_schema.columns 
WHERE table_name = 'payments' 
  AND column_name = 'employee_id';
-- Expected: data_type = 'text'

-- Check if user_id is text (should be text for wallet addresses)
SELECT 
  column_name, 
  data_type
FROM information_schema.columns 
WHERE table_name = 'payments' 
  AND column_name = 'user_id';
-- Expected: data_type = 'text' (or 'uuid' if not migrated yet)

-- Check RLS policies for payments table
SELECT 
  policyname, 
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'payments'
ORDER BY policyname;

-- Check if any VAT refunds exist in the database
SELECT 
  COUNT(*) as total_vat_refunds,
  COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
  COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
  COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed
FROM payments 
WHERE employee_id = 'vat-refund';

-- Show sample VAT refund records (if any exist)
SELECT 
  id,
  employee_id,
  user_id,
  amount,
  token,
  status,
  transaction_hash,
  created_at
FROM payments 
WHERE employee_id = 'vat-refund'
ORDER BY created_at DESC
LIMIT 5;
