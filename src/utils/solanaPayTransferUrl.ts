import { encodeURL } from "@solana/pay";

/**
 * Build a Solana Pay *transfer request* URL (Phantom, Solflare, etc.).
 * Prefer this over concatenating strings — malformed URLs trigger wrong chains in some scanners.
 */
export function buildSplTokenSolanaPayUrl(opts: {
  recipientBase58: string;
  splMintBase58: string;
  amountUi: number;
  label?: string;
  message?: string;
}): string {
  return encodeURL({
    recipient: opts.recipientBase58,
    amount: opts.amountUi,
    splToken: opts.splMintBase58,
    label: opts.label,
    message: opts.message,
  }).toString();
}

export function buildSolanaPayUrl(opts: {
  recipientBase58: string;
  amountUi: number;
  label?: string;
  message?: string;
}): string {
  return encodeURL({
    recipient: opts.recipientBase58,
    amount: opts.amountUi,
    label: opts.label,
    message: opts.message,
  }).toString();
}

const PHANTOM_BROWSE_UL = "https://phantom.app/ul/browse/";

/**
 * QR value that opens Phantom on iOS (via universal link), then our HTTPS page redirects to the real `solana:…` payment.
 * Raw `solana:` QRs are often handled by Coinbase Wallet; Phantom’s browse flow expects an https URL.
 * @see https://docs.phantom.com/phantom-deeplinks/other-methods/browse
 */
export function buildPhantomBrowsePaymentQrUrl(
  solanaPayUrl: string,
  appOrigin: string,
): string {
  const origin = appOrigin.replace(/\/$/, "");
  const inner = `${origin}/vat-solana-pay-redirect.html#${encodeURIComponent(solanaPayUrl)}`;
  const ref = `${origin}/`;
  return `${PHANTOM_BROWSE_UL}${encodeURIComponent(inner)}?ref=${encodeURIComponent(ref)}`;
}

/** True if the QR encodes Solana Pay or Phantom’s browse wrapper for it (safe to render as payment QR). */
export function isSolanaMobilePaymentQr(value: string): boolean {
  return (
    value.startsWith("solana:") ||
    value.startsWith(PHANTOM_BROWSE_UL)
  );
}
