/*
  # Ensure VAT refund rows work with the Supabase anon key (browser client)

  The app uses wallet addresses as `user_id` without Supabase Auth, so inserts run as `anon`.
  Recreate permissive VAT policies explicitly for `anon` and `authenticated` so INSERT/SELECT/UPDATE
  for `employee_id = 'vat-refund'` succeeds when earlier migrations omitted role targets.

  Safe to apply multiple times (drops policies by stable names first).
*/

DROP POLICY IF EXISTS "Anyone can read VAT refunds" ON public.payments;
DROP POLICY IF EXISTS "Users can insert VAT refunds" ON public.payments;
DROP POLICY IF EXISTS "Users can update VAT refunds" ON public.payments;

-- Match existing naming style for admins / debugging
DROP POLICY IF EXISTS "VAT refunds select anon" ON public.payments;
DROP POLICY IF EXISTS "VAT refunds insert anon" ON public.payments;
DROP POLICY IF EXISTS "VAT refunds update anon" ON public.payments;

CREATE POLICY "VAT refunds select anon"
ON public.payments FOR SELECT TO anon, authenticated
USING (employee_id = 'vat-refund');

CREATE POLICY "VAT refunds insert anon"
ON public.payments FOR INSERT TO anon, authenticated
WITH CHECK (employee_id = 'vat-refund');

CREATE POLICY "VAT refunds update anon"
ON public.payments FOR UPDATE TO anon, authenticated
USING (employee_id = 'vat-refund')
WITH CHECK (employee_id = 'vat-refund');
