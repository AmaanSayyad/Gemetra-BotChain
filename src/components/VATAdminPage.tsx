import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, CheckCircle, Clock, AlertCircle, Search, Download, ExternalLink, FileText, User, Calendar, DollarSign } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Payment } from '../lib/supabase';
import { getVatRefundPaymentsFromBrowserLocalStorage } from '../utils/browserStoredPayments';
import { TOKEN_LOGOS, tokenLogoSrc } from '../constants/tokenLogos';
import { explorerTxUrl } from '../config/botchain';

function vatAdminTokenIconSrc(token: string | undefined): string {
  return tokenLogoSrc(token) ?? TOKEN_LOGOS.USDT;
}

interface VATRefundAdmin {
  id: string;
  user_id: string;
  amount: number;
  token: string;
  status: 'pending' | 'completed' | 'failed';
  transaction_hash?: string;
  payment_date: string;
  created_at: string;
  vat_refund_details?: {
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
  };
}

function paymentToVatRefundAdmin(payment: Payment): VATRefundAdmin {
  return {
    id: payment.id,
    user_id: payment.user_id,
    amount: payment.amount,
    token: payment.token || 'USDT',
    status: payment.status,
    transaction_hash: payment.transaction_hash,
    payment_date: payment.payment_date,
    created_at: payment.created_at,
    vat_refund_details: payment.vat_refund_details,
  };
}

/** Prefer Supabase row when id exists remotely; attach local-only rows (same buckets as VAT Refund History). */
function mergeRemoteAndLocalVatRows(
  remote: VATRefundAdmin[],
  local: VATRefundAdmin[],
): VATRefundAdmin[] {
  const byId = new Map<string, VATRefundAdmin>();
  for (const r of remote) byId.set(r.id, r);
  for (const r of local) {
    if (!byId.has(r.id)) byId.set(r.id, r);
  }
  return [...byId.values()].sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
}

export const VATAdminPage: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [blendNotice, setBlendNotice] = useState<{
    text: string;
    tone: 'warning' | 'info';
  } | null>(null);
  const [refunds, setRefunds] = useState<VATRefundAdmin[]>([]);
  const [filteredRefunds, setFilteredRefunds] = useState<VATRefundAdmin[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'pending' | 'failed'>('all');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');
  const [stats, setStats] = useState({
    totalRefunds: 0,
    totalAmount: 0,
    completedRefunds: 0,
    pendingRefunds: 0,
    failedRefunds: 0,
  });
  const [selectedRefund, setSelectedRefund] = useState<VATRefundAdmin | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  // Supabase + same localStorage buckets the VAT Refund "History" tab uses (fixes empty admin when remote upsert fails)
  useEffect(() => {
    const fetchAllVATRefunds = async () => {
      try {
        setIsLoading(true);

        const localPayments = getVatRefundPaymentsFromBrowserLocalStorage();
        const localRows = localPayments.map(paymentToVatRefundAdmin);

        console.log('🔍 Fetching VAT refunds from Supabase...');
        const { data, error } = await supabase
          .from('payments')
          .select('*')
          .eq('employee_id', 'vat-refund')
          .order('created_at', { ascending: false });

        let remoteRows: VATRefundAdmin[] = [];
        if (error) {
          console.error('❌ Error fetching VAT refunds:', error);
          console.error('Error details:', JSON.stringify(error, null, 2));
          setBlendNotice({
            tone: 'warning',
            text: `Could not load from Supabase (${error.message}). Showing rows saved in this browser only.`,
          });
        } else {
          console.log(`✅ Found ${data?.length || 0} VAT refund records in Supabase`);
          remoteRows = (data || []).map(paymentToVatRefundAdmin);
          const localOnlyIds = localRows
            .map((r) => r.id)
            .filter((id) => !remoteRows.some((r) => r.id === id));
          if (localOnlyIds.length > 0) {
            setBlendNotice({
              tone: 'info',
              text: `${localOnlyIds.length} refund(s) were never saved (or failed) on Supabase; they appear from this browser’s cache only. Apply the migration "ensure_vat_payment_rls_for_anon" or check failed POSTs to rest/v1/payments in Network — you need DB sync for other devices and backups.`,
            });
          } else {
            setBlendNotice(null);
          }
        }

        const vatRefunds = mergeRemoteAndLocalVatRows(remoteRows, localRows);
        setRefunds(vatRefunds);

        const totalAmount = vatRefunds.reduce((sum, r) => sum + r.amount, 0);
        const completedRefunds = vatRefunds.filter(
          (r) => r.status === 'completed',
        ).length;
        const pendingRefunds = vatRefunds.filter(
          (r) => r.status === 'pending',
        ).length;
        const failedRefunds = vatRefunds.filter(
          (r) => r.status === 'failed',
        ).length;

        setStats({
          totalRefunds: vatRefunds.length,
          totalAmount,
          completedRefunds,
          pendingRefunds,
          failedRefunds,
        });
      } catch (error) {
        console.error('Failed to fetch VAT refunds:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAllVATRefunds();

    const interval = setInterval(() => {
      fetchAllVATRefunds();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  // Apply filters
  useEffect(() => {
    let filtered = [...refunds];

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        refund =>
          refund.user_id.toLowerCase().includes(term) ||
          refund.id.toLowerCase().includes(term) ||
          (refund.transaction_hash && refund.transaction_hash.toLowerCase().includes(term))
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(refund => refund.status === statusFilter);
    }

    // Date filter
    if (dateFilter !== 'all') {
      const now = new Date();
      filtered = filtered.filter(refund => {
        const refundDate = new Date(refund.created_at);
        switch (dateFilter) {
          case 'today':
            return refundDate.toDateString() === now.toDateString();
          case 'week':
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            return refundDate >= weekAgo;
          case 'month':
            const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            return refundDate >= monthAgo;
          default:
            return true;
        }
      });
    }

    setFilteredRefunds(filtered);
  }, [searchTerm, statusFilter, dateFilter, refunds]);

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const exportToCSV = () => {
    const headers = [
      'ID', 'User Address', 'Amount', 'Token', 'Status', 'Transaction Hash', 'Payment Date', 'Created At',
      'VAT Reg No', 'Receipt No', 'Bill Amount', 'VAT Amount', 'Purchase Date',
      'Passport No', 'Flight No', 'Nationality', 'Date of Birth',
      'Merchant Name', 'Merchant Address', 'Receiver Wallet Address'
    ];
    const rows = filteredRefunds.map(refund => {
      const details = refund.vat_refund_details || {};
      return [
        refund.id,
        refund.user_id,
        refund.amount.toFixed(2),
        refund.token,
        refund.status,
        refund.transaction_hash || 'N/A',
        refund.payment_date,
        refund.created_at,
        details.vatRegNo || 'N/A',
        details.receiptNo || 'N/A',
        details.billAmount || 'N/A',
        details.vatAmount || 'N/A',
        details.purchaseDate || 'N/A',
        details.passportNo || 'N/A',
        details.flightNo || 'N/A',
        details.nationality || 'N/A',
        details.dob || 'N/A',
        details.merchantName || 'N/A',
        details.merchantAddress || 'N/A',
        details.receiverWalletAddress || 'N/A',
      ];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vat-refunds-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="w-full min-w-0 max-w-7xl mx-auto px-3 sm:px-4 py-6 sm:py-8">
      {/* Header */}
      <div className="mb-6 sm:mb-8 min-w-0">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4 min-w-0">
          <div className="flex items-start sm:items-center gap-3 min-w-0">
            <div className="w-12 h-12 shrink-0 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl sm:text-3xl font-bold text-gray-900 break-words">VAT Refund Admin Panel</h1>
              <p className="text-sm text-gray-600 break-words">Dubai Government VAT Administration</p>
            </div>
          </div>
          <button
            onClick={exportToCSV}
            className="inline-flex items-center justify-center gap-2 w-full sm:w-auto shrink-0 bg-gray-900 hover:bg-gray-800 text-white font-semibold py-2.5 px-6 rounded-lg transition-all shadow-lg hover:shadow-xl"
          >
            <Download className="w-5 h-5" />
            Export CSV
          </button>
        </div>

        {blendNotice ? (
          <div
            className={
              blendNotice.tone === 'warning'
                ? 'mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 flex gap-2 items-start'
                : 'mb-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-950 flex gap-2 items-start'
            }
          >
            <AlertCircle
              className={`w-5 h-5 shrink-0 mt-0.5 ${
                blendNotice.tone === 'warning'
                  ? 'text-amber-600'
                  : 'text-blue-600'
              }`}
            />
            <span>{blendNotice.text}</span>
          </div>
        ) : null}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3 sm:gap-4 mb-6 min-w-0">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-xl p-4">
            <div className="text-sm text-blue-700 font-medium mb-1">Total Refunds</div>
            <div className="text-2xl font-bold text-blue-900">{stats.totalRefunds}</div>
          </div>
          <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-xl p-4">
            <div className="text-sm text-green-700 font-medium mb-1">Total Amount</div>
            <div className="text-2xl font-bold text-green-900">{stats.totalAmount.toFixed(2)}</div>
          </div>
          <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 border border-emerald-200 rounded-xl p-4">
            <div className="text-sm text-emerald-700 font-medium mb-1">Completed</div>
            <div className="text-2xl font-bold text-emerald-900">{stats.completedRefunds}</div>
          </div>
          <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 border border-yellow-200 rounded-xl p-4">
            <div className="text-sm text-yellow-700 font-medium mb-1">Pending</div>
            <div className="text-2xl font-bold text-yellow-900">{stats.pendingRefunds}</div>
          </div>
          <div className="bg-gradient-to-br from-red-50 to-red-100 border border-red-200 rounded-xl p-4">
            <div className="text-sm text-red-700 font-medium mb-1">Failed</div>
            <div className="text-2xl font-bold text-red-900">{stats.failedRefunds}</div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by address, ID, or transaction..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Status</option>
              <option value="completed">Completed</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
            </select>
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value as any)}
              className="px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="week">Last 7 Days</option>
              <option value="month">Last 30 Days</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden min-w-0">
        {isLoading ? (
          <div className="flex justify-center items-center py-16">
            <div className="w-12 h-12 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin"></div>
          </div>
        ) : filteredRefunds.length === 0 ? (
          <div className="text-center py-16">
            <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-700 mb-2">No VAT Refunds Found</h3>
            <p className="text-gray-500">No refunds match your current filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                <tr>
                  <th className="px-4 sm:px-6 py-3.5 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    ID
                  </th>
                  <th className="px-4 sm:px-6 py-3.5 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    User Address
                  </th>
                  <th className="px-4 sm:px-6 py-3.5 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-4 sm:px-6 py-3.5 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Token
                  </th>
                  <th className="px-4 sm:px-6 py-3.5 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 sm:px-6 py-3.5 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Transaction
                  </th>
                  <th className="px-4 sm:px-6 py-3.5 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-4 sm:px-6 py-3.5 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Details
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredRefunds.map((refund, index) => {
                  const rowTokenIcon = vatAdminTokenIconSrc(refund.token);
                  const rowTokenAlt = (refund.token || 'USDT').toUpperCase();
                  return (
                  <tr key={refund.id} className={`hover:bg-gray-50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                    <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center mr-2">
                          <span className="text-xs font-mono text-gray-600">#{index + 1}</span>
                        </div>
                        <span className="text-sm font-medium text-gray-900 font-mono">
                          {refund.id.slice(0, 8)}...
                        </span>
                      </div>
                    </td>
                    <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-gray-400" />
                        <span className="text-sm font-mono text-gray-900">{formatAddress(refund.user_id)}</span>
                      </div>
                    </td>
                    <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-2">
                        <img
                          src={rowTokenIcon}
                          alt={rowTokenAlt}
                          className="h-5 w-5 object-contain"
                        />
                        <span className="text-sm font-semibold text-gray-900">
                          {refund.amount.toFixed(2)}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-center">
                      <div className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-semibold">
                        <img
                          src={rowTokenIcon}
                          alt={rowTokenAlt}
                          className="h-3.5 w-3.5 object-contain"
                        />
                        {refund.token}
                      </div>
                    </td>
                    <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-center">
                      {refund.status === 'completed' ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-gradient-to-r from-green-100 to-emerald-100 text-green-700 border border-green-200">
                          <CheckCircle className="w-3.5 h-3.5" />
                          Completed
                        </span>
                      ) : refund.status === 'pending' ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-700 border border-yellow-200">
                          <Clock className="w-3.5 h-3.5" />
                          Pending
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-red-100 text-red-700 border border-red-200">
                          <AlertCircle className="w-3.5 h-3.5" />
                          Failed
                        </span>
                      )}
                    </td>
                    <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                      {refund.transaction_hash ? (
                        <a
                          href={explorerTxUrl(refund.transaction_hash)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-blue-600 hover:text-blue-800 font-mono text-xs bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg border border-blue-200 transition-all hover:shadow-sm"
                        >
                          <span className="truncate max-w-24 sm:max-w-32">
                            {refund.transaction_hash.slice(0, 8)}...{refund.transaction_hash.slice(-6)}
                          </span>
                          <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" />
                        </a>
                      ) : (
                        <span className="text-gray-400 text-sm">-</span>
                      )}
                    </td>
                    <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <div>
                          <div className="text-sm text-gray-900">
                            {new Date(refund.created_at).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            })}
                          </div>
                          <div className="text-xs text-gray-500">
                            {new Date(refund.created_at).toLocaleTimeString('en-US', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-center">
                      {refund.vat_refund_details ? (
                        <button
                          onClick={() => {
                            setSelectedRefund(refund);
                            setShowDetailsModal(true);
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-all hover:shadow-sm"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          View Details
                        </button>
                      ) : (
                        <span className="text-gray-400 text-xs">No details</span>
                      )}
                    </td>
                  </tr>
                );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Details Modal */}
      <AnimatePresence>
        {showDetailsModal && selectedRefund && selectedRefund.vat_refund_details && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowDetailsModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              transition={{ type: "spring", duration: 0.3 }}
              className="bg-white border border-gray-200 rounded-xl sm:rounded-2xl max-w-md sm:max-w-4xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
            <div className="sticky top-0 bg-white border-b border-gray-200 p-4 sm:p-6 flex items-center justify-between z-10">
              <div>
                <h2 className="text-lg sm:text-2xl font-bold text-gray-900">VAT Refund Details</h2>
                <p className="text-gray-600 text-xs sm:text-sm mt-1">ID: {selectedRefund.id.slice(0, 8)}...</p>
              </div>
              <button
                onClick={() => setShowDetailsModal(false)}
                className="p-2 text-gray-500 hover:text-gray-900 transition-colors rounded-lg hover:bg-gray-100"
              >
                <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-4 sm:p-6 space-y-4">
              {/* Summary Card */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <span>Refund Status</span>
                    {selectedRefund.status === 'completed' ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">
                        <CheckCircle className="w-3.5 h-3.5" />
                        Completed
                      </span>
                    ) : selectedRefund.status === 'pending' ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-700">
                        <Clock className="w-3.5 h-3.5" />
                        Pending
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700">
                        <AlertCircle className="w-3.5 h-3.5" />
                        Failed
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-gray-600">
                    Submitted: {new Date(selectedRefund.created_at).toLocaleString()}
                  </p>
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Refund Amount</h3>
                  <div className="flex items-center gap-2">
                    <img
                      src={vatAdminTokenIconSrc(selectedRefund.token)}
                      alt={(selectedRefund.token || 'USDT').toUpperCase()}
                      className="h-5 w-5 object-contain"
                    />
                    <span className="text-lg font-bold text-gray-900">{selectedRefund.amount.toFixed(2)} {selectedRefund.token}</span>
                  </div>
                  {selectedRefund.transaction_hash && (
                    <a
                      href={explorerTxUrl(selectedRefund.transaction_hash)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 mt-2 text-xs text-blue-600 hover:text-blue-800 transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      View Transaction
                    </a>
                  )}
                </div>
              </div>

              {/* Receipt Information */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
                  Receipt Information
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="bg-white rounded-lg p-3 border border-gray-200">
                    <label className="text-xs text-gray-600 mb-1 block">VAT Registration No.</label>
                    <p className="text-sm font-medium text-gray-900 font-mono">
                      {selectedRefund.vat_refund_details.vatRegNo || <span className="text-gray-400 italic">Not provided</span>}
                    </p>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-gray-200">
                    <label className="text-xs text-gray-600 mb-1 block">Receipt/Invoice No.</label>
                    <p className="text-sm font-medium text-gray-900 font-mono">
                      {selectedRefund.vat_refund_details.receiptNo || <span className="text-gray-400 italic">Not provided</span>}
                    </p>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-gray-200">
                    <label className="text-xs text-gray-600 mb-1 block">Total Bill Amount</label>
                    <p className="text-sm font-bold text-gray-900">
                      {selectedRefund.vat_refund_details.billAmount || <span className="text-gray-400 italic">Not provided</span>}
                    </p>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-gray-200">
                    <label className="text-xs text-gray-600 mb-1 block">VAT Amount</label>
                    <p className="text-sm font-bold text-green-600">
                      {selectedRefund.vat_refund_details.vatAmount || <span className="text-gray-400 italic">Not provided</span>}
                    </p>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-gray-200 sm:col-span-2">
                    <label className="text-xs text-gray-600 mb-1 block">Purchase Date</label>
                    <p className="text-sm font-medium text-gray-900">
                      {selectedRefund.vat_refund_details.purchaseDate || <span className="text-gray-400 italic">Not provided</span>}
                    </p>
                  </div>
                </div>
              </div>

              {/* Personal Information */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <User className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
                  Personal Information
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="bg-white rounded-lg p-3 border border-gray-200">
                    <label className="text-xs text-gray-600 mb-1 block">Passport Number</label>
                    <p className="text-sm font-medium text-gray-900 font-mono">
                      {selectedRefund.vat_refund_details.passportNo || <span className="text-gray-400 italic">Not provided</span>}
                    </p>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-gray-200">
                    <label className="text-xs text-gray-600 mb-1 block">Flight Number</label>
                    <p className="text-sm font-medium text-gray-900">
                      {selectedRefund.vat_refund_details.flightNo || <span className="text-gray-400 italic">Not provided</span>}
                    </p>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-gray-200">
                    <label className="text-xs text-gray-600 mb-1 block">Country of Nationality</label>
                    <p className="text-sm font-medium text-gray-900">
                      {selectedRefund.vat_refund_details.nationality || <span className="text-gray-400 italic">Not provided</span>}
                    </p>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-gray-200">
                    <label className="text-xs text-gray-600 mb-1 block">Date of Birth</label>
                    <p className="text-sm font-medium text-gray-900">
                      {selectedRefund.vat_refund_details.dob || <span className="text-gray-400 italic">Not provided</span>}
                    </p>
                  </div>
                </div>
              </div>

              {/* Merchant Information */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <DollarSign className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
                  Merchant Information
                </h3>
                <div className="space-y-3">
                  <div className="bg-white rounded-lg p-3 border border-gray-200">
                    <label className="text-xs text-gray-600 mb-1 block">Merchant Name</label>
                    <p className="text-sm font-medium text-gray-900">
                      {selectedRefund.vat_refund_details.merchantName || <span className="text-gray-400 italic">Not provided</span>}
                    </p>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-gray-200">
                    <label className="text-xs text-gray-600 mb-1 block">Merchant Address</label>
                    <p className="text-sm text-gray-900 leading-relaxed">
                      {selectedRefund.vat_refund_details.merchantAddress || <span className="text-gray-400 italic">Not provided</span>}
                    </p>
                  </div>
                </div>
              </div>

              {/* Payment Information */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <DollarSign className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
                  Payment Information
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="bg-white rounded-lg p-3 border border-gray-200 sm:col-span-2">
                    <label className="text-xs text-gray-600 mb-1 block">Receiver Wallet Address</label>
                    {selectedRefund.vat_refund_details.receiverWalletAddress ? (
                      <div className="flex items-start gap-2">
                        <p className="text-gray-900 font-mono text-xs break-all flex-1">{selectedRefund.vat_refund_details.receiverWalletAddress}</p>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(
                              selectedRefund.vat_refund_details?.receiverWalletAddress ?? '',
                            );
                          }}
                          className="p-1.5 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors flex-shrink-0"
                          title="Copy address"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        </button>
                      </div>
                    ) : (
                      <p className="text-gray-400 italic text-sm">Not provided</p>
                    )}
                  </div>
                  {selectedRefund.transaction_hash && (
                    <div className="bg-white rounded-lg p-3 border border-gray-200">
                      <label className="text-xs text-gray-600 mb-1 block">Transaction Hash</label>
                      <a
                        href={explorerTxUrl(selectedRefund.transaction_hash)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-blue-600 hover:text-blue-800 font-mono text-xs"
                      >
                        <span>{selectedRefund.transaction_hash.slice(0, 10)}...{selectedRefund.transaction_hash.slice(-8)}</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer Info */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <Shield className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-semibold mb-1">Admin Access Information</p>
            <p>
              Combines VAT refund rows from Supabase with any saved in this browser (
              <code className="text-xs bg-blue-100 px-1 rounded">gemetra_payments_*</code>
              ), matching the VAT Refund History tab. Fully cross-user admin still requires reliable Supabase inserts.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
