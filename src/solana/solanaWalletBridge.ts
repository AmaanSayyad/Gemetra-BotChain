import type { Connection, SendTransactionOptions, Transaction } from "@solana/web3.js";
import type { PublicKey } from "@solana/web3.js";

/** Minimal surface used by `ethereum.ts` for SPL / SOL sends. */
export type SolanaWalletBridge = {
  publicKey: PublicKey;
  sendTransaction: (
    transaction: Transaction,
    connection: Connection,
    options?: SendTransactionOptions,
  ) => Promise<string>;
  disconnect: () => Promise<void>;
  walletName?: string;
};

let bridge: SolanaWalletBridge | null = null;

export function setSolanaWalletBridge(next: SolanaWalletBridge | null): void {
  bridge = next;
}

export function getSolanaWalletBridge(): SolanaWalletBridge | null {
  return bridge;
}
