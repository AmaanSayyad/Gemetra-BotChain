import { type ReactNode, useMemo } from "react";
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { getSolanaRpcUrl } from "../config/solanaRpc";
import { createSolanaWalletAdapters } from "./createSolanaWalletAdapters";
import { SolanaWalletBridgeSync } from "./SolanaWalletBridgeSync";

type Props = { children: ReactNode };

export function SolanaProviders({ children }: Props) {
  const endpoint = useMemo(() => getSolanaRpcUrl(), []);
  const wallets = useMemo(() => createSolanaWalletAdapters(), []);

  return (
    <ConnectionProvider endpoint={endpoint}>
      {/* autoConnect must be enabled: WalletModal only calls `select()`; connect runs via WalletProviderBase when autoConnect is truthy. */}
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <SolanaWalletBridgeSync />
          {children}
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
