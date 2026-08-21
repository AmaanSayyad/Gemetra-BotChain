/** Paths under `/public` for token artwork */

export const TOKEN_LOGOS = {
  BOT: "/botchain.png",
  USDT: "/usdt.png",
} as const;

/** Resolve a logo URL for dashboard token labels (USDT, BOT). */
export function tokenLogoSrc(symbol: string | null | undefined): string | null {
  const key = (symbol ?? "").trim().toUpperCase();
  if (key === "BOT") return TOKEN_LOGOS.BOT;
  if (key === "USDT") return TOKEN_LOGOS.USDT;
  return null;
}
