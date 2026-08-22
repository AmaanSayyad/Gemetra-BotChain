import React, { useState } from 'react';
import { X, Send, Users, DollarSign, Clock, Shield, CheckCircle, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { sendBulkPayments, isWalletConnected, getConnectedAccount, formatAddress, BOTCHAIN_USDT, type PaymentToken } from '../utils/ethereum';
import { explorerTxUrl, BOT_CHAIN_ID, BOT_CHAIN_LABEL } from '../config/botchain';
import { usePayments } from '../hooks/usePayments';
import { usePoints } from '../hooks/usePoints';
import { sendBulkPaymentEmails, PaymentEmailData } from '../utils/emailService';
import { useChainId } from 'wagmi';

interface PaymentPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  employeesToPay: Array<{
    id: string;
    name: string;
    email: string;
    wallet_address: string;
    amount: number;
    selected?: boolean;
  }>;
  selectedToken: string;
  onConfirmSend: () => void;
  onPaymentSuccess?: () => void;
}

export const PaymentPreviewModal: React.FC<PaymentPreviewModalProps> = ({
  isOpen,
  onClose,
  employeesToPay,
  selectedToken,
  onConfirmSend,
  onPaymentSuccess
}) => {
  const { createPayment } = usePayments();
  const { earnPoints } = usePoints();
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentResult, setPaymentResult] = useState<{
    success: boolean;
    txHash?: string;
    error?: string;
    processed?: number;
    emailResults?: { success: number; failed: number };
  } | null>(null);

  // Validate employeesToPay prop
  if (!employeesToPay || !Array.isArray(employeesToPay)) {
    console.error('PaymentPreviewModal: Invalid employeesToPay prop', employeesToPay);
    return null;
  }

  if (!isOpen) return null;

  const totalAmount = employeesToPay.reduce((sum, emp) => sum + (emp.amount || 0), 0);
  const networkFees = employeesToPay.length * 0.00002; // ~0.00002 BOT per transfer
  const estimatedTime = employeesToPay.length * 2; // ~2 seconds per transfer (BOT Chain)

  const walletConnected = isWalletConnected();
  const connectedAccount = getConnectedAccount();
  const chainId = useChainId();

  const handleConfirmPayment = async () => {
    if (!walletConnected || !connectedAccount) {
      setPaymentResult({
        success: false,
        error: 'Please connect your wallet first'
      });
      return;
    }

    setIsProcessing(true);
    setPaymentResult(null);

    try {
      // Prepare data synchronously (faster - no async operations)
      const recipientsData = employeesToPay
        .filter(emp => {
          if (!emp.wallet_address || !emp.amount) {
            console.warn(`Skipping employee ${emp.name}: missing wallet address or amount`);
            return false;
          }
          return true;
        })
        .map(emp => ({
          address: emp.wallet_address as `0x${string}`,
          amount: emp.amount
        }));

      if (recipientsData.length === 0) {
        throw new Error('No valid recipients found. Please check employee wallet addresses and amounts.');
      }

      console.log(`📤 Preparing batch payment for ${recipientsData.length} recipients...`);

      // Send batch payment (will use Multicall3 for single transaction if available)
      const result = await sendBulkPayments(recipientsData, selectedToken as PaymentToken);

      if (result.success) {
        // Record payments in Supabase with correct transaction hash for each employee
        try {
          console.log(`💾 Recording ${employeesToPay.length} payments to database...`);
          console.log('Available transaction hashes:', result.txHashes);
          
          // Record payment for each employee sequentially to avoid state conflicts
          // IMPORTANT: Match employees to their transaction hashes by wallet address
          for (let i = 0; i < employeesToPay.length; i++) {
            const employee = employeesToPay[i];
            
            // Find the transaction hash for this employee's wallet address
            // Make sure we're matching correctly by normalizing addresses
            const employeeWalletAddress = employee.wallet_address?.toLowerCase().trim();
            const matchingTx = result.txHashes?.find(
              tx => tx.address.toLowerCase().trim() === employeeWalletAddress
            );
            
            const employeeTxHash = matchingTx?.txHash;
            
            if (!employeeTxHash) {
              console.warn(`⚠️ No transaction hash found for ${employee.name} (${employeeWalletAddress}). Available hashes:`, 
                result.txHashes?.map(tx => ({ address: tx.address.toLowerCase(), txHash: tx.txHash }))
              );
            }
            
            console.log(`📝 Recording payment ${i + 1}/${employeesToPay.length} for ${employee.name} (${employee.id}):`, {
              employee_id: employee.id,
              employee_name: employee.name,
              employee_email: employee.email,
              amount: employee.amount,
              wallet_address: employeeWalletAddress,
              txHash: employeeTxHash || 'NOT FOUND - Payment may have failed',
              hasMatchingTx: !!matchingTx
            });
            
            // Only record payment if we have a transaction hash (payment was successful)
            if (employeeTxHash) {
              try {
                await createPayment({
                  employee_id: employee.id,
                  amount: employee.amount,
                  token: selectedToken,
                  transaction_hash: employeeTxHash,
                  status: 'completed',
                  payment_date: new Date().toISOString()
                });
                console.log(`✅ Successfully recorded payment ${i + 1}/${employeesToPay.length} for ${employee.name} with txHash: ${employeeTxHash}`);
              } catch (paymentError) {
                console.error(`❌ Failed to record payment ${i + 1}/${employeesToPay.length} for ${employee.name}:`, paymentError);
                // Continue with other employees even if one fails
              }
            } else {
              console.error(`❌ Skipping payment record for ${employee.name} - no transaction hash found. Payment may have failed.`);
            }
            
            // Small delay to ensure state updates properly before next payment
            if (i < employeesToPay.length - 1) {
              await new Promise(resolve => setTimeout(resolve, 100));
            }
          }
          
          console.log(`✅ Finished recording payments for ${employeesToPay.length} employees`);
          
          // Award points for bulk payment
          try {
            if (employeesToPay.length > 1) {
              const points = employeesToPay.length * 5; // 5 points per employee in bulk
              await earnPoints(points, 'bulk_payment', undefined, `Bulk payment to ${employeesToPay.length} employees`);
              console.log(`🎉 Earned ${points} points for bulk payment!`);
            } else {
              await earnPoints(10, 'payment', undefined, `Payment to ${employeesToPay[0]?.name || 'employee'}`);
              console.log(`🎉 Earned 10 points for payment!`);
            }
          } catch (pointsError) {
            console.error('Failed to award points (non-critical):', pointsError);
            // Don't fail the payment if points fail
          }
        } catch (dbError) {
          console.error('Failed to record payments in database:', dbError);
          // Continue with success flow even if database recording fails
        }

        // Send payment-done notifications to the configured admin email
        let emailResults = { success: 0, failed: 0 };
        try {
          const emailDataList: PaymentEmailData[] = employeesToPay.map(employee => {
            // Find the transaction hash for this employee's wallet address
            const employeeWalletAddress = employee.wallet_address?.toLowerCase().trim();
            const matchingTx = result.txHashes?.find(
              tx => tx.address.toLowerCase().trim() === employeeWalletAddress
            );
            const employeeTxHash = matchingTx?.txHash || result.txHash; // Fallback to first if not found
            
            console.log(`📧 Preparing email for ${employee.name} (${employee.email}):`, {
              employee_name: employee.name,
              employee_email: employee.email,
              wallet_address: employeeWalletAddress,
              txHash: employeeTxHash
            });
            
            return {
              employeeName: employee.name,
              employeeEmail: employee.email, // Use employee's actual email
              amount: employee.amount,
              token: selectedToken,
              transactionHash: employeeTxHash, // Use employee's specific transaction hash
              companyName: 'Gemtra',
              paymentDate: new Date().toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })
            };
          });
          
          console.log(`📧 Sending ${emailDataList.length} payment notification emails...`);

          emailResults = await sendBulkPaymentEmails(emailDataList);
          console.log('Email notification results:', emailResults);
        } catch (emailError) {
          console.error('Failed to send email notifications:', emailError);
          // Don't fail the entire payment process if emails fail
        }

        // Call the payment success callback to trigger data refresh
        if (onPaymentSuccess) {
          console.log('PaymentPreviewModal: Calling onPaymentSuccess callback');
          onPaymentSuccess();
        }
        
        setPaymentResult({
          success: true,
          txHash: result.txHash,
          processed: result.processed,
          emailResults
        });
        
        // Wait a moment to show success, then trigger the parent callback
        setTimeout(() => {
          onConfirmSend();
        }, 2000);
      } else {
        setPaymentResult({
          success: false,
          error: result.error || 'Payment failed',
          processed: result.processed
        });
      }
    } catch (error) {
      console.error('Error in handleConfirmPayment:', error);
      let errorMessage = 'An unexpected error occurred';
      
      if (error instanceof Error) {
        if (error.message.includes('asset') && error.message.includes('missing from')) {
          // Extract the address from the error message
          const addressMatch = error.message.match(/missing from ([A-Z2-7]{58})/);
          // const failedAddress = addressMatch ? addressMatch[1] : 'one of the recipients';
          const shortAddress = addressMatch ? `${addressMatch[1].substring(0, 8)}...${addressMatch[1].substring(-6)}` : 'the recipient';
          
          errorMessage = `Payment failed for recipient ${shortAddress}. Please check the address and try again.`;
        } else if (error.message.includes('Wallet not connected')) {
          errorMessage = 'Wallet is not connected. Please connect your wallet and try again.';
        } else {
          errorMessage = error.message;
        }
      }
      
      setPaymentResult({
        success: false,
        error: errorMessage
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const viewOnExplorer = () => {
    if (paymentResult?.txHash) {
      window.open(explorerTxUrl(paymentResult.txHash), '_blank');
    }
  };

  const formatAddressShort = (address: string) => {
    if (!address || typeof address !== 'string') {
      return 'Invalid address';
    }
    return `${address.substring(0, 8)}...${address.substring(address.length - 6)}`;
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="bg-white border border-gray-200 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gray-900 rounded-xl flex items-center justify-center">
              <img
                src={selectedToken === 'BOT' ? "/botchain.png" : "/usdt.png"}
                alt={`${selectedToken} logo`}
                className="w-8 h-8 object-contain"
              />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Confirm Bulk Payment</h2>
              <p className="text-gray-600">Review payment details before sending</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="p-2 text-gray-500 hover:text-gray-900 transition-colors rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          {/* Wallet Connection Status */}
          {!walletConnected ? (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center space-x-2">
                <AlertCircle className="w-5 h-5 text-red-600" />
                <span className="text-red-800 font-medium">Wallet Not Connected</span>
              </div>
              <p className="text-red-700 text-sm mt-1">Please connect your wallet to proceed with payments</p>
            </div>
          ) : (
            <>
              {/* Network Warning */}
              {chainId !== BOT_CHAIN_ID && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <AlertCircle className="w-5 h-5 text-red-600" />
                    <span className="text-red-800 font-medium">Wrong Network</span>
                  </div>
                  <p className="text-red-700 text-sm mt-1">
                    Please switch to <strong>{BOT_CHAIN_LABEL}</strong> to use real {selectedToken} transfers.
                  </p>
                </div>
              )}

              {/* Mainnet Confirmation */}
              {chainId === BOT_CHAIN_ID && (
                <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <span className="text-green-800 font-medium">Connected to {BOT_CHAIN_LABEL}</span>
                  </div>
                  <p className="text-green-700 text-sm mt-1">
                    {selectedToken === "USDT" ? (
                      <>Using BOT Chain USDT. Contract: <code className="text-xs bg-green-100 px-1 rounded">{BOTCHAIN_USDT.slice(0, 10)}...</code></>
                    ) : (
                      <>Using native BOT transfers on {BOT_CHAIN_LABEL}.</>
                    )}
                  </p>
                </div>
              )}

              <div className="mb-6 p-4 bg-gray-100 border border-gray-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <span className="text-black font-medium">Wallet Connected</span>
                  </div>
                  <span className="text-gray-700 text-sm font-mono">{formatAddress(connectedAccount!)}</span>
                </div>
              </div>
            </>
          )}

          {/* Payment Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gray-900 rounded-lg flex items-center justify-center">
                  <Users className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900">{employeesToPay.length}</div>
                  <div className="text-sm text-gray-600">Recipients</div>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gray-900 rounded-lg flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900">{totalAmount.toLocaleString()} {selectedToken}</div>
                  <div className="text-sm text-gray-600">Total Amount</div>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gray-900 rounded-lg flex items-center justify-center">
                  <Clock className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900">~{estimatedTime}s</div>
                  <div className="text-sm text-gray-600">Est. Time</div>
                </div>
              </div>
            </div>
          </div>

          {/* Transaction Details */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Payment List */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                <Send className="w-5 h-5 text-gray-700" />
                <span>Payment Recipients</span>
              </h3>
              
              <div className="bg-gray-50 border border-gray-200 rounded-lg max-h-80 overflow-y-auto">
                {employeesToPay.map((employee, index) => (
                  <div
                    key={employee.id}
                    className={`p-4 flex items-center justify-between ${
                      index !== employeesToPay.length - 1 ? 'border-b border-gray-200' : ''
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-black rounded-full flex items-center justify-center">
                        <span className="text-sm font-bold text-white">
                          {employee.name.split(' ').map(n => n[0]).join('')}
                        </span>
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{employee.name}</div>
                        <div className="text-sm text-gray-600 font-mono">
                          {formatAddressShort(employee.wallet_address)}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-gray-900">
                        {employee.amount.toLocaleString()} {selectedToken}
                      </div>
                      <div className="text-sm text-gray-600">{selectedToken}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Transaction Summary */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                <Shield className="w-5 h-5 text-gray-700" />
                <span>Transaction Summary</span>
              </h3>
              
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 space-y-4">
                {/* Payment Token */}
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Payment Token:</span>
                  <div className="flex items-center space-x-2">
                    {selectedToken.toUpperCase() === 'USDT' ? (
                      <img 
                        src="/usdt.png" 
                        alt="USDT"
                        className="w-6 h-6 rounded-full object-cover"
                      />
                    ) : selectedToken.toUpperCase() === 'BOT' ? (
                      <img 
                        src="/botchain.png" 
                        alt="BOT"
                        className="w-6 h-6 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-6 h-6 bg-gray-900 rounded-full flex items-center justify-center">
                        <span className="text-xs font-bold text-white">
                          {selectedToken.substring(0, 1)}
                        </span>
                      </div>
                    )}
                    <span className="font-medium text-gray-900">{selectedToken}</span>
                  </div>
                </div>

                {/* Subtotal */}
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Subtotal:</span>
                  <span className="font-medium text-gray-900">{totalAmount.toLocaleString()} {selectedToken}</span>
                </div>

                {/* Network Fees */}
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Network Fees:</span>
                  <span className="font-medium text-gray-900">~{networkFees.toFixed(6)} BOT</span>
                </div>

                {/* Processing Time */}
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Processing Time:</span>
                  <span className="font-medium text-gray-900">~{estimatedTime} seconds</span>
                </div>

                <div className="border-t border-gray-200 pt-4">
                  <div className="flex items-center justify-between text-lg">
                    <span className="font-semibold text-gray-900">Total Cost:</span>
                    <div className="text-right">
                      <div className="font-bold text-gray-900">{totalAmount.toLocaleString()} {selectedToken}</div>
                      <div className="text-sm text-gray-600">+ ~{networkFees.toFixed(6)} BOT fees</div>
                    </div>
                  </div>
                </div>

                {/* Security Notice */}
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 mt-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span className="text-green-800 font-medium text-sm">Secure Transaction</span>
                  </div>
                  <div className="text-xs text-green-700">
                    All payments are processed on BOT Chain using {selectedToken} with cryptographic security.
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Payment Result */}
          {paymentResult && (
            <div className="mt-6">
              {paymentResult.success ? (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 bg-green-50 border border-green-200 rounded-lg"
                >
                  <div className="flex items-center space-x-2 mb-2">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <span className="text-green-800 font-medium">Payments Successful!</span>
                  </div>
                  <div className="text-sm text-green-700 mb-2">
                    Successfully processed {paymentResult.processed} payment{paymentResult.processed !== 1 ? 's' : ''}
                  </div>
                  {paymentResult.emailResults && (
                    <div className="text-sm text-green-700 mb-2">
                      Email notifications: {paymentResult.emailResults.success} sent, {paymentResult.emailResults.failed} failed
                    </div>
                  )}
                  {paymentResult.txHash && (
                    <>
                      <div className="text-sm text-green-700 mb-2">
                        Transaction Hash: {formatAddress(paymentResult.txHash)}
                      </div>
                      <button 
                        onClick={viewOnExplorer}
                        className="text-sm text-gray-700 hover:text-gray-900 flex items-center space-x-1"
                      >
                        <span>View on BOTScan</span>
                        <Send className="w-3 h-3" />
                      </button>
                    </>
                  )}
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 bg-red-50 border border-red-200 rounded-lg"
                >
                  <div className="flex items-center space-x-2 mb-2">
                    <AlertCircle className="w-5 h-5 text-red-600" />
                    <span className="text-red-800 font-medium">Payment Failed</span>
                  </div>
                  <div className="text-sm text-red-700">
                    {paymentResult.error}
                  </div>
                  {paymentResult.processed !== undefined && paymentResult.processed > 0 && (
                    <div className="text-sm text-red-600 mt-1">
                      Processed {paymentResult.processed} out of {employeesToPay.length} payments
                    </div>
                  )}
                </motion.div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 mt-8 pt-6 border-t border-gray-200">
            <button
              onClick={onClose}
              disabled={isProcessing}
              className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 hover:text-gray-900 py-3 px-6 rounded-lg transition-all duration-200 font-medium disabled:opacity-50"
            >
              {paymentResult?.success ? 'Close' : 'Cancel'}
            </button>
            {!paymentResult?.success && (
              <motion.button
                onClick={handleConfirmPayment}
                disabled={isProcessing || !walletConnected}
                className={`flex-1 bg-gray-900 hover:bg-gray-800 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 text-lg ${
                  isProcessing || !walletConnected ? 'opacity-50 cursor-not-allowed' : ''
                }`}
                whileHover={{ scale: isProcessing || !walletConnected ? 1 : 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {isProcessing ? (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Processing Payments...</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center space-x-2">
                    <Send className="w-5 h-5" />
                    <span>Confirm & Send Payments</span>
                  </div>
                )}
              </motion.button>
            )}
          </div>

          {/* Disclaimer */}
          {!paymentResult && (
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="text-xs text-yellow-800">
                <strong>Important:</strong> Once confirmed, this transaction cannot be reversed. 
                Please verify all recipient addresses and amounts before proceeding. A payment confirmation email will be sent to the configured notification address.
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};