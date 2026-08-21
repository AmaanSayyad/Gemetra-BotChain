import { LayoutDashboard, Wallet } from "lucide-react";
import { Button } from "../ui";
import { useAccount } from "wagmi";
import { useAppKit } from "@reown/appkit/react";
import { useAppNavigation } from "../hooks/useAppNavigation";

type ConnectButtonProps = {
  /**
   * Landing CTAs: when already connected, show "Open App".
   * In-app chrome (sidebar/header): show the account chip instead.
   */
  variant?: "landing" | "account";
};

export default function ConnectButton({ variant = "landing" }: ConnectButtonProps) {
  const { address, isConnected } = useAccount();
  const { open } = useAppKit();
  const { enterApp } = useAppNavigation();

  if (isConnected && address) {
    if (variant === "landing") {
      return (
        <Button
          size="large"
          variant="destructive-primary"
          icon={<LayoutDashboard size={20} />}
          className="px-8 py-6 shadow-lg bg-[#262626] hover:shadow-xl transition-all duration-300"
          onClick={() => enterApp()}
        >
          Open App
        </Button>
      );
    }

    return (
      <Button
        size="large"
        variant="destructive-primary"
        icon={<Wallet size={20} />}
        className="px-8 py-6 shadow-lg bg-[#262626] hover:shadow-xl transition-all duration-300"
        onClick={() => open({ view: "Account" })}
      >
        {address.slice(0, 6)}...{address.slice(-4)}
      </Button>
    );
  }

  return (
    <Button
      size="large"
      variant="destructive-primary"
      icon={<Wallet size={20} />}
      className="px-8 py-6 shadow-lg bg-[#262626] hover:shadow-xl transition-all duration-300"
      onClick={() => open({ view: "Connect" })}
    >
      Connect Wallet
    </Button>
  );
}
