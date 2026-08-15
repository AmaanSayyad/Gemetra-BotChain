import { defineChain } from "viem";

/** BOT Chain Mainnet — https://dev-docs.botchain.ai/docs/Developers/quick-guide/ */
export const BOT_CHAIN_ID = 677;
export const BOT_CHAIN_RPC = "https://rpc.botchain.ai";
export const BOT_CHAIN_EXPLORER = "https://scan.botchain.ai";

/** Bridged USDT on BOT Chain (6 decimals). */
export const BOTCHAIN_USDT_ADDRESS =
  "0xababc7ddc03e501d190c676bf3d92ef0e6e87a3c" as const;
export const BOTCHAIN_USDT_DECIMALS = 6;

export const botChain = defineChain({
  id: BOT_CHAIN_ID,
  name: "BOT Chain",
  nativeCurrency: { name: "BOT", symbol: "BOT", decimals: 18 },
  rpcUrls: {
    default: { http: [BOT_CHAIN_RPC] },
    public: { http: [BOT_CHAIN_RPC] },
  },
  blockExplorers: {
    default: { name: "BOTScan", url: BOT_CHAIN_EXPLORER },
  },
});

export function explorerTxUrl(hash: string): string {
  const h = hash.trim();
  if (!h) return BOT_CHAIN_EXPLORER;
  return `${BOT_CHAIN_EXPLORER}/tx/${h}`;
}

export function explorerAddressUrl(address: string): string {
  const a = address.trim();
  if (!a) return BOT_CHAIN_EXPLORER;
  return `${BOT_CHAIN_EXPLORER}/address/${a}`;
}

export function explorerTokenUrl(address: string): string {
  const a = address.trim();
  if (!a) return BOT_CHAIN_EXPLORER;
  return `${BOT_CHAIN_EXPLORER}/token/${a}`;
}
