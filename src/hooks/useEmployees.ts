import { createContext, createElement, useContext, useState, useEffect, type ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import type { Employee, EmployeeWithPayments } from '../lib/supabase';
import { useAccount } from 'wagmi';
import { usePhantomPublicKey } from './usePhantomPublicKey';
import { getConnectedAccount } from '../utils/ethereum';
// Helper function to generate a UUID
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

const EmployeesContext = createContext<ReturnType<typeof useEmployeesState> | null>(null);

/** Single shared employee store for dashboard tabs (overview, employees, payments, settings, AI). */
export function EmployeesProvider({ children }: { children: ReactNode }) {
  const value = useEmployeesState();
  return createElement(EmployeesContext.Provider, { value }, children);
}

export function useEmployees() {
  const ctx = useContext(EmployeesContext);
  if (!ctx) {
    throw new Error('useEmployees must be used within EmployeesProvider (see DashboardLayout).');
  }
  return ctx;
}

function useEmployeesState() {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { address, isConnected } = useAccount();
  const phantomPublicKey = usePhantomPublicKey();

  // Match DashboardLayout session key: EVM (wagmi) when connected, else Solana adapter / legacy injection.
  useEffect(() => {
    const evm = isConnected && address ? address.trim() : '';
    const sol = (phantomPublicKey || getConnectedAccount() || '').trim();
    const next = evm || sol || null;
    setWalletAddress((prev) => (prev === next ? prev : next));
  }, [isConnected, address, phantomPublicKey]);

  const fetchEmployees = async () => {
    if (!walletAddress) {
      setEmployees([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Get employees from localStorage
      const localStorageKey = `gemetra_employees_${walletAddress}`;
      const storedEmployees = localStorage.getItem(localStorageKey);

      if (storedEmployees) {
        try {
          const parsedEmployees = JSON.parse(storedEmployees);
          setEmployees(parsedEmployees);
          console.log('Loaded employees from localStorage:', parsedEmployees.length);
        } catch (parseError) {
          console.error('Error parsing employees from localStorage:', parseError);
          setEmployees([]);
        }
      } else {
        // If no employees in localStorage, try to get from Supabase for backward compatibility
        try {
          const { data, error } = await supabase
            .from('employees')
            .select('*')
            .eq('wallet_address', walletAddress)
            .order('created_at', { ascending: false });

          if (!error && data && data.length > 0) {
            setEmployees(data);
            // Save to localStorage for future use
            localStorage.setItem(localStorageKey, JSON.stringify(data));
          } else {
            const { data: legacyData, error: legacyError } = await supabase
              .from('employees')
              .select('*')
              .eq('user_id', walletAddress)
              .order('created_at', { ascending: false });

            if (!legacyError && legacyData && legacyData.length > 0) {
              setEmployees(legacyData);
              // Save to localStorage for future use
              localStorage.setItem(localStorageKey, JSON.stringify(legacyData));
            } else {
              setEmployees([]);
            }
          }
        } catch (supabaseError) {
          console.error('Error fetching from Supabase:', supabaseError);
          setEmployees([]);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch employees');
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  };

  const addEmployee = async (employeeData: Omit<Employee, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    if (!walletAddress) throw new Error('Wallet not connected');

    try {
      // Check for duplicate email in existing employees
      const existingEmployee = employees.find(
        emp => emp.email.toLowerCase() === employeeData.email.toLowerCase()
      );
      
      if (existingEmployee) {
        const errorMsg = `Employee with email ${employeeData.email} already exists`;
        console.warn(`⚠️ ${errorMsg}`);
        throw new Error(errorMsg);
      }

      // Create a new employee with generated ID and timestamps
      const now = new Date().toISOString();
      const newEmployee: Employee = {
        id: generateUUID(),
        user_id: walletAddress, // Use wallet address as user ID
        ...employeeData,
        created_at: now,
        updated_at: now
      };

      console.log(`✅ Adding employee: ${newEmployee.name} (${newEmployee.email})`);

      // Use functional state update to avoid race conditions with parallel adds
      setEmployees(prevEmployees => {
        // Check for duplicate email in current state
        const existingEmployee = prevEmployees.find(
          emp => emp.email.toLowerCase() === newEmployee.email.toLowerCase()
        );
        
        if (existingEmployee) {
          console.warn(`⚠️ Employee with email ${newEmployee.email} already exists in state`);
          throw new Error(`Employee with email ${newEmployee.email} already exists`);
        }

        const updatedEmployees = [newEmployee, ...prevEmployees];
        
        // Save to localStorage
        const localStorageKey = `gemetra_employees_${walletAddress}`;
        localStorage.setItem(localStorageKey, JSON.stringify(updatedEmployees));
        
        console.log(`✅ Updated employees state: ${updatedEmployees.length} total employees`);
        
        return updatedEmployees;
      });

      // Note: localStorage is now saved inside the state update function

      // Try to also save to Supabase for backward compatibility
      try {
        const { error: supabaseError } = await supabase
          .from('employees')
          .insert([
            {
              ...employeeData,
              id: newEmployee.id,
              user_id: walletAddress,
            },
          ]);
        
        if (supabaseError) {
          console.error('⚠️ Failed to save employee to Supabase (continuing anyway):', supabaseError);
          // Don't throw - localStorage is the primary storage
        } else {
          console.log('✅ Saved employee to Supabase:', newEmployee.name);
        }
      } catch (supabaseError) {
        console.error('⚠️ Supabase error (continuing anyway):', supabaseError);
        // Don't throw - localStorage is the primary storage
      }

      return newEmployee;
    } catch (error) {
      console.error(`❌ Error adding employee ${employeeData.name || employeeData.email}:`, error);
      throw error;
    }
  };

  const updateEmployee = async (id: string, updates: Partial<Employee>) => {
    if (!walletAddress) throw new Error('Wallet not connected');

    try {
      // Find the employee to update
      const employeeToUpdate = employees.find(emp => emp.id === id);
      if (!employeeToUpdate) {
        throw new Error(`Employee with ID ${id} not found`);
      }

      // Create updated employee
      const updatedEmployee = {
        ...employeeToUpdate,
        ...updates,
        updated_at: new Date().toISOString()
      };

      // Update in state
      const updatedEmployees = employees.map(emp => emp.id === id ? updatedEmployee : emp);
      setEmployees(updatedEmployees);

      // Save to localStorage
      const localStorageKey = `gemetra_employees_${walletAddress}`;
      localStorage.setItem(localStorageKey, JSON.stringify(updatedEmployees));

      console.log('Updated employee in localStorage:', updatedEmployee);

      // Try to also update in Supabase for backward compatibility
      try {
        await supabase
          .from('employees')
          .update({
            ...updates,
            updated_at: updatedEmployee.updated_at
          })
          .eq('id', id);
      } catch (supabaseError) {
        console.error('Failed to update employee in Supabase (continuing anyway):', supabaseError);
      }

      return updatedEmployee;
    } catch (error) {
      console.error('Error updating employee:', error);
      throw error;
    }
  };

  const deleteEmployee = async (id: string) => {
    if (!walletAddress) throw new Error('Wallet not connected');

    try {
      // Update state by filtering out the employee
      const updatedEmployees = employees.filter(emp => emp.id !== id);
      setEmployees(updatedEmployees);

      // Save to localStorage
      const localStorageKey = `gemetra_employees_${walletAddress}`;
      localStorage.setItem(localStorageKey, JSON.stringify(updatedEmployees));

      console.log('Deleted employee from localStorage, ID:', id);

      // Try to also delete from Supabase for backward compatibility
      try {
        await supabase
          .from('employees')
          .delete()
          .eq('id', id);
      } catch (supabaseError) {
        console.error('Failed to delete employee from Supabase (continuing anyway):', supabaseError);
      }
    } catch (error) {
      console.error('Error deleting employee:', error);
      throw error;
    }
  };

  const getEmployeeWithPayments = async (id: string): Promise<EmployeeWithPayments | null> => {
    if (!walletAddress) throw new Error('Wallet not connected');

    try {
      // Find employee in local state
      const employee = employees.find(emp => emp.id === id);
      if (!employee) {
        throw new Error(`Employee with ID ${id} not found`);
      }

      // For payments, we'll still try to get from Supabase if possible
      let payments: any[] = [];

      try {
        const { data: paymentsData, error: payError } = await supabase
          .from('payments')
          .select('*')
          .eq('employee_id', id)
          .order('payment_date', { ascending: false });

        if (!payError && paymentsData) {
          payments = paymentsData;
        }
      } catch (error) {
        console.error('Error fetching payments (continuing with empty payments):', error);
      }

      return {
        ...employee,
        payments: payments || [],
      };
    } catch (error) {
      console.error('Error getting employee with payments:', error);
      throw error;
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, [walletAddress]);

  return {
    employees,
    loading,
    error,
    addEmployee,
    updateEmployee,
    deleteEmployee,
    getEmployeeWithPayments,
    refetch: fetchEmployees,
  };
};