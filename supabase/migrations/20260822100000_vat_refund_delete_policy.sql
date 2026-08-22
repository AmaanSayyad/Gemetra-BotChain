-- Allow clearing VAT refund rows from admin (anon + authenticated)
DROP POLICY IF EXISTS "VAT refunds delete anon" ON public.payments;

CREATE POLICY "VAT refunds delete anon"
ON public.payments FOR DELETE TO anon, authenticated
USING (employee_id = 'vat-refund');
