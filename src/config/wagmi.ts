import { createConfig, http } from "wagmi";
import { injected, coinbaseWallet } from "wagmi/connectors";
import { botChain, BOT_CHAIN_RPC } from "./botchain";

export const wagmiConfig = createConfig({
  chains: [botChain],
  connectors: [
    injected({ shimDisconnect: true }),
    coinbaseWallet({ appName: "Gemetra — BOT Chain Payroll & VAT" }),
  ],
  transports: {
    [botChain.id]: http(BOT_CHAIN_RPC),
  },
  ssr: false,
});

declare module "wagmi" {
  interface Register {
    config: typeof wagmiConfig;
  }
}
