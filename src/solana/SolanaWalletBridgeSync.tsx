import { useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { setSolanaWalletBridge } from "./solanaWalletBridge";

/** Keeps non-React modules (e.g. `ethereum.ts`) in sync with the active wallet-adapter session. */
export function SolanaWalletBridgeSync() {
  const { publicKey, connected, sendTransaction, disconnect, wallet } = useWallet();

  useEffect(() => {
    if (connected && publicKey) {
      setSolanaWalletBridge({
        publicKey,
        sendTransaction,
        disconnect,
        walletName: wallet?.adapter.name,
      });
    } else {
      setSolanaWalletBridge(null);
    }
    return () => {
      setSolanaWalletBridge(null);
    };
  }, [connected, publicKey, sendTransaction, disconnect, wallet]);

  return null;
}
