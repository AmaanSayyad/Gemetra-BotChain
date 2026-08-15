/*
  # Add VAT Refund Details to Payments Table

  1. Problem
    - VAT refund form collects extensive user details (passport, flight, merchant info, etc.)
    - Currently only basic payment info is saved (amount, status, transaction hash)
    - Admin panel can't see full user details for verification

  2. Solution
    - Add JSONB column to store all VAT refund details
    - This allows flexible storage of all form fields without schema changes
    - Easy to query and display in admin panel
*/

-- Add JSONB column to store VAT refund details
ALTER TABLE public.payments
ADD COLUMN IF NOT EXISTS vat_refund_details jsonb;

-- Create index on vat_refund_details for faster queries
CREATE INDEX IF NOT EXISTS idx_payments_vat_refund_details 
ON public.payments USING gin (vat_refund_details)
WHERE employee_id = 'vat-refund';

-- Add comment explaining the structure
COMMENT ON COLUMN public.payments.vat_refund_details IS 'JSONB object containing VAT refund form details: vatRegNo, receiptNo, billAmount, vatAmount, passportNo, flightNo, nationality, dob, purchaseDate, merchantName, merchantAddress, receiverWalletAddress';
