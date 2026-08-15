import { defineChain } from "viem";

const requested = (import.meta.env.VITE_BOTCHAIN_NETWORK as string | undefined)?.trim().toLowerCase();
export const BOTCHAIN_NETWORK = requested === "testnet" ? "testnet" : "mainnet";

const NETWORKS = {
  mainnet: {
    id: 677,
    name: "BOT Chain",
    rpc: "https://rpc.botchain.ai",
    explorer: "https://scan.botchain.ai",
    usdt: "0xababc7ddc03e501d190c676bf3d92ef0e6e87a3c" as const,
    core: "" as string,
  },
  testnet: {
    id: 968,
    name: "BOT Chain Testnet",
    rpc: "https://rpc.bohr.life",
    explorer: "https://scan.bohr.life",
    usdt: "0x75edC9335175Fc0552D51D48439F229c10420fe3" as const,
    core: "0xf924220b12dbedb039245c0b960b7dbb37bf1eb2",
  },
} as const;

const net = NETWORKS[BOTCHAIN_NETWORK];

export const BOT_CHAIN_ID = net.id;
export const BOT_CHAIN_RPC = net.rpc;
export const BOT_CHAIN_EXPLORER = net.explorer;
export const BOTCHAIN_USDT_ADDRESS = net.usdt;
export const BOTCHAIN_USDT_DECIMALS = 6;
export const DEFAULT_GEMETRA_CORE_ADDRESS = net.core;

export const botChain = defineChain({
  id: BOT_CHAIN_ID,
  name: net.name,
  nativeCurrency: { name: "BOT", symbol: "BOT", decimals: 18 },
  rpcUrls: {
    default: { http: [BOT_CHAIN_RPC] },
    public: { http: [BOT_CHAIN_RPC] },
  },
  blockExplorers: {
    default: { name: "BOTScan", url: BOT_CHAIN_EXPLORER },
  },
  testnet: BOTCHAIN_NETWORK === "testnet",
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
