import { useWallet } from '@solana/wallet-adapter-react';

/** Connected Solana wallet address (any adapter), for gating + admin when legacy naming still says "Phantom". */
export function usePhantomPublicKey(): string {
  const { publicKey } = useWallet();
  return publicKey?.toBase58() ?? '';
}
