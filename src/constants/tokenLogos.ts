/** Paths under `/public` for token artwork */

export const TOKEN_LOGOS = {
  SOL: "/solana-sol-logo.png",
  PUSD: "/pusd.svg",
  USDT: "/usdt.png",
} as const;

/** Resolve a logo URL for dashboard token labels (PUSD, USDT, SOL, etc.). */
export function tokenLogoSrc(symbol: string | null | undefined): string | null {
  const key = (symbol ?? "").trim().toUpperCase();
  if (key === "SOL" || key === "SOLANA") return TOKEN_LOGOS.SOL;
  if (key === "PUSD" || key === "PALM USD") return TOKEN_LOGOS.PUSD;
  if (key === "USDT") return TOKEN_LOGOS.USDT;
  return null;
}
