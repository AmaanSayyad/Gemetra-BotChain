import { sendBulkPayments, type PaymentToken } from '../utils/ethereum';
import { sendPaymentEmail } from '../utils/emailService';
import type { ScheduledPayment } from '../lib/supabase';
import type { Address } from 'viem';

interface ProcessPaymentResult {
  success: boolean;
  txHash?: string;
  error?: string;
}

/**
 * Process a single scheduled payment
 */
export const processScheduledPayment = async (
  scheduledPayment: ScheduledPayment,
  createPayment: (paymentData: any) => Promise<any>
): Promise<ProcessPaymentResult> => {
  try {
    console.log(`🔄 Processing scheduled payment: ${scheduledPayment.id} for ${scheduledPayment.employee_name}`);
    
    // Prepare payment data
    const recipients = [{
      address: scheduledPayment.employee_wallet_address as Address,
      amount: scheduledPayment.amount
    }];
    
    // Send payment
    const result = await sendBulkPayments(
      recipients,
      (scheduledPayment.token?.toUpperCase() === 'SOL' ? 'SOL' : 'PUSD') as PaymentToken
    );
    
    if (result.success && result.txHash) {
      // Find the transaction hash for this employee
      const employeeTxHash = result.txHashes?.find(
        tx => tx.address.toLowerCase() === scheduledPayment.employee_wallet_address.toLowerCase()
      )?.txHash || result.txHash;
      
      // Record payment
      await createPayment({
        employee_id: scheduledPayment.employee_id,
        amount: scheduledPayment.amount,
        token: scheduledPayment.token,
        transaction_hash: employeeTxHash,
        status: 'completed',
        payment_date: new Date().toISOString()
      });
      
      // Send email notification
      try {
        await sendPaymentEmail({
          employeeName: scheduledPayment.employee_name,
          employeeEmail: scheduledPayment.employee_email,
          amount: scheduledPayment.amount,
          token: scheduledPayment.token,
          transactionHash: employeeTxHash,
          companyName: 'Gemetra',
          paymentDate: new Date().toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })
        });
      } catch (emailError) {
        console.error('Failed to send email notification:', emailError);
      }
      
      return {
        success: true,
        txHash: employeeTxHash
      };
    } else {
      return {
        success: false,
        error: result.error || 'Payment failed'
      };
    }
  } catch (error) {
    console.error('Error processing scheduled payment:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

/**
 * Calculate next payment date for recurring payments
 */
export const calculateNextPaymentDate = (
  currentDate: Date,
  recurrence: 'daily' | 'weekly' | 'bi-weekly' | 'monthly'
): Date => {
  const nextDate = new Date(currentDate);
  
  switch (recurrence) {
    case 'daily':
      nextDate.setDate(nextDate.getDate() + 1);
      break;
    case 'weekly':
      nextDate.setDate(nextDate.getDate() + 7);
      break;
    case 'bi-weekly':
      nextDate.setDate(nextDate.getDate() + 14);
      break;
    case 'monthly':
      nextDate.setMonth(nextDate.getMonth() + 1);
      break;
  }
  
  return nextDate;
};

/**
 * Check and process all due scheduled payments
 */
export const processDuePayments = async (
  duePayments: ScheduledPayment[],
  createPayment: (paymentData: any) => Promise<any>,
  updateScheduledPayment: (id: string, updates: Partial<ScheduledPayment>) => Promise<any>
): Promise<{ processed: number; failed: number; results: ProcessPaymentResult[] }> => {
  const results: ProcessPaymentResult[] = [];
  let processed = 0;
  let failed = 0;
  
  for (const payment of duePayments) {
    try {
      const result = await processScheduledPayment(payment, createPayment);
      results.push(result);
      
      if (result.success) {
        processed++;
        
        // Update scheduled payment
        const now = new Date();
        const updates: Partial<ScheduledPayment> = {
          last_processed: now.toISOString(),
          processed_count: (payment.processed_count || 0) + 1
        };
        
        // For recurring payments, calculate next payment date
        if (payment.schedule_type === 'recurring' && payment.recurrence) {
          const nextDate = calculateNextPaymentDate(now, payment.recurrence);
          updates.scheduled_date = nextDate.toISOString();
          updates.next_payment_date = nextDate.toISOString();
          
          // Check if we've reached the end date
          if (payment.end_date) {
            const endDate = new Date(payment.end_date);
            if (nextDate > endDate) {
              updates.status = 'completed';
            }
          }
        } else {
          // One-time payment is now complete
          updates.status = 'completed';
        }
        
        await updateScheduledPayment(payment.id, updates);
      } else {
        failed++;
        // Mark as failed but keep it active for retry
        await updateScheduledPayment(payment.id, {
          status: 'active' // Keep active for retry, or you could add a retry_count
        });
      }
    } catch (error) {
      console.error(`Error processing payment ${payment.id}:`, error);
      failed++;
      results.push({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
  
  return { processed, failed, results };
};
