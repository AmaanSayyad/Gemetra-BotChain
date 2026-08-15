import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { supabase } from "../lib/supabase";
import type { UserPoints, PointTransaction, PointConversion } from "../lib/supabase";
import { useAccount } from "wagmi";
import { usePhantomPublicKey } from "./usePhantomPublicKey";
import { sendMneePayment, getConnectedAccount, getMneeBalance } from "../utils/ethereum";

function generateUUID() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

const POINTS_RULES = {
  payment: 10,
  bulk_payment: 5,
  scheduled_payment: 3,
  vat_refund: 15,
  bonus: 0,
};

const CONVERSION_RATE = 100;

const PointsContext = createContext<ReturnType<typeof usePointsState> | null>(null);

/** One shared points store so TopBar and payment modals stay in sync without refresh. */
export function PointsProvider({ children }: { children: ReactNode }) {
  const value = usePointsState();
  return createElement(PointsContext.Provider, { value }, children);
}

export function usePoints() {
  const ctx = useContext(PointsContext);
  if (!ctx) {
    throw new Error("usePoints must be used within PointsProvider (see DashboardLayout).");
  }
  return ctx;
}

function usePointsState() {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [userPoints, setUserPoints] = useState<UserPoints | null>(null);
  const [transactions, setTransactions] = useState<PointTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { address, isConnected } = useAccount();
  const phantomPublicKey = usePhantomPublicKey();

  useEffect(() => {
    const sync = () => {
      const evm = isConnected && address ? address.trim() : "";
      const fallback = (phantomPublicKey || getConnectedAccount() || "").trim();
      setWalletAddress(evm || fallback || null);
    };

    sync();

    const provider = window.ethereum;
    provider?.on?.("accountsChanged", sync);
    provider?.on?.("disconnect", sync);

    return () => {
      provider?.removeListener?.("accountsChanged", sync);
      provider?.removeListener?.("disconnect", sync);
    };
  }, [isConnected, address, phantomPublicKey]);

  const initializePoints = useCallback(() => {
    if (!walletAddress) return;

    const newPoints: UserPoints = {
      id: generateUUID(),
      user_id: walletAddress,
      total_points: 0,
      lifetime_points: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    setUserPoints(newPoints);
    localStorage.setItem(`gemetra_points_${walletAddress}`, JSON.stringify(newPoints));
  }, [walletAddress]);

  useEffect(() => {
    if (!walletAddress) {
      setUserPoints(null);
      setTransactions([]);
      return;
    }

    const localStorageKey = `gemetra_points_${walletAddress}`;
    const storedPoints = localStorage.getItem(localStorageKey);

    if (storedPoints) {
      try {
        setUserPoints(JSON.parse(storedPoints));
      } catch {
        console.error("Error parsing points from localStorage");
        initializePoints();
      }
    } else {
      initializePoints();
    }

    const transactionsKey = `gemetra_point_transactions_${walletAddress}`;
    const storedTransactions = localStorage.getItem(transactionsKey);
    if (storedTransactions) {
      try {
        setTransactions(JSON.parse(storedTransactions));
      } catch {
        console.error("Error parsing point transactions from localStorage");
        setTransactions([]);
      }
    } else {
      setTransactions([]);
    }
  }, [walletAddress, initializePoints]);

  const readPointsFromStorage = useCallback((): UserPoints | null => {
    if (!walletAddress) return null;
    const raw = localStorage.getItem(`gemetra_points_${walletAddress}`);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as UserPoints;
    } catch {
      return null;
    }
  }, [walletAddress]);

  const earnPoints = useCallback(
    async (
      points: number,
      source: PointTransaction["source"],
      sourceId?: string,
      description?: string,
    ): Promise<PointTransaction | null> => {
      if (!walletAddress) {
        console.warn("Cannot earn points: wallet not connected");
        return null;
      }

      if (points <= 0) {
        console.warn("Cannot earn zero or negative points");
        return null;
      }

      try {
        setLoading(true);

        const transaction: PointTransaction = {
          id: generateUUID(),
          user_id: walletAddress,
          points,
          transaction_type: "earned",
          source,
          source_id: sourceId,
          description: description || `Earned ${points} points from ${source}`,
          created_at: new Date().toISOString(),
        };

        setUserPoints((prevPoints) => {
          if (!prevPoints) {
            const newPoints: UserPoints = {
              id: generateUUID(),
              user_id: walletAddress,
              total_points: points,
              lifetime_points: points,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            };
            localStorage.setItem(`gemetra_points_${walletAddress}`, JSON.stringify(newPoints));
            return newPoints;
          }

          const updatedPoints: UserPoints = {
            ...prevPoints,
            total_points: prevPoints.total_points + points,
            lifetime_points: prevPoints.lifetime_points + points,
            updated_at: new Date().toISOString(),
          };
          localStorage.setItem(`gemetra_points_${walletAddress}`, JSON.stringify(updatedPoints));
          return updatedPoints;
        });

        setTransactions((prevTransactions) => {
          const updatedTransactions = [transaction, ...prevTransactions];
          localStorage.setItem(
            `gemetra_point_transactions_${walletAddress}`,
            JSON.stringify(updatedTransactions),
          );
          return updatedTransactions;
        });

        try {
          const latest = readPointsFromStorage();
          await supabase.from("user_points").upsert(
            {
              user_id: walletAddress,
              total_points: latest?.total_points ?? points,
              lifetime_points: latest?.lifetime_points ?? points,
            },
            { onConflict: "user_id" },
          );
          await supabase.from("point_transactions").insert([transaction]);
        } catch (supabaseError) {
          console.error("Failed to save points to Supabase (continuing anyway):", supabaseError);
        }

        console.log(`✅ Earned ${points} points from ${source}`);
        return transaction;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to earn points";
        setError(errorMessage);
        throw new Error(errorMessage);
      } finally {
        setLoading(false);
      }
    },
    [walletAddress, readPointsFromStorage],
  );

  const convertPointsToMnee = useCallback(
    async (pointsToConvert: number, recipientAddress?: string) => {
      if (!walletAddress) {
        throw new Error("Wallet not connected");
      }

      if (!userPoints || userPoints.total_points < pointsToConvert) {
        throw new Error("Insufficient points");
      }

      if (pointsToConvert < CONVERSION_RATE) {
        throw new Error(`Minimum ${CONVERSION_RATE} points required for conversion`);
      }

      const finalRecipientAddress = recipientAddress || walletAddress;
      const balanceBefore = userPoints.total_points;

      try {
        setLoading(true);

        const mneeAmount = pointsToConvert / CONVERSION_RATE;

        const conversion: PointConversion = {
          id: generateUUID(),
          user_id: walletAddress,
          points: pointsToConvert,
          mnee_amount: mneeAmount,
          conversion_rate: CONVERSION_RATE,
          status: "pending",
          created_at: new Date().toISOString(),
        };

        let actualTxHash: string | undefined;
        let conversionStatus: "pending" | "completed" | "failed" = "pending";

        try {
          const userBalance = await getMneeBalance(walletAddress);

          if (userBalance >= mneeAmount) {
            console.log(`💰 Sending ${mneeAmount} MNEE to ${finalRecipientAddress}...`);

            const transferResult = await sendMneePayment(finalRecipientAddress as `0x${string}`, mneeAmount);

            if (transferResult.success && transferResult.txHash) {
              actualTxHash = transferResult.txHash;
              conversionStatus = "completed";
              console.log(`✅ MNEE tokens sent! Transaction: ${actualTxHash}`);
            } else {
              conversionStatus = "failed";
              console.error("Failed to send MNEE tokens:", transferResult.error);
            }
          } else {
            console.log("⚠️ User wallet does not have sufficient MNEE balance.");
            conversionStatus = "pending";
          }
        } catch (transferError) {
          console.error("Error attempting MNEE transfer:", transferError);
          conversionStatus = "pending";
        }

        setUserPoints((prevPoints) => {
          if (!prevPoints) throw new Error("Points not initialized");

          const updatedPoints: UserPoints = {
            ...prevPoints,
            total_points: prevPoints.total_points - pointsToConvert,
            updated_at: new Date().toISOString(),
          };
          localStorage.setItem(`gemetra_points_${walletAddress}`, JSON.stringify(updatedPoints));
          return updatedPoints;
        });

        const transaction: PointTransaction = {
          id: generateUUID(),
          user_id: walletAddress,
          points: -pointsToConvert,
          transaction_type: "converted",
          source: "conversion",
          source_id: conversion.id,
          description: `Converted ${pointsToConvert} points to ${mneeAmount.toFixed(6)} MNEE`,
          created_at: new Date().toISOString(),
        };

        setTransactions((prevTransactions) => {
          const updatedTransactions = [transaction, ...prevTransactions];
          localStorage.setItem(
            `gemetra_point_transactions_${walletAddress}`,
            JSON.stringify(updatedTransactions),
          );
          return updatedTransactions;
        });

        try {
          conversion.status = conversionStatus;
          conversion.completed_at =
            conversionStatus === "completed" ? new Date().toISOString() : undefined;
          conversion.transaction_hash =
            actualTxHash ||
            (conversionStatus === "pending"
              ? `pending_treasury_${generateUUID()}`
              : `error_${generateUUID()}`);

          await supabase.from("point_conversions").insert([conversion]);
          await supabase.from("point_transactions").insert([transaction]);

          const latest = readPointsFromStorage();
          await supabase.from("user_points").upsert(
            {
              user_id: walletAddress,
              total_points: latest?.total_points ?? balanceBefore - pointsToConvert,
              lifetime_points: latest?.lifetime_points ?? userPoints.lifetime_points,
            },
            { onConflict: "user_id" },
          );
        } catch (supabaseError) {
          console.error("Failed to save conversion to Supabase:", supabaseError);
        }

        console.log(`✅ Converted ${pointsToConvert} points to ${mneeAmount.toFixed(6)} MNEE (Status: ${conversionStatus})`);

        const after = readPointsFromStorage();
        return {
          conversion,
          mneeAmount,
          remainingPoints: after?.total_points ?? balanceBefore - pointsToConvert,
          transactionHash: actualTxHash || conversion.transaction_hash,
          status: conversionStatus,
        };
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to convert points";
        setError(errorMessage);
        throw new Error(errorMessage);
      } finally {
        setLoading(false);
      }
    },
    [walletAddress, userPoints, readPointsFromStorage],
  );

  const getPointsForPayment = useCallback(
    (_paymentAmount: number, source: PointTransaction["source"], employeeCount: number = 1) => {
      switch (source) {
        case "payment":
          return POINTS_RULES.payment;
        case "bulk_payment":
          return POINTS_RULES.bulk_payment * employeeCount;
        case "scheduled_payment":
          return POINTS_RULES.scheduled_payment;
        case "vat_refund":
          return POINTS_RULES.vat_refund;
        default:
          return 0;
      }
    },
    [],
  );

  return {
    userPoints,
    transactions,
    loading,
    error,
    earnPoints,
    convertPointsToMnee,
    getPointsForPayment,
    conversionRate: CONVERSION_RATE,
    pointsRules: POINTS_RULES,
  };
}
