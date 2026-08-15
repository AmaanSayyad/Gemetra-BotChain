import { parseUnits } from "viem";
import { BOTCHAIN_USDT_ADDRESS, BOTCHAIN_USDT_DECIMALS } from "../config/botchain";
import { normalizePaymentToken, type PaymentToken } from "./ethereum";

/** EIP-681 payment URI for native BOT. */
export function buildNativePayUrl(opts: {
  recipient: string;
  amountUi: number;
  label?: string;
  message?: string;
}): string {
  const value = parseUnits(opts.amountUi.toFixed(18), 18).toString();
  const params = new URLSearchParams({ value });
  if (opts.label) params.set("label", opts.label);
  if (opts.message) params.set("message", opts.message);
  return `ethereum:${opts.recipient}@677?${params.toString()}`;
}

/** EIP-681 ERC-20 transfer URI for BOT Chain USDT. */
export function buildUsdtPayUrl(opts: {
  recipient: string;
  amountUi: number;
  label?: string;
  message?: string;
}): string {
  const amount = parseUnits(opts.amountUi.toFixed(BOTCHAIN_USDT_DECIMALS), BOTCHAIN_USDT_DECIMALS).toString();
  const params = new URLSearchParams({
    address: opts.recipient,
    uint256: amount,
  });
  if (opts.label) params.set("label", opts.label);
  if (opts.message) params.set("message", opts.message);
  return `ethereum:${BOTCHAIN_USDT_ADDRESS}@677/transfer?${params.toString()}`;
}

export function buildPaymentQrUrl(opts: {
  recipient: string;
  amountUi: number;
  token?: PaymentToken | string;
  label?: string;
  message?: string;
}): string {
  return normalizePaymentToken(opts.token) === "BOT"
    ? buildNativePayUrl({
        recipient: opts.recipient,
        amountUi: opts.amountUi,
        label: opts.label,
        message: opts.message,
      })
    : buildUsdtPayUrl({
        recipient: opts.recipient,
        amountUi: opts.amountUi,
        label: opts.label,
        message: opts.message,
      });
}

/** @deprecated Use buildUsdtPayUrl */
export function buildSplTokenSolanaPayUrl(opts: {
  recipientBase58: string;
  splMintBase58: string;
  amountUi: number;
  label?: string;
  message?: string;
}): string {
  return buildUsdtPayUrl({
    recipient: opts.recipientBase58,
    amountUi: opts.amountUi,
    label: opts.label,
    message: opts.message,
  });
}

/** @deprecated Use buildNativePayUrl */
export function buildSolanaPayUrl(opts: {
  recipientBase58: string;
  amountUi: number;
  label?: string;
  message?: string;
}): string {
  return buildNativePayUrl({
    recipient: opts.recipientBase58,
    amountUi: opts.amountUi,
    label: opts.label,
    message: opts.message,
  });
}

export function buildPhantomBrowsePaymentQrUrl(payUrl: string, _appOrigin: string): string {
  return payUrl;
}

export function isSolanaMobilePaymentQr(value: string): boolean {
  return value.startsWith("ethereum:") || value.startsWith("botchain:");
}
