import React, { useEffect } from "react";
import { useAppKit } from "@reown/appkit/react";

interface WalletModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/** Opens the Reown AppKit wallet adapter (Family, MetaMask, WalletConnect, …). */
export const WalletModal: React.FC<WalletModalProps> = ({ isOpen, onClose }) => {
  const { open } = useAppKit();

  useEffect(() => {
    if (!isOpen) return;
    open({ view: "Connect" }).finally(() => onClose());
  }, [isOpen, open, onClose]);

  return null;
};
