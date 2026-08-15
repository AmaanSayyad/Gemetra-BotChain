import { useAccount } from "wagmi";

/** Connected EVM address. Name kept so existing session gates stay intact. */
export function usePhantomPublicKey(): string {
  const { address, isConnected } = useAccount();
  return isConnected && address ? address : "";
}
