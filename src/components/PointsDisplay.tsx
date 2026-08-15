import React, { useState } from 'react';
import { Coins, Gift, History, ArrowRight, X, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePoints } from '../hooks/usePoints';
import { formatAddress, isValidSolanaAddress } from '../utils/ethereum';

interface PointsDisplayProps {
  walletAddress: string;
  isWalletConnected: boolean;
}

export const PointsDisplay: React.FC<PointsDisplayProps> = ({
  walletAddress,
  isWalletConnected
}) => {
  const { userPoints, transactions, convertPointsToMnee, conversionRate, loading } = usePoints();
  const [showConversionModal, setShowConversionModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [pointsToConvert, setPointsToConvert] = useState('');
  const [recipientAddress, setRecipientAddress] = useState('');
  const [isConverting, setIsConverting] = useState(false);
  const [conversionError, setConversionError] = useState<string | null>(null);

  const totalPoints = userPoints?.total_points || 0;
  const lifetimePoints = userPoints?.lifetime_points || 0;
  const mneeEquivalent = totalPoints / conversionRate;

  const handleConvert = async () => {
    if (!pointsToConvert || parseFloat(pointsToConvert) <= 0) {
      setConversionError('Please enter a valid amount');
      return;
    }

    const points = parseFloat(pointsToConvert);
    if (points < conversionRate) {
      setConversionError(`Minimum ${conversionRate} points required`);
      return;
    }

    if (points > totalPoints) {
      setConversionError('Insufficient points');
      return;
    }

    // Validate recipient address if provided
    const finalRecipientAddress = recipientAddress.trim() || walletAddress;
    if (recipientAddress.trim() && !isValidSolanaAddress(recipientAddress.trim())) {
      setConversionError('Invalid recipient address. Please enter a valid Solana address.');
      return;
    }

    setIsConverting(true);
    setConversionError(null);

    try {
      const result = await convertPointsToMnee(points, finalRecipientAddress);
      
      // Show success message with details
      let successMessage = `✅ Successfully converted ${points} points to ${result.mneeAmount.toFixed(6)} PUSD!\n\n` +
        `📊 Conversion Details:\n` +
        `• Points Converted: ${points}\n` +
        `• PUSD Amount: ${result.mneeAmount.toFixed(6)} PUSD\n` +
        `• Remaining Points: ${result.remainingPoints}\n`;
      
      const recipient = recipientAddress.trim() || walletAddress;
      if (result.transactionHash && result.transactionHash.startsWith('0x')) {
        // Real blockchain transaction
        successMessage += `\n🔗 Transaction Hash: ${result.transactionHash}\n` +
          `✅ PUSD tokens have been sent to: ${formatAddress(recipient)}\n` +
          `Check the wallet balance to see the tokens.`;
      } else if (result.transactionHash?.includes('pending')) {
        // Pending conversion (requires treasury wallet)
        successMessage += `\n⏳ Status: Pending\n` +
          `💡 Note: In production, a treasury wallet would send ${result.mneeAmount.toFixed(6)} PUSD to ${formatAddress(recipient)}.\n` +
          `For this demo, the conversion has been recorded and will be processed.`;
      } else {
        // Conversion recorded but no transfer
        successMessage += `\n📝 Conversion recorded in system.\n` +
          `💡 In production, PUSD tokens would be automatically sent to your wallet.`;
      }
      
      alert(successMessage);
      setShowConversionModal(false);
      setPointsToConvert('');
    } catch (error) {
      setConversionError(error instanceof Error ? error.message : 'Conversion failed');
    } finally {
      setIsConverting(false);
    }
  };

  if (!isWalletConnected) {
    return null;
  }

  return (
    <>
      {/* Points Badge in Header */}
      <div className="flex items-center space-x-2">
        <button
          onClick={() => setShowConversionModal(true)}
          className="flex items-center space-x-2 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white px-4 py-2 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg"
        >
          <Sparkles className="w-4 h-4" />
          <span className="font-semibold">{totalPoints.toLocaleString()}</span>
          <span className="text-xs opacity-90">Points</span>
        </button>
        
        <button
          onClick={() => setShowHistoryModal(true)}
          className="p-2 text-gray-600 hover:text-gray-900 transition-colors rounded-lg hover:bg-gray-100"
          title="Points History"
        >
          <History className="w-5 h-5" />
        </button>
      </div>

      {/* Conversion Modal */}
      <AnimatePresence>
        {showConversionModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
            onClick={() => setShowConversionModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-xl p-6 max-w-md w-full shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-2xl font-bold text-gray-900 flex items-center space-x-2">
                  <Gift className="w-6 h-6 text-purple-600" />
                  <span>Convert Points</span>
                </h3>
                <button
                  onClick={() => setShowConversionModal(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="mb-6">
                <div className="bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg p-4 mb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-purple-700 font-medium">Available Points</p>
                      <p className="text-3xl font-bold text-purple-900">{totalPoints.toLocaleString()}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-purple-700 font-medium">PUSD Equivalent</p>
                      <p className="text-2xl font-bold text-purple-900">{mneeEquivalent.toFixed(4)} PUSD</p>
                    </div>
                  </div>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Points to Convert
                  </label>
                  <input
                    type="number"
                    value={pointsToConvert}
                    onChange={(e) => {
                      setPointsToConvert(e.target.value);
                      setConversionError(null);
                    }}
                    placeholder={`Minimum ${conversionRate} points`}
                    min={conversionRate}
                    max={totalPoints}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-lg"
                  />
                  {pointsToConvert && parseFloat(pointsToConvert) > 0 && (
                    <p className="mt-2 text-sm text-gray-600">
                      = {(parseFloat(pointsToConvert) / conversionRate).toFixed(6)} PUSD
                    </p>
                  )}
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Recipient Address (Optional)
                  </label>
                  <input
                    type="text"
                    value={recipientAddress}
                    onChange={(e) => {
                      setRecipientAddress(e.target.value);
                      setConversionError(null);
                    }}
                    placeholder={walletAddress || "Enter Solana address (defaults to your wallet)"}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm font-mono"
                  />
                  <p className="mt-2 text-xs text-gray-500">
                    {recipientAddress.trim() 
                      ? `Tokens will be sent to: ${formatAddress(recipientAddress.trim())}`
                      : `Tokens will be sent to your connected wallet: ${formatAddress(walletAddress)}`
                    }
                  </p>
                </div>

                {conversionError && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-800">{conversionError}</p>
                  </div>
                )}

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                  <p className="text-xs text-blue-800">
                    💡 <strong>Conversion Rate:</strong> {conversionRate} points = 1 PUSD
                  </p>
                  <p className="text-xs text-blue-700 mt-1">
                    Note: In production, PUSD tokens will be sent directly to your wallet address.
                  </p>
                </div>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => setShowConversionModal(false)}
                  className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConvert}
                  disabled={isConverting || !pointsToConvert || parseFloat(pointsToConvert) < conversionRate}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white rounded-lg transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
                >
                  {isConverting ? 'Converting...' : 'Convert to PUSD'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* History Modal */}
      <AnimatePresence>
        {showHistoryModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
            onClick={() => setShowHistoryModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-gray-900 flex items-center space-x-2">
                  <History className="w-6 h-6 text-purple-600" />
                  <span>Points History</span>
                </h3>
                <button
                  onClick={() => setShowHistoryModal(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="mb-6 grid grid-cols-2 gap-4">
                <div className="bg-purple-50 rounded-lg p-4">
                  <p className="text-sm text-purple-700 font-medium mb-1">Current Points</p>
                  <p className="text-2xl font-bold text-purple-900">{totalPoints.toLocaleString()}</p>
                </div>
                <div className="bg-blue-50 rounded-lg p-4">
                  <p className="text-sm text-blue-700 font-medium mb-1">Lifetime Points</p>
                  <p className="text-2xl font-bold text-blue-900">{lifetimePoints.toLocaleString()}</p>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold text-gray-900 mb-3">Recent Transactions</h4>
                {transactions.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Coins className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No point transactions yet</p>
                    <p className="text-sm mt-1">Start making payments to earn points!</p>
                  </div>
                ) : (
                  transactions.slice(0, 20).map((transaction) => (
                    <div
                      key={transaction.id}
                      className={`flex items-center justify-between p-3 rounded-lg border ${
                        transaction.transaction_type === 'earned'
                          ? 'bg-green-50 border-green-200'
                          : transaction.transaction_type === 'converted'
                          ? 'bg-purple-50 border-purple-200'
                          : 'bg-gray-50 border-gray-200'
                      }`}
                    >
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          {transaction.transaction_type === 'earned' ? (
                            <Coins className="w-4 h-4 text-green-600" />
                          ) : (
                            <Gift className="w-4 h-4 text-purple-600" />
                          )}
                          <p className="font-medium text-gray-900">
                            {transaction.description || `${transaction.transaction_type} ${Math.abs(transaction.points)} points`}
                          </p>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(transaction.created_at).toLocaleString()}
                        </p>
                      </div>
                      <div className={`text-lg font-bold ${
                        transaction.transaction_type === 'earned'
                          ? 'text-green-600'
                          : 'text-purple-600'
                      }`}>
                        {transaction.transaction_type === 'earned' ? '+' : '-'}
                        {Math.abs(transaction.points).toLocaleString()}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
