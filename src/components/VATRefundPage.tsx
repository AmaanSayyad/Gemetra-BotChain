import React, { useState } from 'react';
import { Upload, FileCheck, QrCode, CheckCircle, AlertCircle, Search, Clock, FileText, FileUp, FormInput, ExternalLink } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { getConnectedAccount, sendPayment, isValidEthereumAddress, recordVatRefundOnChain, type PaymentToken } from '../utils/ethereum';
import { buildPaymentQrUrl } from '../utils/solanaPayTransferUrl';
import { usePayments } from '../hooks/usePayments';
import { usePoints } from '../hooks/usePoints';
import { supabase } from '../lib/supabase';


interface VATRefundPageProps {
  onBack?: () => void;
}

function vatHistoryTokenLogo(token?: string): { src: string; alt: string } {
  const upper = (token || 'USDT').toUpperCase();
  if (upper === 'BOT' || upper === 'SOL') {
    return { src: '/botchain.png', alt: 'BOT' };
  }
  return { src: '/usdt.png', alt: 'USDT' };
}

export const VATRefundPage: React.FC<VATRefundPageProps> = () => {
  const { createPayment, getAllPayments, updatePaymentStatus } = usePayments();
  const { earnPoints } = usePoints();
  const [activeTab, setActiveTab] = useState<'upload' | 'history'>('upload');
  const [step, setStep] = useState<'upload' | 'review' | 'sign' | 'confirmation' | 'error'>('upload');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [qrValue, setQrValue] = useState<string>('');
  const [refundAmount, setRefundAmount] = useState<number>(0);
  const [entryMode, setEntryMode] = useState<'upload' | 'manual'>('upload');
  const [selectedToken, setSelectedToken] = useState<PaymentToken>('USDT');
  const [transactionStatus, setTransactionStatus] = useState<'waiting' | 'confirmed' | 'rejected'>('waiting');
  const [transactionHash, setTransactionHash] = useState<string>('');
  const [refundHistory, setRefundHistory] = useState<any[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Form fields for manual entry
  const [formData, setFormData] = useState({
    vatRegNo: '',
    receiptNo: '',
    billAmount: '',
    vatAmount: '',
    passportNo: '',
    flightNo: '',
    nationality: '',
    dob: '',
    purchaseDate: '',
    merchantName: '',
    merchantAddress: '',
    receiverWalletAddress: ''
  });

  // Fetch VAT refund history
  React.useEffect(() => {
    const fetchRefundHistory = async () => {
      setIsHistoryLoading(true);
      try {
        const allPayments = await getAllPayments();

        // Filter payments that are VAT refunds (employee_id === 'vat-refund')
        const vatRefunds = allPayments
          .filter(payment => payment.employee_id === 'vat-refund')
          .map(payment => ({
            id: payment.id,
            date: payment.created_at,
            amount: payment.amount,
            status: payment.status,
            token: payment.token,
            transaction_hash: payment.transaction_hash,
            payment_date: payment.payment_date,
            document: payment.employee_id === 'vat-refund' ? 'VAT Refund' : ''
          }))
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        setRefundHistory(vatRefunds);
      } catch (error) {
        console.error('Failed to fetch VAT refund history:', error);
      } finally {
        setIsHistoryLoading(false);
      }
    };

    fetchRefundHistory();
  }, [getAllPayments, refreshKey]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      // Simulate VAT calculation based on file - range between 1-10 PUSD
      setRefundAmount(Math.floor(Math.random() * 9) + 1);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setErrorMessage('Please select a file to upload');
      return;
    }

    if (!formData.receiverWalletAddress) {
      setErrorMessage('Please enter a receiver wallet address');
      return;
    }

    // Validate wallet address format (Solana address)
    if (!isValidEthereumAddress(formData.receiverWalletAddress)) {
      setErrorMessage('Please enter a valid BOT Chain wallet address');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      // Simulate document processing
      await new Promise(resolve => setTimeout(resolve, 2000));
      setStep('review');
    } catch (error) {
      setErrorMessage('Failed to process document. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const [pendingRefundId, setPendingRefundId] = useState<string | null>(null);

  const handleApprove = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    setTransactionHash('');

    try {
      if (!getConnectedAccount()) {
        throw new Error(
          "Wallet not connected. Connect MetaMask or BO Wallet on BOT Chain to approve this refund.",
        );
      }

      // Recipient wallet address
      const recipientAddress =
        entryMode === "manual"
          ? formData.receiverWalletAddress
          : formData.receiverWalletAddress;

      if (!recipientAddress) {
        throw new Error("Recipient wallet address is required");
      }

      // Amount in selected token
      const amount = refundAmount?.toString();
      if (!amount) throw new Error("Refund amount is required");

      console.log("Processing VAT refund payment:", {
        recipient: recipientAddress,
        amount,
        token: selectedToken,
      });

      // Create pending VAT refund record in database
      let refundId: string | null = null;
      try {
        // Prepare VAT refund details from form data
        const vatRefundDetails = {
          vatRegNo: formData.vatRegNo || undefined,
          receiptNo: formData.receiptNo || undefined,
          billAmount: formData.billAmount || undefined,
          vatAmount: formData.vatAmount || undefined,
          passportNo: formData.passportNo || undefined,
          flightNo: formData.flightNo || undefined,
          nationality: formData.nationality || undefined,
          dob: formData.dob || undefined,
          purchaseDate: formData.purchaseDate || undefined,
          merchantName: formData.merchantName || undefined,
          merchantAddress: formData.merchantAddress || undefined,
          receiverWalletAddress: formData.receiverWalletAddress || recipientAddress,
        };

        const pendingPayment = await createPayment({
          employee_id: "vat-refund",
          amount: refundAmount,
          token: selectedToken,
          transaction_hash: undefined,
          status: "pending",
          payment_date: new Date().toISOString(),
        });
        refundId = pendingPayment.id;
        setPendingRefundId(refundId);
        console.log('✅ Created pending VAT refund record:', refundId);
        
        // Save VAT refund details to Supabase
        try {
          const { error: detailsError } = await supabase
            .from('payments')
            .update({
              vat_refund_details: vatRefundDetails
            })
            .eq('id', refundId);
          
          if (detailsError) {
            console.error('Error saving VAT refund details:', detailsError);
          } else {
            console.log('✅ Saved VAT refund details to Supabase');
          }
        } catch (detailsErr) {
          console.error('Failed to save VAT refund details (non-critical):', detailsErr);
        }
      } catch (dbError) {
        console.error("Failed to create pending VAT refund record:", dbError);
        // Continue anyway - we'll try to create it later
      }

      setStep("sign");

      const qrData = buildPaymentQrUrl({
        recipient: recipientAddress.trim(),
        amountUi: parseFloat(amount),
        token: selectedToken,
        label: 'Gemetra VAT',
        message: `${selectedToken} VAT refund payment`,
      });
      setQrValue(qrData);

      // Send selected-token transaction
      const result = await sendPayment(recipientAddress, parseFloat(amount), selectedToken);
      
      if (!result.success) {
        throw new Error(result.error || "Transaction failed");
      }
      
      const tx = result.txHash;

      console.log("Transaction sent:", tx);

      await recordVatRefundOnChain({
        claimId: pendingRefundId || crypto.randomUUID(),
        recipient: recipientAddress,
        amount: refundAmount,
        token: selectedToken,
        receiptRef: formData.receiptNo || selectedFile?.name || "vat-refund",
      });

        // Update pending refund record to completed, or create new one if pending wasn't created
        try {
          if (pendingRefundId) {
            // Update the existing pending record in Supabase
            const { error: updateError } = await supabase
              .from('payments')
              .update({
                transaction_hash: tx,
                status: 'completed',
                payment_date: new Date().toISOString()
              })
              .eq('id', pendingRefundId);
            
            if (updateError) {
              console.error('Error updating payment in Supabase:', updateError);
            } else {
              console.log('✅ Updated pending VAT refund to completed in Supabase:', pendingRefundId);
            }
            
            // Also update via usePayments hook for localStorage
            try {
              await updatePaymentStatus(pendingRefundId, 'completed', tx);
            } catch (hookError) {
              console.error('Error updating via hook (non-critical):', hookError);
            }
          } else {
            // Create new completed record if pending wasn't created
            const vatRefundDetails = {
              vatRegNo: formData.vatRegNo || undefined,
              receiptNo: formData.receiptNo || undefined,
              billAmount: formData.billAmount || undefined,
              vatAmount: formData.vatAmount || undefined,
              passportNo: formData.passportNo || undefined,
              flightNo: formData.flightNo || undefined,
              nationality: formData.nationality || undefined,
              dob: formData.dob || undefined,
              purchaseDate: formData.purchaseDate || undefined,
              merchantName: formData.merchantName || undefined,
              merchantAddress: formData.merchantAddress || undefined,
              receiverWalletAddress: formData.receiverWalletAddress || recipientAddress,
            };

            const completedPayment = await createPayment({
              employee_id: "vat-refund",
              amount: refundAmount,
              token: selectedToken,
              transaction_hash: tx,
              status: "completed",
              payment_date: new Date().toISOString(),
            });
            console.log('✅ Created completed VAT refund record:', completedPayment.id);
            
            // Save VAT refund details
            try {
              const { error: detailsError } = await supabase
                .from('payments')
                .update({
                  vat_refund_details: vatRefundDetails
                })
                .eq('id', completedPayment.id);
              
              if (detailsError) {
                console.error('Error saving VAT refund details:', detailsError);
              } else {
                console.log('✅ Saved VAT refund details to Supabase');
              }
            } catch (detailsErr) {
              console.error('Failed to save VAT refund details (non-critical):', detailsErr);
            }
          }
        
        // Award points for VAT refund (15 points)
        try {
          await earnPoints(15, 'vat_refund', tx, `VAT refund of ${refundAmount.toFixed(2)} ${selectedToken}`);
          console.log('🎉 Earned 15 points for VAT refund!');
        } catch (pointsError) {
          console.error('Failed to award points (non-critical):', pointsError);
        }
      } catch (dbError) {
        console.error("Failed to update VAT refund payment:", dbError);
      }

      setTransactionHash(tx);
      setQrValue('');
      setTransactionStatus("confirmed");
    } catch (error) {
      console.error("Error in handleApprove:", error);
      let errorMessage = "An unexpected error occurred";

      if (error instanceof Error) {
        if (error.message.includes("insufficient funds")) {
          errorMessage = "Insufficient funds in wallet.";
        } else if (error.message.includes("Wallet not connected")) {
          errorMessage = "Wallet is not connected. Please connect your wallet.";
        } else {
          errorMessage = error.message;
        }
      }

      setErrorMessage(errorMessage);
      setTransactionStatus("rejected");
      setStep("sign");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSign = async () => {
    // If we already have a transaction status (from handleApprove), no need to process again
    if (transactionStatus !== 'waiting') {
      if (transactionStatus === 'confirmed') {
        setStep('confirmation');
      }
      return;
    }

    setIsLoading(true);
    setTransactionHash('');
    try {
      // Check wallet connection
      if (!getConnectedAccount()) {
        throw new Error('Wallet not connected. Please connect your wallet first.');
      }

      // Prepare recipient data for the payment
      const recipientAddress = entryMode === 'manual' 
        ? formData.receiverWalletAddress 
        : (getConnectedAccount() || '');

      if (!recipientAddress || !isValidEthereumAddress(recipientAddress)) {
        throw new Error('Valid recipient wallet address is required');
      }

      // Process the payment using selected token transfer
      const result = await sendPayment(recipientAddress, refundAmount, selectedToken);

      if (result.success) {
        setTransactionHash(result.txHash);

        // Update pending refund record to completed, or create new one
        try {
          if (pendingRefundId) {
            const { error: updateError } = await supabase
              .from('payments')
              .update({
                transaction_hash: result.txHash,
                status: 'completed',
                payment_date: new Date().toISOString()
              })
              .eq('id', pendingRefundId);
            
            if (updateError) {
              console.error('Error updating payment in Supabase:', updateError);
            } else {
              console.log('✅ Updated pending VAT refund to completed in Supabase:', pendingRefundId);
            }
            
            // Also update via usePayments hook
            try {
              await updatePaymentStatus(pendingRefundId, 'completed', result.txHash);
            } catch (hookError) {
              console.error('Error updating via hook (non-critical):', hookError);
            }
          } else {
            const vatRefundDetails = {
              vatRegNo: formData.vatRegNo || undefined,
              receiptNo: formData.receiptNo || undefined,
              billAmount: formData.billAmount || undefined,
              vatAmount: formData.vatAmount || undefined,
              passportNo: formData.passportNo || undefined,
              flightNo: formData.flightNo || undefined,
              nationality: formData.nationality || undefined,
              dob: formData.dob || undefined,
              purchaseDate: formData.purchaseDate || undefined,
              merchantName: formData.merchantName || undefined,
              merchantAddress: formData.merchantAddress || undefined,
              receiverWalletAddress: formData.receiverWalletAddress || recipientAddress,
            };

            const completedPayment = await createPayment({
              employee_id: 'vat-refund',
              amount: refundAmount,
              token: selectedToken,
              transaction_hash: result.txHash,
              status: 'completed',
              payment_date: new Date().toISOString()
            });
            console.log('✅ Created completed VAT refund record:', completedPayment.id);
            
            // Save VAT refund details
            try {
              const { error: detailsError } = await supabase
                .from('payments')
                .update({
                  vat_refund_details: vatRefundDetails
                })
                .eq('id', completedPayment.id);
              
              if (detailsError) {
                console.error('Error saving VAT refund details:', detailsError);
              } else {
                console.log('✅ Saved VAT refund details to Supabase');
              }
            } catch (detailsErr) {
              console.error('Failed to save VAT refund details (non-critical):', detailsErr);
            }
          }
        } catch (dbError) {
          console.error('Failed to record VAT refund payment in database:', dbError);
        }

        // Set transaction as confirmed
        setTransactionStatus('confirmed');
        setQrValue('');
      } else {
        // Handle payment failure - update pending refund to failed
        if (pendingRefundId) {
          try {
            const { error: updateError } = await supabase
              .from('payments')
              .update({
                status: 'failed'
              })
              .eq('id', pendingRefundId);
            
            if (updateError) {
              console.error('Error updating to failed in Supabase:', updateError);
            } else {
              console.log('❌ Updated pending VAT refund to failed in Supabase:', pendingRefundId);
            }
            
            // Also update via usePayments hook
            try {
              await updatePaymentStatus(pendingRefundId, 'failed');
            } catch (hookError) {
              console.error('Error updating via hook (non-critical):', hookError);
            }
          } catch (dbError) {
            console.error('Failed to update VAT refund to failed:', dbError);
          }
        }
        setErrorMessage(result.error || 'Payment failed');
        setTransactionStatus('rejected');
      }
    } catch (error) {
      console.error('Error in handleSign:', error);
      let errorMessage = 'An unexpected error occurred';

      if (error instanceof Error) {
        if (error.message.includes('asset') && error.message.includes('missing from')) {
          errorMessage = 'Recipient has not opted-in to receive the selected token. They must opt-in first.';
        } else if (error.message.includes('Wallet not connected')) {
          errorMessage = 'Wallet is not connected. Please connect your wallet and try again.';
        } else {
          errorMessage = error.message;
        }
      }

      setErrorMessage(errorMessage);
      setTransactionStatus('rejected');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setStep('upload');
    setSelectedFile(null);
    setErrorMessage(null);
    setQrValue('');
    setTransactionStatus('waiting');
    setTransactionHash('');
    setRefundAmount(0);
    setPendingRefundId(null);
    // Refresh history data
    setRefreshKey(prev => prev + 1);
    setFormData({
      vatRegNo: '',
      receiptNo: '',
      billAmount: '',
      vatAmount: '',
      passportNo: '',
      flightNo: '',
      nationality: '',
      dob: '',
      purchaseDate: '',
      merchantName: '',
      merchantAddress: '',
      receiverWalletAddress: ''
    });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    // If VAT amount is updated, update refund amount
    if (name === 'vatAmount' && value) {
      const vatAmount = parseFloat(value);
      if (!isNaN(vatAmount)) {
        setRefundAmount(vatAmount);
      }
    }
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Basic validation
    if (!formData.vatRegNo || !formData.receiptNo || !formData.vatAmount || !formData.passportNo || !formData.receiverWalletAddress) {
      setErrorMessage('Please fill in all required fields');
      return;
    }

    // Validate wallet address format (Solana address)
    if (!isValidEthereumAddress(formData.receiverWalletAddress)) {
      setErrorMessage('Please enter a valid BOT Chain wallet address');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      // Simulate processing
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Parse VAT amount
      const vatAmount = parseFloat(formData.vatAmount);
      if (!isNaN(vatAmount)) {
        setRefundAmount(vatAmount);
      }

      setStep('review');
    } catch (error) {
      setErrorMessage('Failed to process your request. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };


  const renderUploadTab = () => {
    const selectedTokenDisplay = vatHistoryTokenLogo(selectedToken);
    switch (step) {
      case 'upload':
        return (
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-3 mb-2">
                <img
                  src="/usdt.png"
                  alt="USDT logo"
                  className="h-6 w-6 object-contain"
                />
                <h2 className="text-xl font-bold text-gray-900">Submit VAT Refund</h2>
              </div>
              <div className="flex border border-gray-300 rounded-lg overflow-hidden">
                <button
                  onClick={() => setEntryMode('upload')}
                  className={`flex items-center px-4 py-2 text-sm ${entryMode === 'upload'
                      ? 'bg-gray-900 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-100'
                    }`}
                >
                  <FileUp className="w-4 h-4 mr-2" />
                  Upload Document
                </button>
                <button
                  onClick={() => setEntryMode('manual')}
                  className={`flex items-center px-4 py-2 text-sm ${entryMode === 'manual'
                      ? 'bg-gray-900 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-100'
                    }`}
                >
                  <FormInput className="w-4 h-4 mr-2" />
                  Manual Entry
                </button>
              </div>
            </div>

            <p className="text-gray-600 mb-6">
              {entryMode === 'upload'
                ? 'Upload your VAT receipt document to process your refund. We support PDF, JPG, and PNG formats.'
                : 'Enter your VAT receipt details manually to process your refund.'}
            </p>

            {entryMode === 'upload' ? (
              <>
                <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-8 flex flex-col items-center justify-center mb-6">
                  <Upload className="w-12 h-12 text-blue-500 mb-4" />
                  <p className="text-gray-700 mb-4 text-center">Drag and drop your document here or click to browse</p>
                  <label className="cursor-pointer bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-6 rounded-lg transition-all duration-200">
                    Select File
                    <input
                      type="file"
                      className="hidden"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={handleFileChange}
                    />
                  </label>
                  {selectedFile && (
                    <div className="mt-4 flex items-center text-sm text-gray-600">
                      <FileCheck className="w-5 h-5 mr-2 text-green-500" />
                      {selectedFile.name}
                    </div>
                  )}
                </div>

                <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mb-6">
                  <h3 className="font-semibold text-gray-900 mb-4">Payment Details</h3>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Receiver Wallet Address <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        name="receiverWalletAddress"
                        value={formData.receiverWalletAddress}
                        onChange={handleInputChange}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="e.g. 0x1234...abcd"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Token</label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedToken('USDT')}
                          className={`border rounded-lg px-3 py-2 text-sm flex items-center justify-center gap-2 ${selectedToken === 'USDT' ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
                        >
                          <img src="/usdt.png" alt="USDT" className="h-4 w-4 object-contain" />
                          <span>USDT</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedToken('BOT')}
                          className={`border rounded-lg px-3 py-2 text-sm flex items-center justify-center gap-2 ${selectedToken === 'BOT' ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
                        >
                          <img src="/botchain.png" alt="BOT" className="h-4 w-4 object-contain" />
                          <span>BOT</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={handleUpload}
                    disabled={!selectedFile || !formData.receiverWalletAddress || isLoading}
                    className={`bg-gray-900 hover:bg-gray-800 text-white font-medium py-2 px-6 rounded-lg transition-all duration-200 ${!selectedFile || !formData.receiverWalletAddress || isLoading ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                  >
                    {isLoading ? 'Processing...' : 'Upload Document'}
                  </button>
                </div>
              </>
            ) : (
              <form onSubmit={handleManualSubmit} className="space-y-6">
                {errorMessage && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
                    {errorMessage}
                  </div>
                )}

                <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                  <h3 className="font-semibold text-gray-900 mb-4">Receipt Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">VAT Registration No. <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        name="vatRegNo"
                        value={formData.vatRegNo}
                        onChange={handleInputChange}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="e.g. GB123456789"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Receipt/Invoice No. <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        name="receiptNo"
                        value={formData.receiptNo}
                        onChange={handleInputChange}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="e.g. INV-12345"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Total Bill Amount</label>
                      <input
                        type="number"
                        name="billAmount"
                        value={formData.billAmount}
                        onChange={handleInputChange}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="e.g. 1000.00"
                        step="0.01"
                        min="0"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">VAT Amount <span className="text-red-500">*</span></label>
                      <input
                        type="number"
                        name="vatAmount"
                        value={formData.vatAmount}
                        onChange={handleInputChange}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="e.g. 200.00"
                        step="0.01"
                        min="0"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Purchase Date</label>
                      <input
                        type="date"
                        name="purchaseDate"
                        value={formData.purchaseDate}
                        onChange={handleInputChange}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Receiver Wallet Address <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        name="receiverWalletAddress"
                        value={formData.receiverWalletAddress}
                        onChange={handleInputChange}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="e.g. 0x1234...abcd"
                        required
                      />
                    </div>
                  </div>

                  <div className="mt-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Token</label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedToken('USDT')}
                          className={`border rounded-lg px-3 py-2 text-sm flex items-center justify-center gap-2 ${selectedToken === 'USDT' ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
                        >
                          <img src="/usdt.png" alt="USDT" className="h-4 w-4 object-contain" />
                          <span>USDT</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedToken('BOT')}
                          className={`border rounded-lg px-3 py-2 text-sm flex items-center justify-center gap-2 ${selectedToken === 'BOT' ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
                        >
                          <img src="/botchain.png" alt="BOT" className="h-4 w-4 object-contain" />
                          <span>BOT</span>
                        </button>
                      </div>
                  </div>

                  {formData.vatAmount && (
                    <div className="mt-4 p-3 bg-gray-100 border border-gray-200 rounded-lg">
                      <div className="flex justify-between items-center gap-3">
                        <span className="text-sm font-medium text-gray-700">Calculated Refund Amount:</span>
                        <span className="text-lg font-bold text-green-600 inline-flex items-center gap-2 shrink-0">
                          <img
                            src={selectedTokenDisplay.src}
                            alt={selectedTokenDisplay.alt}
                            className="h-5 w-5 object-contain"
                          />
                          {selectedToken}{' '}
                          {parseFloat(formData.vatAmount) > 0 ? parseFloat(formData.vatAmount).toFixed(2) : '0.00'}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                  <h3 className="font-semibold text-gray-900 mb-4">Personal Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Passport Number <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        name="passportNo"
                        value={formData.passportNo}
                        onChange={handleInputChange}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="e.g. AB1234567"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Flight Number</label>
                      <input
                        type="text"
                        name="flightNo"
                        value={formData.flightNo}
                        onChange={handleInputChange}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="e.g. BA123"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Country of Nationality</label>
                      <input
                        type="text"
                        name="nationality"
                        value={formData.nationality}
                        onChange={handleInputChange}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="e.g. United Kingdom"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
                      <input
                        type="date"
                        name="dob"
                        value={formData.dob}
                        onChange={handleInputChange}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                  <h3 className="font-semibold text-gray-900 mb-4">Merchant Information</h3>
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Merchant Name</label>
                      <input
                        type="text"
                        name="merchantName"
                        value={formData.merchantName}
                        onChange={handleInputChange}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="e.g. ABC Store Ltd."
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Merchant Address</label>
                      <input
                        type="text"
                        name="merchantAddress"
                        value={formData.merchantAddress}
                        onChange={handleInputChange}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="e.g. 123 High Street, London, UK"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className={`bg-gray-900 hover:bg-gray-800 text-white font-medium py-2 px-6 rounded-lg transition-all duration-200 ${isLoading ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                  >
                    {isLoading ? 'Processing...' : 'Submit Details'}
                  </button>
                </div>
              </form>
            )}
          </div>
        );

      case 'review':
        return (
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <img
                src="/usdt.png"
                alt="USDT logo"
                className="h-6 w-6 object-contain"
              />
              <h2 className="text-xl font-bold text-gray-900">Review VAT Refund Details</h2>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mb-6">
              {entryMode === 'upload' ? (
                <div className="flex items-start mb-4">
                  <div className="bg-blue-100 p-3 rounded-lg mr-4">
                    <FileText className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{selectedFile?.name}</h3>
                    <p className="text-sm text-gray-600">Uploaded just now</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-start mb-4">
                  <div className="bg-blue-100 p-3 rounded-lg mr-4">
                    <FormInput className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Manual Entry</h3>
                    <p className="text-sm text-gray-600">Submitted just now</p>
                  </div>
                </div>
              )}

              <div className="space-y-4">
                {entryMode === 'manual' && (
                  <>
                    <div className="border-b border-gray-200 pb-4 mb-4">
                      <h4 className="font-medium text-gray-900 mb-3">Receipt Information</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <p className="text-sm text-gray-600">VAT Registration No.</p>
                          <p className="text-sm font-medium text-gray-900">{formData.vatRegNo}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Receipt/Invoice No.</p>
                          <p className="text-sm font-medium text-gray-900">{formData.receiptNo}</p>
                        </div>
                        {formData.billAmount && (
                          <div>
                            <p className="text-sm text-gray-600">Total Bill Amount</p>
                            <p className="text-sm font-medium text-gray-900">${parseFloat(formData.billAmount).toFixed(2)}</p>
                          </div>
                        )}
                        {formData.purchaseDate && (
                          <div>
                            <p className="text-sm text-gray-600">Purchase Date</p>
                            <p className="text-sm font-medium text-gray-900">{formData.purchaseDate}</p>
                          </div>
                        )}
                        <div>
                          <p className="text-sm text-gray-600">Receiver Wallet Address</p>
                          <p className="text-sm font-medium text-gray-900 break-all">{formData.receiverWalletAddress}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Token</p>
                          <p className="text-sm font-medium text-gray-900">{selectedToken}</p>
                        </div>
                      </div>
                    </div>

                    <div className="border-b border-gray-200 pb-4 mb-4">
                      <h4 className="font-medium text-gray-900 mb-3">Personal Information</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <p className="text-sm text-gray-600">Passport Number</p>
                          <p className="text-sm font-medium text-gray-900">{formData.passportNo}</p>
                        </div>
                        {formData.flightNo && (
                          <div>
                            <p className="text-sm text-gray-600">Flight Number</p>
                            <p className="text-sm font-medium text-gray-900">{formData.flightNo}</p>
                          </div>
                        )}
                        {formData.nationality && (
                          <div>
                            <p className="text-sm text-gray-600">Country of Nationality</p>
                            <p className="text-sm font-medium text-gray-900">{formData.nationality}</p>
                          </div>
                        )}
                        {formData.dob && (
                          <div>
                            <p className="text-sm text-gray-600">Date of Birth</p>
                            <p className="text-sm font-medium text-gray-900">{formData.dob}</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {(formData.merchantName || formData.merchantAddress) && (
                      <div className="border-b border-gray-200 pb-4 mb-4">
                        <h4 className="font-medium text-gray-900 mb-3">Merchant Information</h4>
                        <div className="grid grid-cols-1 gap-3">
                          {formData.merchantName && (
                            <div>
                              <p className="text-sm text-gray-600">Merchant Name</p>
                              <p className="text-sm font-medium text-gray-900">{formData.merchantName}</p>
                            </div>
                          )}
                          {formData.merchantAddress && (
                            <div>
                              <p className="text-sm text-gray-600">Merchant Address</p>
                              <p className="text-sm font-medium text-gray-900">{formData.merchantAddress}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </>
                )}

                <div className="flex justify-between border-b border-gray-200 pb-2">
                  <span className="text-gray-600">Document Type:</span>
                  <span className="text-gray-900 font-medium">VAT Receipt</span>
                </div>
                <div className="flex justify-between border-b border-gray-200 pb-2">
                  <span className="text-gray-600">Receiver Address:</span>
                  <span className="text-gray-900 font-medium break-all">{formData.receiverWalletAddress}</span>
                </div>
                <div className="flex justify-between border-b border-gray-200 pb-2">
                  <span className="text-gray-600">Token Type:</span>
                  <span className="text-gray-900 font-medium">{selectedToken}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-900 font-semibold">Total Refund:</span>
                  <span className="text-green-600 font-bold">{refundAmount.toFixed(2)} {selectedToken}</span>
                </div>
              </div>
            </div>

            <div className="flex justify-between">
              <button
                onClick={handleReset}
                className="border border-gray-300 text-gray-700 font-medium py-2 px-6 rounded-lg transition-all duration-200 hover:bg-gray-50"
              >
                Back
              </button>
              <button
                onClick={handleApprove}
                disabled={isLoading}
                className={`bg-gray-900 hover:bg-gray-800 text-white font-medium py-2 px-6 rounded-lg transition-all duration-200 ${isLoading ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
              >
                {isLoading ? 'Processing...' : 'Approve & Continue'}
              </button>
            </div>
          </div>
        );

      case 'sign':
        return (
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <img
                src="/usdt.png"
                alt="USDT logo"
                className="h-6 w-6 object-contain"
              />
              <h2 className="text-xl font-bold text-gray-900">Sign with BOT Chain Wallet</h2>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 flex flex-col items-center justify-center mb-6">
              {transactionStatus === 'waiting' ? (
                <>
                  <QrCode className="w-16 h-16 text-blue-500 mb-4" />
                  <h3 className="font-semibold text-gray-900 mb-2">Check Your Wallet</h3>
                  <p className="text-gray-600 text-center mb-2">
                    A transaction popup should appear in MetaMask or BO Wallet
                  </p>
                  <p className="text-gray-500 text-center text-sm mb-6">
                    Scan the QR with your wallet app for this BOT Chain transfer (recommended).
                  </p>

                  <div className="bg-white border-2 border-gray-300 rounded-lg p-6 w-[280px] h-[280px] flex items-center justify-center mb-4 shadow-lg">
                    {qrValue ? (
                      <div className="flex flex-col items-center">
                        <QRCodeSVG
                          value={qrValue}
                          size={240}
                          level="H"
                          includeMargin={true}
                          className="mb-2"
                        />
                        <div className="text-xs text-gray-500 mt-2 text-center">
                          Scan with your wallet app
                        </div>
                      </div>
                    ) : (
                      <div className="text-center">
                        <QrCode className="w-16 h-16 mx-auto mb-3 text-gray-400" />
                        <div className="text-sm text-gray-500">Generating QR Code...</div>
                      </div>
                    )}
                  </div>

                  <div className="w-full max-w-md bg-blue-50 border border-blue-100 rounded-lg p-4 mt-2">
                    <h4 className="font-medium text-blue-800 mb-2">Transaction Details</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-blue-700">Amount:</span>
                        <span className="text-sm font-medium text-blue-900">{selectedToken} {refundAmount.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-blue-700">Receiver:</span>
                        <span className="text-sm font-medium text-blue-900 break-all">{entryMode === 'manual' ? formData.receiverWalletAddress : 'Gemetra VAT Refund Service'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-blue-700">Network Fee:</span>
                        <span className="text-sm font-medium text-blue-900">~0.00002 BOT</span>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center">
                  {transactionStatus === 'confirmed' ? (
                    <>
                      <div className="relative mb-6">
                        <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center mx-auto shadow-lg">
                          <CheckCircle className="w-10 h-10 text-white" />
                        </div>
                        <div className="absolute inset-0 w-20 h-20 bg-green-400 rounded-full mx-auto animate-ping opacity-20"></div>
                      </div>
                      <div className="mb-4">
                        <div className="flex items-center justify-center gap-2 mb-3">
                          <img
                            src="/usdt.png"
                            alt="USDT logo"
                            className="h-5 w-5 object-contain"
                          />
                          <h3 className="text-2xl font-bold text-gray-900">Transaction Confirmed!</h3>
                        </div>
                        <p className="text-gray-600 text-base">
                          Your transaction has been confirmed on BOT Chain
                        </p>
                      </div>
                      <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl p-4 mb-6 shadow-sm">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                          <span className="text-green-800 font-medium text-sm">Transaction Hash:</span>
                          {transactionHash ? (
                            <a
                              href={`https://scan.botchain.ai/tx/${transactionHash}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-green-900 font-mono text-sm flex items-center justify-center sm:justify-end gap-2 hover:text-blue-600 hover:underline bg-white/60 px-3 py-1.5 rounded-lg transition-all"
                            >
                              <span className="truncate max-w-40">{`${transactionHash.slice(0, 10)}...${transactionHash.slice(-8)}`}</span>
                              <ExternalLink className="w-4 h-4 flex-shrink-0" />
                            </a>
                          ) : (
                            <span className="text-amber-700 text-sm bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-lg">
                              Signature unavailable. Refresh refund history to verify this payment.
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <div className="flex items-center justify-center gap-2 text-sm text-blue-800">
                          <img
                              src="/botchain.png"
                            alt="BOT Chain"
                            className="h-4 w-4 object-contain"
                          />
                          <span>Secured by BOT Chain • Powered by USDT</span>
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <AlertCircle className="w-8 h-8 text-red-500" />
                      </div>
                      <h3 className="font-semibold text-gray-900 mb-2">Transaction Rejected</h3>
                      <p className="text-gray-600 mb-4">
                        The transaction was rejected or failed to complete
                      </p>
                      <div className="bg-red-50 border border-red-100 rounded-lg p-3 mb-4">
                        <p className="text-sm text-red-700">
                          Please try again or contact support if the issue persists
                        </p>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            <div className="flex justify-between">
              <button
                onClick={handleReset}
                className="border border-gray-300 text-gray-700 font-medium py-2 px-6 rounded-lg transition-all duration-200 hover:bg-gray-50"
              >
                {transactionStatus !== 'waiting' ? 'Back' : 'Cancel'}
              </button>
              {transactionStatus === 'waiting' ? (
                <button
                  onClick={handleSign}
                  disabled={isLoading}
                  className={`bg-gray-900 hover:bg-gray-800 text-white font-medium py-2 px-6 rounded-lg transition-all duration-200 ${isLoading ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                >
                  {isLoading ? 'Processing...' : 'I\'ve Scanned the QR Code'}
                </button>
              ) : (
                <button
                  onClick={() => transactionStatus === 'confirmed' ? setStep('confirmation') : handleReset()}
                  className={`${transactionStatus === 'confirmed'
                      ? 'bg-gray-900 hover:bg-gray-800 text-white'
                      : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
                    } font-medium py-2 px-6 rounded-lg transition-all duration-200`}
                >
                  {transactionStatus === 'confirmed' ? 'Continue' : 'Try Again'}
                </button>
              )}
            </div>
          </div>
        );

      case 'confirmation':
        return (
          <div className="bg-white rounded-xl border border-gray-200 shadow-lg p-8">
            <div className="text-center mb-8">
              <div className="relative mb-6">
                <div className="w-24 h-24 bg-gradient-to-br from-green-400 to-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-xl">
                  <CheckCircle className="w-12 h-12 text-white" />
                </div>
                <div className="absolute inset-0 w-24 h-24 bg-green-400 rounded-full mx-auto animate-ping opacity-20"></div>
              </div>
              <div className="flex items-center justify-center gap-3 mb-3">
                <img
                  src="/usdt.png"
                  alt="USDT logo"
                  className="h-7 w-7 object-contain"
                />
                <h2 className="text-2xl font-bold text-gray-900">VAT Refund Submitted Successfully</h2>
              </div>
              <p className="text-gray-600 text-base max-w-md mx-auto">
                Your VAT refund request has been successfully submitted and is being processed on BOT Chain
              </p>
            </div>

            <div className="bg-gradient-to-br from-gray-50 to-gray-100 border-2 border-gray-200 rounded-xl p-6 mb-8 shadow-inner">
              <div className="space-y-4">
                <div className="flex justify-between items-center border-b border-gray-300 pb-3">
                  <span className="text-gray-700 font-medium">Refund ID:</span>
                  <span className="text-gray-900 font-semibold text-lg">VAT-{Date.now().toString().slice(-7)}</span>
                </div>
                <div className="flex justify-between items-center border-b border-gray-300 pb-3">
                  <span className="text-gray-700 font-medium">Submission Type:</span>
                  <span className="text-gray-900 font-semibold">
                    {entryMode === 'upload' ? 'Document Upload' : 'Manual Entry'}
                  </span>
                </div>
                {entryMode === 'upload' && selectedFile && (
                  <div className="flex justify-between items-center border-b border-gray-300 pb-3">
                    <span className="text-gray-700 font-medium">Document:</span>
                    <span className="text-gray-900 font-semibold truncate max-w-xs">{selectedFile.name}</span>
                  </div>
                )}
                {entryMode === 'manual' && (
                  <>
                    <div className="flex justify-between items-center border-b border-gray-300 pb-3">
                      <span className="text-gray-700 font-medium">VAT Registration No:</span>
                      <span className="text-gray-900 font-semibold">{formData.vatRegNo}</span>
                    </div>
                    <div className="flex justify-between items-center border-b border-gray-300 pb-3">
                      <span className="text-gray-700 font-medium">Receipt No:</span>
                      <span className="text-gray-900 font-semibold">{formData.receiptNo}</span>
                    </div>
                    <div className="flex justify-between items-center border-b border-gray-300 pb-3">
                      <span className="text-gray-700 font-medium">Passport No:</span>
                      <span className="text-gray-900 font-semibold">{formData.passportNo}</span>
                    </div>
                  </>
                )}
                <div className="flex justify-between items-center border-b border-gray-300 pb-3">
                  <span className="text-gray-700 font-medium">Refund Amount:</span>
                  <div className="flex items-center gap-2">
                    <img
                      src="/usdt.png"
                      alt="USDT"
                      className="h-5 w-5 object-contain"
                    />
                    <span className="text-green-600 font-bold text-lg">{selectedToken} {refundAmount.toFixed(2)}</span>
                  </div>
                </div>
                <div className="flex justify-between items-center border-b border-gray-300 pb-3">
                  <span className="text-gray-700 font-medium">Submission Date:</span>
                  <span className="text-gray-900 font-semibold">{new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                </div>
                {transactionHash && (
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-gray-300 pb-3">
                    <span className="text-gray-700 font-medium">Transaction Hash:</span>
                    <a
                      href={`https://scan.botchain.ai/tx/${transactionHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 font-mono text-sm flex items-center gap-2 hover:text-blue-800 hover:underline bg-white px-3 py-1.5 rounded-lg border border-blue-200 transition-all"
                    >
                      <span className="truncate max-w-40">{transactionHash.slice(0, 10)}...{transactionHash.slice(-8)}</span>
                      <ExternalLink className="w-4 h-4 flex-shrink-0" />
                    </a>
                  </div>
                )}
                <div className="flex justify-between items-center pt-2">
                  <span className="text-gray-700 font-medium">Status:</span>
                  <span className="inline-flex items-center gap-2 bg-green-100 text-green-700 font-semibold px-4 py-1.5 rounded-full">
                    <CheckCircle className="w-4 h-4" />
                    Completed
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-center gap-3">
              <button
                onClick={handleReset}
                className="bg-gradient-to-r from-gray-900 to-gray-800 hover:from-gray-800 hover:to-gray-700 text-white font-semibold py-3 px-8 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                Submit Another Refund
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className="border-2 border-gray-300 hover:border-gray-400 text-gray-700 hover:text-gray-900 font-semibold py-3 px-8 rounded-lg transition-all duration-200 bg-white hover:bg-gray-50"
              >
                View History
              </button>
            </div>
          </div>
        );

      case 'error':
        return (
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-8 h-8 text-red-500" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Error</h2>
              <p className="text-gray-600">
                {errorMessage || 'An unexpected error occurred. Please try again.'}
              </p>
            </div>

            <div className="flex justify-center">
              <button
                onClick={handleReset}
                className="bg-gray-900 hover:bg-gray-800 text-white font-medium py-2 px-6 rounded-lg transition-all duration-200"
              >
                Try Again
              </button>
            </div>
          </div>
        );
    }
  };

  const renderHistoryTab = () => {
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-lg p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
          <div className="flex items-center gap-3">
            <img
              src="/usdt.png"
              alt="USDT logo"
              className="h-7 w-7 object-contain"
            />
            <h2 className="text-2xl font-bold text-gray-900">VAT Refund History</h2>
          </div>
          <div className="relative w-full sm:w-auto">
            <input
              type="text"
              placeholder="Search refunds..."
              className="w-full sm:w-64 pl-10 pr-4 py-2.5 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
            />
            <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
          </div>
        </div>

        {isHistoryLoading ? (
          <div className="flex flex-col justify-center items-center py-16">
            <div className="w-12 h-12 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
            <span className="text-gray-600 font-medium">Loading refund history...</span>
          </div>
        ) : refundHistory.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-700 mb-2">No VAT refund history found</h3>
            <p className="text-gray-500 text-sm max-w-md mx-auto">
              Submit a VAT refund to see it appear in your history. All refunds are processed on BOT Chain using USDT or BOT.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto -mx-2 sm:mx-0">
            <div className="inline-block min-w-full align-middle">
              <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 rounded-lg">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                    <tr>
                      <th className="px-4 sm:px-6 py-3.5 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        ID
                      </th>
                      <th className="px-4 sm:px-6 py-3.5 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Date
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
                      <th className="px-4 sm:px-6 py-3.5 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Transaction
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {refundHistory.map((refund, index) => {
                      const rowTokenLogo = vatHistoryTokenLogo(refund.token);
                      return (
                      <tr 
                        key={refund.id} 
                        className={`hover:bg-gray-50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}
                      >
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
                          <div className="text-sm text-gray-900">
                            {new Date(refund.date).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            })}
                          </div>
                          <div className="text-xs text-gray-500">
                            {new Date(refund.date).toLocaleTimeString('en-US', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </div>
                        </td>
                        <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-2">
                            <img
                              src={rowTokenLogo.src}
                              alt={rowTokenLogo.alt}
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
                              src={rowTokenLogo.src}
                              alt={rowTokenLogo.alt}
                              className="h-3.5 w-3.5 object-contain"
                            />
                            {refund.token || 'USDT'}
                          </div>
                        </td>
                        <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-center">
                          {refund.status === 'completed' ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-gradient-to-r from-green-100 to-emerald-100 text-green-700 border border-green-200">
                              <CheckCircle className="w-3.5 h-3.5" />
                              Completed
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-700 border border-yellow-200">
                              <Clock className="w-3.5 h-3.5" />
                              Pending
                            </span>
                          )}
                        </td>
                        <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-center">
                          {refund.transaction_hash ? (
                            <a
                              href={`https://scan.botchain.ai/tx/${refund.transaction_hash}`}
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
                      </tr>
                    );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="w-full min-w-0 max-w-full mx-auto px-3 sm:px-4 py-6">


      <div className="mb-6 min-w-0">
        <div className="border-b border-gray-200 min-w-0">
          <nav className="flex gap-4 sm:gap-8 overflow-x-auto pb-px -mb-px">
            <button
              onClick={() => setActiveTab('upload')}
              className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap shrink-0 ${activeTab === 'upload'
                  ? 'border-gray-900 text-gray-900'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
            >
              Submit New Refund
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap shrink-0 ${activeTab === 'history'
                  ? 'border-gray-900 text-gray-900'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
            >
              Refund History
            </button>
          </nav>
        </div>
      </div>

      {activeTab === 'upload' ? renderUploadTab() : renderHistoryTab()}
    </div>
  );
};
