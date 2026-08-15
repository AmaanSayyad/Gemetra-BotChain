/** Paths under `/public` for token artwork */

export const TOKEN_LOGOS = {
  BOT: "/botchain.png",
  SOL: "/botchain.png",
  PUSD: "/usdt.png",
  USDT: "/usdt.png",
} as const;

/** Resolve a logo URL for dashboard token labels (USDT, BOT, plus legacy PUSD/SOL). */
export function tokenLogoSrc(symbol: string | null | undefined): string | null {
  const key = (symbol ?? "").trim().toUpperCase();
  if (key === "BOT" || key === "SOL" || key === "SOLANA") return TOKEN_LOGOS.BOT;
  if (key === "USDT" || key === "PUSD" || key === "PALM USD") return TOKEN_LOGOS.USDT;
  return null;
}
