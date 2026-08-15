import { Wallet } from "lucide-react";
import { Button } from "../ui";
import { useAccount, useDisconnect } from "wagmi";
import { useState } from "react";
import { WalletModal } from "../components/WalletModal";

export default function ConnectButton() {
    const { address, isConnected } = useAccount();
    const { disconnect } = useDisconnect();
    const [showWalletModal, setShowWalletModal] = useState(false);

    if (isConnected && address) {
        return (
            <Button
                size="large"
                variant="destructive-primary"
                icon={<Wallet size={20} />}
                className="px-8 py-6 shadow-lg bg-[#262626] hover:shadow-xl transition-all duration-300"
                onClick={() => disconnect()}
            >
                Disconnect {address.slice(0, 6)}...{address.slice(-4)}
            </Button>
        );
    }

    return (
        <>
            <Button
                size="large"
                variant="destructive-primary"
                icon={<Wallet size={20} />}
                className="px-8 py-6 shadow-lg bg-[#262626] hover:shadow-xl transition-all duration-300"
                onClick={() => setShowWalletModal(true)}
            >
                Connect Wallet
            </Button>
            <WalletModal 
                isOpen={showWalletModal} 
                onClose={() => setShowWalletModal(false)} 
            />
        </>
    );
}