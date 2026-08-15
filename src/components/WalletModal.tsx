import React, { useState, useEffect } from 'react';
import { X, Wallet, ExternalLink } from 'lucide-react';
import { useConnect } from 'wagmi';
import { motion, AnimatePresence } from 'framer-motion';

interface WalletModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WalletModal: React.FC<WalletModalProps> = ({ isOpen, onClose }) => {
  const { connect, connectors, isPending } = useConnect();
  const [connectingId, setConnectingId] = useState<string | null>(null);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      // Save current scroll position
      const scrollY = window.scrollY;
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      
      return () => {
        // Restore scroll position
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        window.scrollTo(0, scrollY);
      };
    }
  }, [isOpen]);

  // Filter out unwanted wallets
  const excludedWallets = ['keplr', 'subwallet', 'onewallet', 'flow'];
  const filteredConnectors = connectors.filter((connector) => {
    const connectorId = connector.id.toLowerCase();
    const connectorName = (connector.name || '').toLowerCase();
    return !excludedWallets.some(excluded => 
      connectorId.includes(excluded) || connectorName.includes(excluded)
    );
  });

  const handleConnect = async (connector: any) => {
    try {
      setConnectingId(connector.id);
      connect({ connector });
      // Close modal after a short delay to allow connection to start
      setTimeout(() => {
        onClose();
        setConnectingId(null);
      }, 500);
    } catch (error) {
      console.error('Failed to connect:', error);
      setConnectingId(null);
    }
  };

  const getWalletName = (connector: any): string | null => {
    const connectorId = connector.id.toLowerCase();
    const connectorName = (connector.name || '').toLowerCase();
    if (connectorId === 'solana-wallet-adapter' || connectorName.includes('solana wallets')) {
      return 'Solana wallets';
    }
    if (connectorId.includes('phantom') || connectorName.includes('phantom')) {
      return 'Phantom';
    }
    
    // Check connector ID and name for wallet identification
    if (connectorId.includes('metamask') || connectorName.includes('metamask')) {
      return 'MetaMask';
    }
    if (connectorId.includes('nightly') || connectorName.includes('nightly')) {
      return 'Nightly';
    }
    if (connectorId.includes('walletconnect') || connectorName.includes('walletconnect')) {
      return 'WalletConnect';
    }
    if (connectorId.includes('coinbase') || connectorName.includes('coinbase')) {
      return 'Coinbase Wallet';
    }
    
    // For injected connector, try to detect from window.ethereum
    if (connector.id === 'injected') {
      if (typeof window !== 'undefined') {
        const solana = (window as any).solana;
        if (solana?.isPhantom) return 'Phantom';
        const ethereum = (window as any).ethereum;
        if (ethereum?.isMetaMask) return 'MetaMask';
        if (ethereum?.isCoinbaseWallet) return 'Coinbase Wallet';
        if (ethereum?.isNightly) return 'Nightly';
        if (ethereum?.isRainbow) return 'Rainbow';
        // Filter out unwanted wallets
        if (ethereum?.isKeplr || ethereum?.keplr) return null; // Keplr
        if (ethereum?.isSubWallet || ethereum?.subwallet) return null; // Subwallet
        if (ethereum?.isOneWallet || ethereum?.onewallet) return null; // OneWallet
        if (ethereum?.flow) return null; // Flow
        if (ethereum) return 'Injected Wallet';
      }
      return 'Browser Wallet';
    }
    
    // Use connector name if available
    const name = connector.name || 'Unknown Wallet';
    // Double-check name for excluded wallets
    const lowerName = name.toLowerCase();
    if (excludedWallets.some(excluded => lowerName.includes(excluded))) {
      return null;
    }
    return name;
  };

  const getWalletIcon = (connector: any): string | null => {
    // Check connector ID and name for wallet identification
    const connectorId = connector.id.toLowerCase();
    const connectorName = (connector.name || '').toLowerCase();
    if (connectorId === 'solana-wallet-adapter' || connectorName.includes('solana wallets')) {
      return '/solana-sol-logo.png';
    }
    if (connectorId.includes('phantom') || connectorName.includes('phantom')) {
      return '/Phantom-Integration-Assets/Icons/Phantom-Icon_Square.svg';
    }
    
    // MetaMask detection
    if (connectorId.includes('metamask') || connectorName.includes('metamask')) {
      return null;
    }
    
    // Nightly detection
    if (connectorId.includes('nightly') || connectorName.includes('nightly')) {
      return '/nightly.png';
    }
    
    // WalletConnect detection
    if (connectorId.includes('walletconnect') || connectorName.includes('walletconnect')) {
      return null;
    }
    
    // Coinbase Wallet detection
    if (connectorId.includes('coinbase') || connectorName.includes('coinbase')) {
      return null;
    }
    
    // For injected connector, try to detect from window.ethereum
    if (connector.id === 'injected') {
      if (typeof window !== 'undefined') {
        const solana = (window as any).solana;
        if (solana?.isPhantom) return '/Phantom-Integration-Assets/Icons/Phantom-Icon_Square.svg';
        const ethereum = (window as any).ethereum;
        if (ethereum?.isMetaMask) return null;
        if (ethereum?.isCoinbaseWallet) return null;
        if (ethereum?.isNightly) return '/nightly.png';
      }
    }
    
    return null;
  };

  const getWalletDescription = (connector: any): string => {
    const cid = String(connector.id || '').toLowerCase();
    if (cid === 'solana-wallet-adapter') {
      return 'Phantom, Solflare, Ledger, WalletConnect (mobile), Coinbase, and other Solana wallets';
    }
    if (connector.id === 'injected') {
      if (typeof window !== 'undefined') {
        if ((window as any).solana?.isPhantom) return 'Connect using Phantom wallet';
        if ((window as any).ethereum?.isMetaMask) return 'Connect using MetaMask extension';
        if ((window as any).ethereum?.isCoinbaseWallet) return 'Connect using Coinbase Wallet';
        if ((window as any).ethereum?.isNightly) return 'Connect using Nightly Wallet';
        if ((window as any).ethereum) return 'Connect using your browser wallet';
      }
      return 'Connect using your browser wallet';
    }
    if (connector.id.includes('walletConnect')) return 'Connect using WalletConnect (mobile wallets)';
    if (connector.id.includes('coinbase')) return 'Connect using Coinbase Wallet app';
    if (connector.id.toLowerCase().includes('phantom')) return 'Connect using Phantom wallet';
    return 'Connect wallet';
  };

  // Define wallet display order (must be after getWalletName is defined)
  const getWalletPriority = (connector: any): number => {
    const walletName = getWalletName(connector);
    if (!walletName) return 999; // Filtered wallets go to the end
    
    const lowerName = walletName.toLowerCase();
    if (lowerName.includes('solana wallets')) return 0;
    if (lowerName.includes('phantom')) return 1;
    if (lowerName.includes('metamask')) return 1;
    if (lowerName.includes('nightly')) return 2;
    if (lowerName.includes('walletconnect')) return 3;
    if (lowerName.includes('coinbase')) return 4;
    return 5; // Other wallets after the priority ones
  };

  // Remove duplicate wallets (same name)
  const uniqueConnectors = filteredConnectors.filter((connector, index, self) => {
    const walletName = getWalletName(connector);
    if (!walletName) return false; // Filter out null names
    // Find first occurrence of this wallet name
    const firstIndex = self.findIndex(c => getWalletName(c) === walletName);
    return index === firstIndex;
  });

  // Sort connectors by priority
  const sortedConnectors = [...uniqueConnectors].sort((a, b) => {
    return getWalletPriority(a) - getWalletPriority(b);
  });

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
          >
            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto relative z-[101]"
              style={{ maxHeight: 'calc(100vh - 2rem)' }}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-900">Connect Wallet</h2>
                <button
                  onClick={onClose}
                  className="p-2 text-gray-400 hover:text-gray-600 transition-colors rounded-lg hover:bg-gray-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Wallet List */}
              <div className="p-6 space-y-3">
                {sortedConnectors.map((connector) => {
                  const walletName = getWalletName(connector);
                  // Skip if wallet name is null (filtered out)
                  if (!walletName) return null;
                  
                  const isConnecting = connectingId === connector.id;
                  const isDisabled = isPending && !isConnecting;

                  return (
                    <button
                      key={connector.id}
                      onClick={() => handleConnect(connector)}
                      disabled={isDisabled}
                      className={`w-full flex items-center space-x-4 p-4 rounded-lg border-2 transition-all duration-200 ${
                        isConnecting
                          ? 'border-gray-900 bg-gray-50'
                          : isDisabled
                          ? 'border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed'
                          : 'border-gray-200 hover:border-gray-900 hover:bg-gray-50'
                      }`}
                    >
                      {getWalletIcon(connector) ? (
                        <div className="w-12 h-12 flex-shrink-0">
                          <img 
                            src={getWalletIcon(connector)!} 
                            alt={walletName}
                            className="w-full h-full object-contain rounded-lg"
                          />
                        </div>
                      ) : (
                        <div className="w-12 h-12 flex-shrink-0 bg-gray-100 rounded-lg flex items-center justify-center">
                          <Wallet className="w-6 h-6 text-gray-400" />
                        </div>
                      )}
                      <div className="flex-1 text-left">
                        <div className="font-semibold text-gray-900">
                          {walletName}
                        </div>
                        <div className="text-sm text-gray-500">
                          {getWalletDescription(connector)}
                        </div>
                      </div>
                      {isConnecting ? (
                        <div className="w-5 h-5 border-2 border-gray-900 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <ExternalLink className="w-5 h-5 text-gray-400" />
                      )}
                    </button>
                  );
                }).filter(Boolean)}
              </div>

              {/* Footer */}
              <div className="p-6 border-t border-gray-200 bg-gray-50">
                <p className="text-xs text-gray-500 text-center">
                  By connecting, you agree to Gemetra's Terms of Service and Privacy Policy
                </p>
                <div className="mt-3 text-center">
                  <a
                    href="https://solana.com/solana-wallets"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-gray-600 hover:text-gray-900 underline"
                  >
                    Don't have a wallet? Learn more
                  </a>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
