/*
  # Points & Rewards System

  1. New Tables
    - `user_points`
      - `id` (uuid, primary key)
      - `user_id` (text, wallet address)
      - `total_points` (integer, current total points)
      - `lifetime_points` (integer, total points ever earned)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `point_transactions`
      - `id` (uuid, primary key)
      - `user_id` (text, wallet address)
      - `points` (integer, points earned/spent)
      - `transaction_type` (text: 'earned', 'converted', 'expired')
      - `source` (text: 'payment', 'bulk_payment', 'scheduled_payment', 'vat_refund', 'conversion')
      - `source_id` (text, reference to payment/transaction)
      - `description` (text)
      - `created_at` (timestamp)
    
    - `point_conversions`
      - `id` (uuid, primary key)
      - `user_id` (text, wallet address)
      - `points` (integer, points converted)
      - `mnee_amount` (decimal, MNEE tokens received)
      - `conversion_rate` (decimal, points per MNEE)
      - `transaction_hash` (text, optional blockchain tx)
      - `status` (text: 'pending', 'completed', 'failed')
      - `created_at` (timestamp)
      - `completed_at` (timestamp, nullable)

  2. Indexes
    - Index on user_id for fast lookups
    - Index on created_at for transaction history
*/

-- Create user_points table
CREATE TABLE IF NOT EXISTS user_points (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  total_points integer NOT NULL DEFAULT 0,
  lifetime_points integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

-- Create point_transactions table
CREATE TABLE IF NOT EXISTS point_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  points integer NOT NULL,
  transaction_type text NOT NULL CHECK (transaction_type IN ('earned', 'converted', 'expired')),
  source text NOT NULL,
  source_id text,
  description text,
  created_at timestamptz DEFAULT now()
);

-- Create point_conversions table
CREATE TABLE IF NOT EXISTS point_conversions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  points integer NOT NULL,
  mnee_amount decimal(10, 6) NOT NULL,
  conversion_rate decimal(10, 2) NOT NULL,
  transaction_hash text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_points_user_id ON user_points(user_id);
CREATE INDEX IF NOT EXISTS idx_point_transactions_user_id ON point_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_point_transactions_created_at ON point_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_point_conversions_user_id ON point_conversions(user_id);
CREATE INDEX IF NOT EXISTS idx_point_conversions_status ON point_conversions(status);

-- Create updated_at trigger function (if not exists)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for user_points updated_at
CREATE TRIGGER update_user_points_updated_at
  BEFORE UPDATE ON user_points
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
