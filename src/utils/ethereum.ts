import { Connection, PublicKey, SystemProgram, Transaction } from "@solana/web3.js";
import { getSolanaRpcUrl } from "../config/solanaRpc";
import { getSolanaWalletBridge } from "../solana/solanaWalletBridge";
import {
  createAssociatedTokenAccountInstruction,
  createTransferCheckedInstruction,
  getAssociatedTokenAddress,
  getMint,
  TOKEN_2022_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";

type LegacyInjectedSolana = {
  publicKey?: PublicKey;
  connect: () => Promise<{ publicKey: PublicKey }>;
  disconnect?: () => Promise<void>;
  sendTransaction?: (tx: Transaction, connection: Connection) => Promise<string>;
  signAndSendTransaction?: (tx: Transaction) => Promise<{ signature: string }>;
};

const SOLANA_RPC_URL = getSolanaRpcUrl();
const connection = new Connection(SOLANA_RPC_URL, "confirmed");

const getLegacyInjectedSolana = (): LegacyInjectedSolana | null =>
  typeof window !== "undefined"
    ? ((window as unknown as { solana?: LegacyInjectedSolana }).solana ?? null)
    : null;

async function resolveTransactionSigner(): Promise<{
  publicKey: PublicKey;
  sendTransaction: (tx: Transaction, conn: Connection) => Promise<string>;
}> {
  const bridge = getSolanaWalletBridge();
  if (bridge?.publicKey && bridge.sendTransaction) {
    return {
      publicKey: bridge.publicKey,
      sendTransaction: (tx, conn) => bridge.sendTransaction(tx, conn),
    };
  }

  const legacy = getLegacyInjectedSolana();
  if (!legacy) throw new Error("No Solana wallet detected");
  if (!legacy.publicKey) await legacy.connect();
  if (!legacy.publicKey) throw new Error("Wallet not connected");

  const sendTransaction = async (tx: Transaction, conn: Connection) => {
    if (legacy.sendTransaction) return legacy.sendTransaction(tx, conn);
    if (legacy.signAndSendTransaction) {
      return (await legacy.signAndSendTransaction(tx)).signature;
    }
    throw new Error("Wallet does not support sending transactions");
  };

  return { publicKey: legacy.publicKey, sendTransaction };
}

function formatSolanaRpcFailure(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  if (/403|access forbidden|forbidden/i.test(msg)) {
    return `${msg}. The Solana RPC rejected the request (common with restrictive public URLs). Add VITE_SOLANA_RPC_URL in .env (Helius, QuickNode, etc.) and restart the dev server.`;
  }
  return msg;
}

export const PUSD_SOLANA_MINT =
  "CZzgUBvxaMLwMhVSLgqJn3npmxoTo6nzMNQPAnwtHF3s";
// Backward-compatible export name.
export const MNEE_CONTRACT_ADDRESS_MAINNET = PUSD_SOLANA_MINT;
/** Native USDT (SPL) on Solana mainnet — classic Token program. */
export const USDT_SOLANA_MINT = "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB";
export const PUSD_ETHEREUM_CONTRACT = "0xfaf0cee6b20e2aaa4b80748a6af4cd89609a3d78";
export type PaymentToken = "PUSD" | "SOL";

export const getPusdMintAddress = async (): Promise<string> =>
  PUSD_SOLANA_MINT;

export const getMneeContractAddress = getPusdMintAddress;

export const isValidSolanaAddress = (address: string): boolean => {
  try {
    new PublicKey(address);
    return true;
  } catch {
    return false;
  }
};
export const isValidEthereumAddress = isValidSolanaAddress;

export const formatAddress = (address: string): string =>
  address ? `${address.slice(0, 4)}...${address.slice(-4)}` : "";

export const getConnectedAccount = (): string | null =>
  getSolanaWalletBridge()?.publicKey?.toBase58() ??
  getLegacyInjectedSolana()?.publicKey?.toBase58() ??
  null;

export const isWalletConnected = (): boolean => Boolean(getConnectedAccount());

async function getSplMintProgramId(mint: PublicKey): Promise<PublicKey> {
  const mintAcct = await connection.getAccountInfo(mint, "confirmed");
  if (!mintAcct) return TOKEN_PROGRAM_ID;
  return mintAcct.owner.equals(TOKEN_2022_PROGRAM_ID)
    ? TOKEN_2022_PROGRAM_ID
    : TOKEN_PROGRAM_ID;
}

/** ATA balance for an SPL mint (classic or Token-2022). */
export async function getSplTokenBalanceUi(
  ownerBase58: string,
  mintBase58: string
): Promise<number> {
  try {
    if (!ownerBase58) return 0;
    const owner = new PublicKey(ownerBase58);
    const mint = new PublicKey(mintBase58);
    const programId = await getSplMintProgramId(mint);
    const tokenAccount = await getAssociatedTokenAddress(mint, owner, false, programId);
    const info = await connection.getTokenAccountBalance(tokenAccount);
    return Number(info.value.uiAmount ?? 0);
  } catch {
    return 0;
  }
}

export const getPusdBalance = async (address?: string): Promise<number> =>
  getSplTokenBalanceUi(address ?? getConnectedAccount() ?? "", PUSD_SOLANA_MINT);
export const getMneeBalance = getPusdBalance;

export const getUsdtBalance = async (address?: string): Promise<number> =>
  getSplTokenBalanceUi(address ?? getConnectedAccount() ?? "", USDT_SOLANA_MINT);

const sendSplTransfer = async (
  recipient: string,
  amount: number
): Promise<string> => {
  const { publicKey: sender, sendTransaction } = await resolveTransactionSigner();
  const recipientPk = new PublicKey(recipient);
  const mintPk = new PublicKey(PUSD_SOLANA_MINT);
  const tokenProgram = await getSplMintProgramId(mintPk);
  const mintInfo = await getMint(connection, mintPk, "confirmed", tokenProgram);
  const senderAta = await getAssociatedTokenAddress(mintPk, sender, false, tokenProgram);
  const recipientAta = await getAssociatedTokenAddress(mintPk, recipientPk, false, tokenProgram);
  const tx = new Transaction();

  const recipientAtaInfo = await connection.getAccountInfo(recipientAta);
  if (!recipientAtaInfo) {
    tx.add(
      createAssociatedTokenAccountInstruction(
        sender,
        recipientAta,
        recipientPk,
        mintPk,
        tokenProgram
      )
    );
  }

  const baseAmount = BigInt(Math.floor(amount * 10 ** mintInfo.decimals));
  tx.add(
    createTransferCheckedInstruction(
      senderAta,
      mintPk,
      recipientAta,
      sender,
      baseAmount,
      mintInfo.decimals,
      [],
      tokenProgram
    )
  );

  tx.feePayer = sender;
  tx.recentBlockhash = (await connection.getLatestBlockhash("finalized")).blockhash;

  return sendTransaction(tx, connection);
};

const sendSolTransfer = async (
  recipient: string,
  amount: number
): Promise<string> => {
  const { publicKey: sender, sendTransaction } = await resolveTransactionSigner();
  const recipientPk = new PublicKey(recipient);
  const lamports = Math.floor(amount * 1_000_000_000);
  if (lamports <= 0) throw new Error("Invalid amount");

  const tx = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: sender,
      toPubkey: recipientPk,
      lamports,
    })
  );

  tx.feePayer = sender;
  tx.recentBlockhash = (await connection.getLatestBlockhash("finalized")).blockhash;

  return sendTransaction(tx, connection);
};

export const sendPayment = async (
  recipient: string,
  amount: number,
  token: PaymentToken = "PUSD"
): Promise<{ txHash: string; success: boolean; error?: string }> => {
  try {
    if (!isValidSolanaAddress(recipient)) {
      throw new Error("Invalid Solana wallet address");
    }
    if (!amount || Number.isNaN(amount) || amount <= 0) {
      throw new Error("Invalid amount");
    }
    const signature =
      token === "SOL"
        ? await sendSolTransfer(recipient, amount)
        : await sendSplTransfer(recipient, amount);
    return { txHash: signature, success: true };
  } catch (error) {
    return {
      txHash: "",
      success: false,
      error: formatSolanaRpcFailure(error),
    };
  }
};

export const sendMneePayment = async (
  recipient: string,
  amount: number
): Promise<{ txHash: string; success: boolean; error?: string }> => {
  return sendPayment(recipient, amount, "PUSD");
};

export const sendBulkPayments = async (
  recipients: Array<{ address: string; amount: number }>,
  token: PaymentToken = "PUSD"
): Promise<{
  txHash: string;
  txHashes: Array<{ address: string; txHash: string }>;
  success: boolean;
  processed: number;
  error?: string;
}> => {
  const txHashes: Array<{ address: string; txHash: string }> = [];
  try {
    for (const item of recipients) {
      if (!isValidSolanaAddress(item.address) || item.amount <= 0) continue;
      const signature =
        token === "SOL"
          ? await sendSolTransfer(item.address, item.amount)
          : await sendSplTransfer(item.address, item.amount);
      txHashes.push({ address: item.address, txHash: signature });
    }
    return {
      txHash: txHashes[0]?.txHash ?? "",
      txHashes,
      success: txHashes.length > 0,
      processed: txHashes.length,
      error: txHashes.length === recipients.length ? undefined : "Some payments failed",
    };
  } catch (error) {
    return {
      txHash: txHashes[0]?.txHash ?? "",
      txHashes,
      success: txHashes.length > 0,
      processed: txHashes.length,
      error: formatSolanaRpcFailure(error),
    };
  }
};

export const sendBulkMneePayments = async (
  recipients: Array<{ address: string; amount: number }>
): Promise<{
  txHash: string;
  txHashes: Array<{ address: string; txHash: string }>;
  success: boolean;
  processed: number;
  error?: string;
}> => {
  return sendBulkPayments(recipients, "PUSD");
};

export const getAccountBalance = async (
  address?: string
): Promise<{ eth: number; mnee: number; usdt: number }> => {
  try {
    const owner = address ?? getConnectedAccount() ?? "";
    if (!owner) return { eth: 0, mnee: 0, usdt: 0 };
    const target = new PublicKey(owner);
    const lamports = await connection.getBalance(target);
    const [mnee, usdt] = await Promise.all([getMneeBalance(owner), getUsdtBalance(owner)]);
    return { eth: lamports / 1_000_000_000, mnee, usdt };
  } catch {
    return { eth: 0, mnee: 0, usdt: 0 };
  }
};

export const formatMnee = (amount: number): string => amount.toFixed(2);
export const formatEth = (amount: number): string => amount.toFixed(6);
