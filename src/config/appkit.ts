import { createAppKit } from "@reown/appkit/react";
import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import { defineChain } from "@reown/appkit/networks";
import { BOT_CHAIN_EXPLORER, BOT_CHAIN_ID, BOT_CHAIN_RPC, botChain } from "./botchain";

export const REOWN_PROJECT_ID =
  (import.meta.env.VITE_WALLETCONNECT_PROJECT_ID as string | undefined)?.trim() ||
  "";

if (!REOWN_PROJECT_ID) {
  throw new Error("Missing VITE_WALLETCONNECT_PROJECT_ID. Get one from https://dashboard.reown.com");
}

export const botChainNetwork = defineChain({
  id: BOT_CHAIN_ID,
  caipNetworkId: `eip155:${BOT_CHAIN_ID}`,
  chainNamespace: "eip155",
  name: botChain.name,
  nativeCurrency: { name: "BOT", symbol: "BOT", decimals: 18 },
  rpcUrls: {
    default: { http: [BOT_CHAIN_RPC], webSocket: [] },
  },
  blockExplorers: {
    default: { name: "BOTScan", url: BOT_CHAIN_EXPLORER },
  },
});

const networks = [botChainNetwork] as const;

export const wagmiAdapter = new WagmiAdapter({
  networks: [...networks],
  projectId: REOWN_PROJECT_ID,
  ssr: false,
});

createAppKit({
  adapters: [wagmiAdapter],
  networks: [...networks],
  projectId: REOWN_PROJECT_ID,
  defaultNetwork: botChainNetwork,
  metadata: {
    name: "Gemetra",
    description: "VAT refunds and payroll on BOT Chain",
    url: typeof window !== "undefined" ? window.location.origin : "https://gemetra.app",
    icons: ["https://scan.botchain.ai/favicon.ico"],
  },
  features: {
    analytics: false,
    email: false,
    socials: [],
    onramp: false,
  },
  enableWalletGuide: false,
  themeMode: "light",
  themeVariables: {
    "--w3m-accent": "#111827",
    "--w3m-border-radius-master": "2px",
  },
});
