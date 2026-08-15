import type { WalletAdapter } from "@solana/wallet-adapter-base";
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";
import {
  AlphaWalletAdapter,
  AvanaWalletAdapter,
  BitgetWalletAdapter,
  BitpieWalletAdapter,
  CloverWalletAdapter,
  Coin98WalletAdapter,
  CoinbaseWalletAdapter,
  CoinhubWalletAdapter,
  FractalWalletAdapter,
  HuobiWalletAdapter,
  HyperPayWalletAdapter,
  KeystoneWalletAdapter,
  KrystalWalletAdapter,
  LedgerWalletAdapter,
  MathWalletAdapter,
  NekoWalletAdapter,
  NightlyWalletAdapter,
  NufiWalletAdapter,
  OntoWalletAdapter,
  PhantomWalletAdapter,
  SafePalWalletAdapter,
  SaifuWalletAdapter,
  SalmonWalletAdapter,
  SkyWalletAdapter,
  SolflareWalletAdapter,
  SolongWalletAdapter,
  SpotWalletAdapter,
  TokenaryWalletAdapter,
  TokenPocketWalletAdapter,
  TorusWalletAdapter,
  TrustWalletAdapter,
  WalletConnectWalletAdapter,
  XDEFIWalletAdapter,
} from "@solana/wallet-adapter-wallets";

/** Instantiate adapters; failures are skipped so one bad wallet does not break the app. */
export function createSolanaWalletAdapters(): WalletAdapter[] {
  const candidates: WalletAdapter[] = [];

  const push = (w: WalletAdapter | null | undefined) => {
    if (w) candidates.push(w);
  };

  const factories: Array<() => WalletAdapter> = [
    () => new PhantomWalletAdapter(),
    () => new SolflareWalletAdapter(),
    () => new CoinbaseWalletAdapter(),
    () => new TrustWalletAdapter(),
    () => new MathWalletAdapter(),
    () => new Coin98WalletAdapter(),
    () => new TokenPocketWalletAdapter(),
    () => new SafePalWalletAdapter(),
    () => new BitgetWalletAdapter(),
    () => new LedgerWalletAdapter(),
    () => new TorusWalletAdapter(),
    () => new AlphaWalletAdapter(),
    () => new AvanaWalletAdapter(),
    () => new BitpieWalletAdapter(),
    () => new CloverWalletAdapter(),
    () => new CoinhubWalletAdapter(),
    () => new FractalWalletAdapter(),
    () => new HuobiWalletAdapter(),
    () => new HyperPayWalletAdapter(),
    () => new KeystoneWalletAdapter(),
    () => new KrystalWalletAdapter(),
    () => new NekoWalletAdapter(),
    () => new NightlyWalletAdapter(),
    () => new NufiWalletAdapter(),
    () => new OntoWalletAdapter(),
    () => new SaifuWalletAdapter(),
    () => new SalmonWalletAdapter(),
    () => new SkyWalletAdapter(),
    () => new SolongWalletAdapter(),
    () => new SpotWalletAdapter(),
    () => new TokenaryWalletAdapter(),
    () => new XDEFIWalletAdapter(),
  ];

  for (const f of factories) {
    try {
      push(f());
    } catch {
      /* skip */
    }
  }

  const wcId = (import.meta.env.VITE_WALLETCONNECT_PROJECT_ID as string | undefined)?.trim();
  if (wcId) {
    try {
      push(
        new WalletConnectWalletAdapter({
          network: WalletAdapterNetwork.Mainnet,
          options: { projectId: wcId },
        }),
      );
    } catch {
      /* WalletConnect optional */
    }
  }

  return candidates;
}
