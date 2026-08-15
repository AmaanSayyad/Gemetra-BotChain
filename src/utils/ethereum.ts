import {
  createPublicClient,
  createWalletClient,
  custom,
  http,
  parseUnits,
  formatUnits,
  isAddress,
  getAddress,
  erc20Abi,
  type Address,
  type Hex,
} from "viem";
import {
  botChain,
  BOT_CHAIN_ID,
  BOT_CHAIN_RPC,
  BOTCHAIN_USDT_ADDRESS,
  BOTCHAIN_USDT_DECIMALS,
} from "../config/botchain";

const GEMETRA_CORE_ABI = [
  {
    type: "function",
    name: "disburse",
    stateMutability: "payable",
    inputs: [
      { name: "token", type: "address" },
      { name: "recipients", type: "address[]" },
      { name: "amounts", type: "uint256[]" },
      { name: "ref", type: "bytes32" },
      { name: "kind", type: "string" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "recordVatRefund",
    stateMutability: "nonpayable",
    inputs: [
      { name: "claimId", type: "bytes32" },
      { name: "recipient", type: "address" },
      { name: "token", type: "address" },
      { name: "amount", type: "uint256" },
      { name: "receiptRef", type: "string" },
    ],
    outputs: [],
  },
] as const;

export const BOTCHAIN_USDT = BOTCHAIN_USDT_ADDRESS;
/** @deprecated Use BOTCHAIN_USDT */
export const PUSD_SOLANA_MINT = BOTCHAIN_USDT_ADDRESS;
export const MNEE_CONTRACT_ADDRESS_MAINNET = BOTCHAIN_USDT_ADDRESS;
export const USDT_SOLANA_MINT = BOTCHAIN_USDT_ADDRESS;
export const PUSD_ETHEREUM_CONTRACT = BOTCHAIN_USDT_ADDRESS;

export type PaymentToken = "USDT" | "BOT";

export function normalizePaymentToken(token?: string | null): PaymentToken {
  const t = (token ?? "").trim().toUpperCase();
  if (t === "BOT" || t === "NATIVE" || t === "SOL" || t === "ETH") return "BOT";
  return "USDT";
}

export function getGemetraCoreAddress(): Address | null {
  const raw = (import.meta.env.VITE_GEMETRA_CORE_ADDRESS as string | undefined)?.trim();
  if (raw && isAddress(raw)) return getAddress(raw);
  return null;
}

const publicClient = createPublicClient({
  chain: botChain,
  transport: http(BOT_CHAIN_RPC),
});

function getEthereumProvider(): { request: (...args: unknown[]) => Promise<unknown> } {
  if (typeof window === "undefined" || !window.ethereum) {
    throw new Error("No EVM wallet detected. Install MetaMask or BO Wallet.");
  }
  return window.ethereum as { request: (...args: unknown[]) => Promise<unknown> };
}

async function getWalletClient() {
  const provider = getEthereumProvider();
  return createWalletClient({
    chain: botChain,
    transport: custom(provider),
  });
}

export async function ensureBotChain(): Promise<void> {
  const provider = getEthereumProvider();
  const hexId = `0x${BOT_CHAIN_ID.toString(16)}`;
  try {
    await provider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: hexId }],
    });
  } catch (err) {
    const code = (err as { code?: number })?.code;
    if (code === 4902) {
      await provider.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: hexId,
            chainName: "BOT Chain",
            nativeCurrency: { name: "BOT", symbol: "BOT", decimals: 18 },
            rpcUrls: [BOT_CHAIN_RPC],
            blockExplorerUrls: ["https://scan.botchain.ai"],
          },
        ],
      });
      return;
    }
    throw err;
  }
}

export const isValidEthereumAddress = (address: string): boolean =>
  Boolean(address && isAddress(address));

/** Kept so existing call sites compile; validates BOT Chain / EVM addresses. */
export const isValidSolanaAddress = isValidEthereumAddress;

export const formatAddress = (address: string): string =>
  address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "";

export const getConnectedAccount = (): string | null => {
  if (typeof window === "undefined") return null;
  const eth = window.ethereum as { selectedAddress?: string } | undefined;
  const selected = eth?.selectedAddress;
  return selected && isAddress(selected) ? getAddress(selected) : null;
};

export const isWalletConnected = (): boolean => Boolean(getConnectedAccount());

async function resolveSender(): Promise<Address> {
  await ensureBotChain();
  const wallet = await getWalletClient();
  const [account] = await wallet.getAddresses();
  if (!account) throw new Error("Wallet not connected");
  return getAddress(account);
}

export const getPusdMintAddress = async (): Promise<string> => BOTCHAIN_USDT_ADDRESS;
export const getMneeContractAddress = getPusdMintAddress;

export async function getErc20BalanceUi(owner: string, token: Address, decimals: number): Promise<number> {
  try {
    if (!owner || !isAddress(owner)) return 0;
    const raw = await publicClient.readContract({
      address: token,
      abi: erc20Abi,
      functionName: "balanceOf",
      args: [getAddress(owner)],
    });
    return Number(formatUnits(raw, decimals));
  } catch {
    return 0;
  }
}

export const getPusdBalance = async (address?: string): Promise<number> =>
  getErc20BalanceUi(address ?? getConnectedAccount() ?? "", BOTCHAIN_USDT_ADDRESS, BOTCHAIN_USDT_DECIMALS);
export const getMneeBalance = getPusdBalance;
export const getUsdtBalance = getPusdBalance;

function toTokenAmount(amount: number, token: PaymentToken): bigint {
  if (!amount || Number.isNaN(amount) || amount <= 0) {
    throw new Error("Invalid amount");
  }
  const decimals = token === "BOT" ? 18 : BOTCHAIN_USDT_DECIMALS;
  return parseUnits(amount.toFixed(decimals), decimals);
}

const sendNativeTransfer = async (recipient: string, amount: number): Promise<Hex> => {
  if (!isAddress(recipient)) throw new Error("Invalid BOT Chain wallet address");
  const sender = await resolveSender();
  const wallet = await getWalletClient();
  return wallet.sendTransaction({
    account: sender,
    to: getAddress(recipient),
    value: toTokenAmount(amount, "BOT"),
    chain: botChain,
  });
};

const sendUsdtTransfer = async (recipient: string, amount: number): Promise<Hex> => {
  if (!isAddress(recipient)) throw new Error("Invalid BOT Chain wallet address");
  const sender = await resolveSender();
  const wallet = await getWalletClient();
  return wallet.writeContract({
    account: sender,
    address: BOTCHAIN_USDT_ADDRESS,
    abi: erc20Abi,
    functionName: "transfer",
    args: [getAddress(recipient), toTokenAmount(amount, "USDT")],
    chain: botChain,
  });
};

export const sendPayment = async (
  recipient: string,
  amount: number,
  token: PaymentToken | string = "USDT"
): Promise<{ txHash: string; success: boolean; error?: string }> => {
  try {
    const normalized = normalizePaymentToken(token);
    if (!isValidEthereumAddress(recipient)) {
      throw new Error("Invalid BOT Chain wallet address");
    }
    const hash =
      normalized === "BOT"
        ? await sendNativeTransfer(recipient, amount)
        : await sendUsdtTransfer(recipient, amount);
    await publicClient.waitForTransactionReceipt({ hash });
    return { txHash: hash, success: true };
  } catch (error) {
    return {
      txHash: "",
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
};

export const sendMneePayment = async (
  recipient: string,
  amount: number
): Promise<{ txHash: string; success: boolean; error?: string }> => {
  return sendPayment(recipient, amount, "USDT");
};

export const sendBulkPayments = async (
  recipients: Array<{ address: string; amount: number }>,
  token: PaymentToken | string = "USDT"
): Promise<{
  txHash: string;
  txHashes: Array<{ address: string; txHash: string }>;
  success: boolean;
  processed: number;
  error?: string;
}> => {
  const normalized = normalizePaymentToken(token);
  const valid = recipients.filter((item) => isValidEthereumAddress(item.address) && item.amount > 0);
  const txHashes: Array<{ address: string; txHash: string }> = [];

  try {
    const core = getGemetraCoreAddress();
    if (core && valid.length > 0) {
      const sender = await resolveSender();
      const wallet = await getWalletClient();
      const tokenAddress = normalized === "BOT" ? ("0x0000000000000000000000000000000000000000" as Address) : BOTCHAIN_USDT_ADDRESS;
      const amounts = valid.map((item) => toTokenAmount(item.amount, normalized));
      const addrs = valid.map((item) => getAddress(item.address));
      const total = amounts.reduce((acc, n) => acc + n, 0n);

      if (normalized === "USDT") {
        const allowance = await publicClient.readContract({
          address: BOTCHAIN_USDT_ADDRESS,
          abi: erc20Abi,
          functionName: "allowance",
          args: [sender, core],
        });
        if (allowance < total) {
          const approveHash = await wallet.writeContract({
            account: sender,
            address: BOTCHAIN_USDT_ADDRESS,
            abi: erc20Abi,
            functionName: "approve",
            args: [core, total],
            chain: botChain,
          });
          await publicClient.waitForTransactionReceipt({ hash: approveHash });
        }
      }

      const hash = await wallet.writeContract({
        account: sender,
        address: core,
        abi: GEMETRA_CORE_ABI,
        functionName: "disburse",
        args: [
          tokenAddress,
          addrs,
          amounts,
          `0x${crypto.randomUUID().replace(/-/g, "").padEnd(64, "0")}` as Hex,
          "payroll",
        ],
        value: normalized === "BOT" ? total : 0n,
        chain: botChain,
      });
      await publicClient.waitForTransactionReceipt({ hash });
      return {
        txHash: hash,
        txHashes: valid.map((item) => ({ address: item.address, txHash: hash })),
        success: true,
        processed: valid.length,
      };
    }

    for (const item of valid) {
      const result = await sendPayment(item.address, item.amount, normalized);
      if (!result.success) {
        return {
          txHash: txHashes[0]?.txHash ?? "",
          txHashes,
          success: txHashes.length > 0,
          processed: txHashes.length,
          error: result.error || "Some payments failed",
        };
      }
      txHashes.push({ address: item.address, txHash: result.txHash });
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
      error: error instanceof Error ? error.message : String(error),
    };
  }
};

export const sendBulkMneePayments = async (
  recipients: Array<{ address: string; amount: number }>
) => sendBulkPayments(recipients, "USDT");

export const getAccountBalance = async (
  address?: string
): Promise<{ eth: number; mnee: number; usdt: number }> => {
  try {
    const owner = address ?? getConnectedAccount() ?? "";
    if (!owner || !isAddress(owner)) return { eth: 0, mnee: 0, usdt: 0 };
    const target = getAddress(owner);
    const [native, usdt] = await Promise.all([
      publicClient.getBalance({ address: target }),
      getUsdtBalance(target),
    ]);
    return { eth: Number(formatUnits(native, 18)), mnee: usdt, usdt };
  } catch {
    return { eth: 0, mnee: 0, usdt: 0 };
  }
};

export const formatMnee = (amount: number): string => amount.toFixed(2);
export const formatEth = (amount: number): string => amount.toFixed(6);

export async function recordVatRefundOnChain(opts: {
  claimId: string;
  recipient: string;
  amount: number;
  token: PaymentToken | string;
  receiptRef: string;
}): Promise<string | null> {
  const core = getGemetraCoreAddress();
  if (!core || !isAddress(opts.recipient)) return null;
  try {
    const sender = await resolveSender();
    const wallet = await getWalletClient();
    const normalized = normalizePaymentToken(opts.token);
    const tokenAddress =
      normalized === "BOT" ? ("0x0000000000000000000000000000000000000000" as Address) : BOTCHAIN_USDT_ADDRESS;
    const idHex = `0x${opts.claimId.replace(/-/g, "").padEnd(64, "0").slice(0, 64)}` as Hex;
    const hash = await wallet.writeContract({
      account: sender,
      address: core,
      abi: GEMETRA_CORE_ABI,
      functionName: "recordVatRefund",
      args: [
        idHex,
        getAddress(opts.recipient),
        tokenAddress,
        toTokenAmount(opts.amount, normalized),
        opts.receiptRef,
      ],
      chain: botChain,
    });
    await publicClient.waitForTransactionReceipt({ hash });
    return hash;
  } catch {
    return null;
  }
}
