import { createConfig, http } from 'wagmi'
import { mainnet, sepolia } from 'wagmi/chains'
import { injected, walletConnect, coinbaseWallet } from 'wagmi/connectors'

// WalletConnect Project ID (from environment - REQUIRED)
const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID;

if (!projectId) {
  const errorMessage = 'Missing required WalletConnect Project ID. Please set VITE_WALLETCONNECT_PROJECT_ID in your .env file.';
  console.error('❌', errorMessage);
  throw new Error(errorMessage);
}

// Create Wagmi config following official pattern
// Mainnet is prioritized for production use with real MNEE tokens
export const wagmiConfig = createConfig({
  chains: [mainnet, sepolia], // Mainnet first - primary network for MNEE
  connectors: [
    injected(), // MetaMask and other injected wallets
    walletConnect({ projectId }),
    coinbaseWallet({ appName: 'Gemetra - MNEE Payroll & VAT Refunds' }),
  ],
  transports: {
    [mainnet.id]: http(), // Primary: Ethereum Mainnet for real MNEE tokens
    [sepolia.id]: http(), // Secondary: Sepolia for development (requires mock token)
  },
})

// TypeScript declaration merging for type safety
declare module 'wagmi' {
  interface Register {
    config: typeof wagmiConfig
  }
}
