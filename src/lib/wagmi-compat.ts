import { useEffect, useMemo, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { Connection, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";

import { getSolanaRpcUrl } from "../config/solanaRpc";

const SOLANA_RPC_URL = getSolanaRpcUrl();

/** Wagmi-shaped API backed by `@solana/wallet-adapter-react` (Phantom, Solflare, Ledger, WalletConnect, …). */
export function useAccount() {
  const { publicKey, connected } = useWallet();
  const address = publicKey?.toBase58();
  return {
    address,
    isConnected: Boolean(connected && address),
  };
}

export function useDisconnect() {
  const { disconnect, connected } = useWallet();
  return {
    disconnect: async () => {
      if (connected) await disconnect();
    },
  };
}

export function useConnect() {
  const { setVisible } = useWalletModal();
  const [isPending, setIsPending] = useState(false);

  const connectors = useMemo(
    () => [{ id: "solana-wallet-adapter", name: "Solana wallets" }],
    [],
  );

  return {
    isPending,
    connectors,
    connect: async () => {
      setIsPending(true);
      try {
        setVisible(true);
      } finally {
        setIsPending(false);
      }
    },
  };
}

export function useChainId() {
  // Compatibility shim for existing UI checks.
  // 101 == Solana mainnet-beta in many integrations.
  return 101;
}

export function useBalance({ address }: { address?: string }) {
  const [data, setData] = useState<{ formatted: string } | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!address) {
        setData(undefined);
        return;
      }
      setIsLoading(true);
      try {
        const conn = new Connection(SOLANA_RPC_URL, "confirmed");
        const lamports = await conn.getBalance(new PublicKey(address));
        if (!cancelled) {
          setData({ formatted: (lamports / LAMPORTS_PER_SOL).toFixed(6) });
        }
      } catch {
        if (!cancelled) setData(undefined);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [address]);

  return { data, isLoading };
}

export function useSendTransaction() {
  return {
    sendTransactionAsync: async () => {
      throw new Error("Use Solana token transfer helpers instead");
    },
  };
}
