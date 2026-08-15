import { Wallet } from "lucide-react";
import { Button } from "../ui";
import { useAccount } from "wagmi";
import { useAppKit } from "@reown/appkit/react";

export default function ConnectButton() {
  const { address, isConnected } = useAccount();
  const { open } = useAppKit();

  if (isConnected && address) {
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
