/**
 * Default mainnet RPC for local dev when `VITE_SOLANA_RPC_URL` is unset.
 * The official endpoint often returns HTTP 403 from browsers (rate limits / blocking).
 * PublicNode is a reasonable no-key fallback; production should use a dedicated RPC.
 */
export const DEFAULT_SOLANA_MAINNET_RPC =
  "https://solana-rpc.publicnode.com";

export function getSolanaRpcUrl(): string {
  const raw = import.meta.env.VITE_SOLANA_RPC_URL;
  if (typeof raw === "string" && raw.trim() !== "") return raw.trim();
  return DEFAULT_SOLANA_MAINNET_RPC;
}
