import React, { useState, useEffect } from 'react';
import { ArrowLeft, User, Building, Save, Edit3, Check, X, Download, Wallet, Copy, Bell, Globe, Shield, Play, ExternalLink } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAccount, useChainId } from 'wagmi';
import { supabase } from '../lib/supabase';
import { formatAddress } from '../utils/ethereum';
import { BOT_CHAIN_ID, BOT_CHAIN_LABEL } from '../config/botchain';
import { useEmployees } from '../hooks/useEmployees';
import { usePayments } from '../hooks/usePayments';

interface SettingsPageProps {
  onBack: () => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ onBack }) => {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { employees } = useEmployees();
  const { getAllPayments } = usePayments();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [companyName, setCompanyName] = useState(() => {
    if (address) {
      return localStorage.getItem(`gemetra_company_name_${address}`) || 'My Company';
    }
    return 'My Company';
  });
  const [editForm, setEditForm] = useState({
    company_name: companyName,
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [notificationsEnabled, setNotificationsEnabled] = useState(() => {
    return localStorage.getItem('gemetra_notifications_enabled') !== 'false';
  });

  // Load company name from localStorage when wallet address changes
  useEffect(() => {
    if (address) {
      const saved = localStorage.getItem(`gemetra_company_name_${address}`);
      if (saved) {
        setCompanyName(saved);
        setEditForm({ company_name: saved });
      }
    }
  }, [address]);

  // Sync editForm when companyName changes
  useEffect(() => {
    setEditForm({ company_name: companyName });
  }, [companyName]);

  const handleEditToggle = () => {
    if (isEditing) {
      // Cancel editing - reset form
      setEditForm({
        company_name: userProfile.company_name,
      });
      setError('');
      setSuccess('');
    }
    setIsEditing(!isEditing);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setEditForm(prev => ({ ...prev, [name]: value }));
    if (error) setError('');
    if (success) setSuccess('');
  };

  const handleSave = async () => {
    if (!address) {
      setError('Wallet not connected');
      return;
    }

    if (!editForm.company_name.trim()) {
      setError('Company name is required');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const newName = editForm.company_name.trim();
      
      // Save to localStorage
      localStorage.setItem(`gemetra_company_name_${address}`, newName);
      setCompanyName(newName);

      setIsEditing(false);
      setSuccess('Company name updated successfully');
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Failed to update company name:', err);
      setError('Failed to update settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleCopyAddress = async () => {
    if (address) {
      try {
        await navigator.clipboard.writeText(address);
        setCopiedAddress(true);
        setTimeout(() => setCopiedAddress(false), 2000);
      } catch (error) {
        console.error('Failed to copy address:', error);
      }
    }
  };

  const handleToggleNotifications = () => {
    const newValue = !notificationsEnabled;
    setNotificationsEnabled(newValue);
    localStorage.setItem('gemetra_notifications_enabled', String(newValue));
    setSuccess(newValue ? 'Notifications enabled' : 'Notifications disabled');
    setTimeout(() => setSuccess(''), 3000);
  };

  const handleExportData = async () => {
    if (!address) {
      setError('Wallet not connected');
      return;
    }

    setExporting(true);
    setError('');

    try {
      // Fetch all user data based on wallet address
      const allPayments = await getAllPayments();
      
      // Get employees from hook
      const userEmployees = employees || [];

      const exportData = {
        exportInfo: {
          exportDate: new Date().toISOString(),
          exportedBy: address,
          walletAddress: address,
          dataVersion: '1.0',
          network: chainId === BOT_CHAIN_ID ? BOT_CHAIN_LABEL : `Chain ${chainId}`
        },
        companyInfo: {
          companyName: companyName,
          walletAddress: address,
        },
        employees: userEmployees.map(emp => ({
          id: emp.id,
          name: emp.name,
          email: emp.email,
          designation: emp.designation,
          department: emp.department,
          salary: emp.salary,
          wallet_address: emp.wallet_address,
          join_date: emp.join_date,
          status: emp.status,
          created_at: emp.created_at
        })),
        payments: allPayments.map(payment => ({
          id: payment.id,
          employee_id: payment.employee_id,
          amount: payment.amount,
          token: payment.token,
          transaction_hash: payment.transaction_hash,
          status: payment.status,
          payment_date: payment.payment_date,
          created_at: payment.created_at
        })),
        summary: {
          totalEmployees: userEmployees.length,
          totalPayments: allPayments.length,
          totalPaid: allPayments.filter(p => p.status === 'completed').reduce((sum, p) => sum + p.amount, 0),
          pendingPayments: allPayments.filter(p => p.status === 'pending').length
        }
      };

      // Generate JSON file
      const jsonBlob = new Blob([JSON.stringify(exportData, null, 2)], { 
        type: 'application/json' 
      });
      const jsonUrl = URL.createObjectURL(jsonBlob);
      const jsonLink = document.createElement('a');
      jsonLink.href = jsonUrl;
      jsonLink.download = `gemetra-data-export-${address?.slice(0, 8)}-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(jsonLink);
      jsonLink.click();
      document.body.removeChild(jsonLink);
      URL.revokeObjectURL(jsonUrl);

      // Generate CSV for employees if any exist
      if (exportData.employees.length > 0) {
        const employeeHeaders = ['Name', 'Email', 'Designation', 'Department', 'Salary', 'Wallet Address', 'Join Date', 'Status', 'Created At'];
        const employeeRows = exportData.employees.map(emp => [
          emp.name,
          emp.email,
          emp.designation,
          emp.department,
          emp.salary,
          emp.wallet_address,
          emp.join_date,
          emp.status,
          emp.created_at
        ]);
        
        const employeeCsv = [employeeHeaders, ...employeeRows]
          .map(row => row.map(field => `"${field}"`).join(','))
          .join('\n');
        
        const csvBlob = new Blob([employeeCsv], { type: 'text/csv' });
        const csvUrl = URL.createObjectURL(csvBlob);
        const csvLink = document.createElement('a');
        csvLink.href = csvUrl;
        csvLink.download = `gemetra-employees-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(csvLink);
        csvLink.click();
        document.body.removeChild(csvLink);
        URL.revokeObjectURL(csvUrl);
      }

      setSuccess('Data exported successfully! Check your downloads folder.');
      setTimeout(() => setSuccess(''), 5000);

    } catch (err) {
      console.error('Failed to export data:', err);
      setError('Failed to export data. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  if (!isConnected || !address) {
    return (
      <div className="min-h-screen bg-white min-w-0">
        <div className="w-full min-w-0 max-w-4xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-8">
          <div className="text-center py-8 sm:py-12">
            <Wallet className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Wallet Not Connected</h2>
            <p className="text-gray-600">Please connect your wallet to access settings.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white min-w-0">
      <div className="w-full min-w-0 max-w-4xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 sm:mb-8 space-y-4 sm:space-y-0">
          <div className="flex flex-col sm:flex-row sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
            <button
              onClick={onBack}
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors self-start"
            >
              <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="text-sm sm:text-base">Back to Dashboard</span>
            </button>
            <div className="hidden sm:block w-px h-6 bg-gray-300"></div>
          </div>
          
          <div className="flex items-center space-x-2">
            {!isEditing ? (
              <button
                onClick={handleEditToggle}
                className="flex items-center space-x-2 bg-gray-100 hover:bg-gray-200 text-gray-700 hover:text-gray-900 px-3 py-2 sm:px-4 sm:py-2 rounded-lg transition-all duration-200 text-sm sm:text-base"
              >
                <Edit3 className="w-3 h-3 sm:w-4 sm:h-4" />
                <span>Edit</span>
              </button>
            ) : (
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleEditToggle}
                  className="flex items-center space-x-2 bg-gray-100 hover:bg-gray-200 text-gray-700 hover:text-gray-900 px-3 py-2 sm:px-4 sm:py-2 rounded-lg transition-all duration-200 text-sm sm:text-base"
                >
                  <X className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span>Cancel</span>
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center space-x-2 btn-primary disabled:opacity-50 disabled:cursor-not-allowed px-3 py-2 sm:px-4 sm:py-2 text-sm sm:text-base"
                >
                  {saving ? (
                    <>
                      <div className="w-3 h-3 sm:w-4 sm:h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-3 h-3 sm:w-4 sm:h-4" />
                      <span>Save Changes</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Status Messages */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 sm:mb-6 p-3 sm:p-4 bg-red-50 border border-red-200 rounded-lg"
          >
            <div className="text-red-800 text-xs sm:text-sm">{error}</div>
          </motion.div>
        )}

        {success && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 sm:mb-6 p-3 sm:p-4 bg-green-50 border border-green-200 rounded-lg"
          >
            <div className="flex items-center space-x-2">
              <Check className="w-3 h-3 sm:w-4 sm:h-4 text-green-600" />
              <div className="text-green-800 text-xs sm:text-sm">{success}</div>
            </div>
          </motion.div>
        )}

        {/* Settings Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-8">
          {/* Account Information */}
          <div className="lg:col-span-2">
            <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6 shadow-sm">
              <div className="flex items-center space-x-2 sm:space-x-3 mb-4 sm:mb-6">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-black rounded-lg flex items-center justify-center">
                  <Building className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-base sm:text-xl font-semibold text-gray-900">Company Information</h2>
                  <p className="text-xs sm:text-sm text-gray-600">Manage your company details</p>
                </div>
              </div>

              <div className="space-y-4 sm:space-y-6">
                {/* Company Name */}
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                    Company Name
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      name="company_name"
                      value={editForm.company_name}
                      onChange={handleInputChange}
                      placeholder="Enter your company name"
                      className="bg-gray-100 border border-gray-300 text-gray-900 rounded-lg px-3 py-2 sm:px-4 sm:py-3 w-full focus:ring-2 focus:ring-black focus:border-transparent transition-all duration-200 text-sm sm:text-base"
                      maxLength={50}
                    />
                  ) : (
                    <div className="bg-gray-100 border border-gray-300 rounded-lg px-3 py-2 sm:px-4 sm:py-3 text-gray-900 text-sm sm:text-base">
                      {companyName || 'My Company'}
                    </div>
                  )}
                </div>

                {/* Wallet Address */}
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                    Wallet Address
                  </label>
                  <div className="bg-gray-100 border border-gray-300 rounded-lg px-3 py-2 sm:px-4 sm:py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <Wallet className="w-4 h-4 text-gray-500 flex-shrink-0" />
                      <span className="text-gray-900 font-mono text-xs sm:text-sm truncate">{address}</span>
                    </div>
                    <button
                      onClick={handleCopyAddress}
                      className="ml-2 p-1.5 hover:bg-gray-200 rounded transition-colors flex-shrink-0"
                      title="Copy address"
                    >
                      {copiedAddress ? (
                        <Check className="w-4 h-4 text-green-600" />
                      ) : (
                        <Copy className="w-4 h-4 text-gray-500" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Network */}
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                    Network
                  </label>
                  <div className="bg-gray-100 border border-gray-300 rounded-lg px-3 py-2 sm:px-4 sm:py-3 flex items-center gap-2">
                    <Globe className="w-4 h-4 text-gray-500" />
                    <span className="text-gray-900 text-sm sm:text-base">
                      {chainId === BOT_CHAIN_ID ? BOT_CHAIN_LABEL : `Chain ${chainId}`}
                    </span>
                    {chainId === BOT_CHAIN_ID && (
                      <span className="ml-auto px-2 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded">
                        Production
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Profile Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6 shadow-sm">
              <div className="flex items-center space-x-2 sm:space-x-3 mb-4 sm:mb-6">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-black rounded-lg flex items-center justify-center">
                  <User className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-base sm:text-xl font-semibold text-gray-900">Profile Summary</h2>
                  <p className="text-xs sm:text-sm text-gray-600">Your account overview</p>
                </div>
              </div>

              <div className="space-y-3 sm:space-y-4">
                {/* Profile Avatar */}
                <div className="text-center">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden border-2 border-gray-200 mx-auto mb-2 sm:mb-3">
                    <img
                      src={`https://noun.pics/${address ? parseInt(address.slice(2, 10), 16) % 1000 : 1}.svg`}
                      alt="Profile"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/pixel-art/svg?seed=${address || 'default'}`;
                      }}
                    />
                  </div>
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900">
                    {companyName || 'My Company'}
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-600 font-mono">{formatAddress(address || '')}</p>
                </div>

                {/* Quick Stats */}
                <div className="border-t border-gray-200 pt-3 sm:pt-4">
                  <div className="space-y-2 sm:space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600 text-xs sm:text-sm">Network</span>
                      <span className="text-gray-900 text-xs sm:text-sm font-medium">
                        {chainId === BOT_CHAIN_ID ? BOT_CHAIN_LABEL : `Chain ${chainId}`}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600 text-xs sm:text-sm">Status</span>
                      <span className="text-green-600 text-xs sm:text-sm font-medium">Connected</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600 text-xs sm:text-sm">Employees</span>
                      <span className="text-gray-900 text-xs sm:text-sm font-medium">{employees.length}</span>
                    </div>
                  </div>
                </div>

                {/* Preferences */}
                <div className="border-t border-gray-200 pt-3 sm:pt-4">
                  <div className="space-y-2 sm:space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Bell className="w-4 h-4 text-gray-500" />
                        <span className="text-gray-700 text-xs sm:text-sm">Notifications</span>
                      </div>
                      <button
                        onClick={handleToggleNotifications}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                          notificationsEnabled ? 'bg-blue-600' : 'bg-gray-300'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            notificationsEnabled ? 'translate-x-5' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Account Actions */}
                <div className="border-t border-gray-200 pt-3 sm:pt-4">
                  <div className="space-y-1 sm:space-y-2">
                    <button 
                      onClick={handleExportData}
                      disabled={exporting}
                      className="w-full flex items-center space-x-2 px-2 py-2 sm:px-3 sm:py-2 text-xs sm:text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {exporting ? (
                        <>
                          <div className="w-3 h-3 sm:w-4 sm:h-4 border-2 border-gray-600 border-t-transparent rounded-full animate-spin"></div>
                          <span>Exporting...</span>
                        </>
                      ) : (
                        <>
                          <Download className="w-3 h-3 sm:w-4 sm:h-4" />
                          <span>Export All Data</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Help & Resources */}
                <div className="border-t border-gray-200 pt-3 sm:pt-4">
                  <h4 className="text-xs sm:text-sm font-semibold text-gray-900 mb-2 sm:mb-3">Help & Resources</h4>
                  <div className="space-y-1 sm:space-y-2">
                    <a
                      href="https://youtu.be/U1QJ2HDRRQE"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full flex items-center space-x-2 px-2 py-2 sm:px-3 sm:py-2 text-xs sm:text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <Play className="w-3 h-3 sm:w-4 sm:h-4" />
                      <span>Watch Demo Video</span>
                      <ExternalLink className="w-3 h-3 sm:w-4 sm:h-4 ml-auto" />
                    </a>
                    <a
                      href="https://docs.google.com/presentation/d/1QxKpMPxLiS-bpKkow8S5PApxNrgUUppg64oxbx-tU28/edit?usp=sharing"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full flex items-center space-x-2 px-2 py-2 sm:px-3 sm:py-2 text-xs sm:text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <Globe className="w-3 h-3 sm:w-4 sm:h-4" />
                      <span>Pitch Deck</span>
                      <ExternalLink className="w-3 h-3 sm:w-4 sm:h-4 ml-auto" />
                    </a>
                  </div>
                </div>
              </div>
            </div>

            {/* Security Notice */}
            <div className="mt-4 sm:mt-6 p-3 sm:p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start gap-2">
                <Shield className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="text-blue-800 font-medium text-xs sm:text-sm mb-1">Security & Privacy</div>
                  <div className="text-blue-700 text-xs">
                    Your wallet data is stored locally. All transactions are on-chain and transparent. We never store your private keys.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};