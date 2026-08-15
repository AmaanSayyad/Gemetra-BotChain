import { useState, useCallback, useEffect } from 'react';
import { useAccount } from 'wagmi';
import type { ScheduledPayment } from '../lib/supabase';

// Helper function to generate a UUID
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export const useScheduledPayments = () => {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [scheduledPayments, setScheduledPayments] = useState<ScheduledPayment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { address, isConnected } = useAccount();
  
  // Check wallet connection on hook initialization
  useEffect(() => {
    const checkWalletConnection = () => {
      if (isConnected && address) {
        setWalletAddress(address);
      } else {
        setWalletAddress(null);
      }
    };
    checkWalletConnection();
  }, [isConnected, address]);
  
  // Load scheduled payments from localStorage when wallet address changes
  useEffect(() => {
    if (walletAddress) {
      const localStorageKey = `gemetra_scheduled_payments_${walletAddress}`;
      const storedPayments = localStorage.getItem(localStorageKey);
      
      if (storedPayments) {
        try {
          const parsedPayments = JSON.parse(storedPayments);
          setScheduledPayments(parsedPayments);
          console.log('Loaded scheduled payments from localStorage:', parsedPayments.length);
        } catch (parseError) {
          console.error('Error parsing scheduled payments from localStorage:', parseError);
          setScheduledPayments([]);
        }
      } else {
        setScheduledPayments([]);
      }
    } else {
      setScheduledPayments([]);
    }
  }, [walletAddress]);

  const createScheduledPayment = useCallback(async (paymentData: Omit<ScheduledPayment, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'status' | 'processed_count'>) => {
    setLoading(true);
    setError(null);
    
    if (!walletAddress) {
      throw new Error('Wallet not connected');
    }

    try {
      const now = new Date().toISOString();
      const newScheduledPayment: ScheduledPayment = {
        id: generateUUID(),
        user_id: walletAddress,
        status: 'active',
        processed_count: 0,
        ...paymentData,
        created_at: now,
        updated_at: now
      };
      
      setScheduledPayments(prevPayments => {
        const updatedPayments = [newScheduledPayment, ...prevPayments];
        
        // Save to localStorage
        const localStorageKey = `gemetra_scheduled_payments_${walletAddress}`;
        localStorage.setItem(localStorageKey, JSON.stringify(updatedPayments));
        
        console.log(`💾 Added scheduled payment to localStorage:`, newScheduledPayment);
        
        return updatedPayments;
      });
      
      return newScheduledPayment;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create scheduled payment';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [walletAddress]);

  const updateScheduledPayment = useCallback(async (
    id: string,
    updates: Partial<ScheduledPayment>
  ) => {
    setLoading(true);
    setError(null);
    
    if (!walletAddress) {
      throw new Error('Wallet not connected');
    }

    try {
      const updatedPayments = scheduledPayments.map(payment => {
        if (payment.id === id) {
          return {
            ...payment,
            ...updates,
            updated_at: new Date().toISOString()
          };
        }
        return payment;
      });
      
      setScheduledPayments(updatedPayments);
      
      // Save to localStorage
      const localStorageKey = `gemetra_scheduled_payments_${walletAddress}`;
      localStorage.setItem(localStorageKey, JSON.stringify(updatedPayments));
      
      console.log('Updated scheduled payment in localStorage:', id);
      
      return updatedPayments.find(p => p.id === id);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update scheduled payment';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [walletAddress, scheduledPayments]);

  const deleteScheduledPayment = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    
    if (!walletAddress) {
      throw new Error('Wallet not connected');
    }

    try {
      const updatedPayments = scheduledPayments.filter(payment => payment.id !== id);
      setScheduledPayments(updatedPayments);
      
      // Save to localStorage
      const localStorageKey = `gemetra_scheduled_payments_${walletAddress}`;
      localStorage.setItem(localStorageKey, JSON.stringify(updatedPayments));
      
      console.log('Deleted scheduled payment from localStorage:', id);
      
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete scheduled payment';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [walletAddress, scheduledPayments]);

  const getDuePayments = useCallback(() => {
    const now = new Date();
    return scheduledPayments.filter(payment => {
      if (payment.status !== 'active') return false;
      
      const scheduledDate = new Date(payment.scheduled_date);
      
      // Check if payment is due (scheduled date is today or in the past)
      if (scheduledDate <= now) {
        // For recurring payments, check if we've already processed today
        if (payment.schedule_type === 'recurring' && payment.last_processed) {
          const lastProcessed = new Date(payment.last_processed);
          const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          const lastProcessedDate = new Date(lastProcessed.getFullYear(), lastProcessed.getMonth(), lastProcessed.getDate());
          
          // If already processed today, check next payment date
          if (lastProcessedDate.getTime() === today.getTime()) {
            return false;
          }
        }
        
        // Check if recurring payment has an end date
        if (payment.schedule_type === 'recurring' && payment.end_date) {
          const endDate = new Date(payment.end_date);
          if (now > endDate) {
            return false;
          }
        }
        
        return true;
      }
      
      return false;
    });
  }, [scheduledPayments]);

  const getAllScheduledPayments = useCallback(() => {
    return scheduledPayments.sort((a, b) => {
      const dateA = new Date(a.scheduled_date).getTime();
      const dateB = new Date(b.scheduled_date).getTime();
      return dateA - dateB;
    });
  }, [scheduledPayments]);

  return {
    scheduledPayments,
    loading,
    error,
    createScheduledPayment,
    updateScheduledPayment,
    deleteScheduledPayment,
    getDuePayments,
    getAllScheduledPayments,
  };
};
