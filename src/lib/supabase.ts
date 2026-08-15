import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Validate that Supabase credentials are provided
if (!supabaseUrl || !supabaseAnonKey) {
  const errorMessage = 'Missing required Supabase environment variables. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.';
  console.error('❌', errorMessage);
  throw new Error(errorMessage);
}

// Validate URL format
if (!supabaseUrl.startsWith('https://') || !supabaseUrl.includes('.supabase.co')) {
  const errorMessage = 'Invalid Supabase URL format. URL must start with https:// and contain .supabase.co';
  console.error('❌', errorMessage);
  throw new Error(errorMessage);
}

// Validate key format (JWT tokens start with eyJ)
if (!supabaseAnonKey.startsWith('eyJ')) {
  const errorMessage = 'Invalid Supabase anon key format. Key should be a JWT token starting with eyJ';
  console.error('❌', errorMessage);
  throw new Error(errorMessage);
}

console.log('✅ Supabase client initialized with:', {
  url: supabaseUrl,
  keyPrefix: supabaseAnonKey.substring(0, 20) + '...'
});

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database types
export interface User {
  id: string;
  email: string;
  company_name: string;
  created_at: string;
  updated_at: string;
}

export interface Employee {
  id: string;
  user_id: string;
  name: string;
  email: string;
  designation: string;
  department: string;
  salary: number;
  wallet_address: string;
  join_date: string;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

export interface VATRefundDetails {
  vatRegNo?: string;
  receiptNo?: string;
  billAmount?: string;
  vatAmount?: string;
  passportNo?: string;
  flightNo?: string;
  nationality?: string;
  dob?: string;
  purchaseDate?: string;
  merchantName?: string;
  merchantAddress?: string;
  receiverWalletAddress?: string;
}

export interface Payment {
  id: string;
  employee_id: string;
  user_id: string;
  amount: number;
  token: string;
  transaction_hash?: string;
  status: 'pending' | 'completed' | 'failed';
  payment_date: string;
  created_at: string;
  vat_refund_details?: VATRefundDetails; // JSONB field for VAT refund form data
}

// Scheduled Payment Interface
export interface ScheduledPayment {
  id: string;
  user_id: string;
  employee_id: string;
  employee_name: string;
  employee_email: string;
  employee_wallet_address: string;
  amount: number;
  token: string;
  schedule_type: 'one-time' | 'recurring';
  scheduled_date: string; // ISO date string for when payment should be processed
  recurrence?: 'daily' | 'weekly' | 'bi-weekly' | 'monthly'; // For recurring payments
  next_payment_date?: string; // For recurring payments
  end_date?: string; // Optional end date for recurring payments
  status: 'active' | 'paused' | 'completed' | 'cancelled';
  created_at: string;
  vat_refund_details?: VATRefundDetails; // JSONB field for VAT refund form data
  updated_at: string;
  last_processed?: string; // Last time this payment was processed
  processed_count?: number; // Number of times this has been processed
}

// Employee with payment history
export interface EmployeeWithPayments extends Employee {
  payments?: Payment[];
}

// Chat Session Interface
export interface ChatSession {
  id: string;
  user_id: string;
  title: string;
  last_message_content: string | null;
  last_message_timestamp: string | null;
  created_at: string;
  updated_at: string;
}

// Chat Message Interface
export interface ChatMessage {
  id: string;
  session_id: string;
  user_id: string;
  type: 'user' | 'assistant';
  content: string;
  created_at: string;
}

// Notification Interface
export interface Notification {
  id: string;
  user_id: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

// Points System Interfaces
export interface UserPoints {
  id: string;
  user_id: string;
  total_points: number;
  lifetime_points: number;
  created_at: string;
  updated_at: string;
}

export interface PointTransaction {
  id: string;
  user_id: string;
  points: number;
  transaction_type: 'earned' | 'converted' | 'expired';
  source: 'payment' | 'bulk_payment' | 'scheduled_payment' | 'vat_refund' | 'conversion' | 'bonus';
  source_id?: string;
  description?: string;
  created_at: string;
}

export interface PointConversion {
  id: string;
  user_id: string;
  points: number;
  mnee_amount: number;
  conversion_rate: number;
  transaction_hash?: string;
  status: 'pending' | 'completed' | 'failed';
  created_at: string;
  completed_at?: string;
}
