import type { Payment } from "../lib/supabase";

const STORAGE_PREFIX = "gemetra_payments_";

/** Pre–BOT Chain VAT rows (Solana / PalmUSD era) — strip from admin & history. */
const LEGACY_VAT_TOKENS = new Set(["SOL", "SOLANA", "PUSD", "MNEE", "PALMUSD"]);

export function isLegacyVatToken(token: string | undefined | null): boolean {
  return LEGACY_VAT_TOKENS.has((token ?? "").trim().toUpperCase());
}

export function isBotChainVatToken(token: string | undefined | null): boolean {
  const t = (token ?? "USDT").trim().toUpperCase();
  return t === "USDT" || t === "BOT";
}

/** Drop SOL/PUSD (etc.) VAT refunds from every `gemetra_payments_*` bucket. */
export function purgeLegacyVatRefundPaymentsFromBrowserLocalStorage(): number {
  if (typeof localStorage === "undefined") return 0;

  let removed = 0;
  const keysToUpdate: Array<{ key: string; next: Payment[] }> = [];

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key?.startsWith(STORAGE_PREFIX)) continue;
    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) continue;
      const kept: Payment[] = [];
      for (const row of parsed) {
        const p = row as Payment;
        if (p?.employee_id === "vat-refund" && isLegacyVatToken(p.token)) {
          removed++;
        } else if (p?.id) {
          kept.push(p);
        }
      }
      if (kept.length !== parsed.length) {
        keysToUpdate.push({ key, next: kept });
      }
    } catch {
      /* ignore corrupt buckets */
    }
  }

  for (const { key, next } of keysToUpdate) {
    localStorage.setItem(key, JSON.stringify(next));
  }

  return removed;
}

/** All payment rows persisted by `usePayments` across every wallet key on this browser. */
export function getAllPaymentsFromBrowserLocalStorage(): Payment[] {
  if (typeof localStorage === "undefined") return [];

  const byId = new Map<string, Payment>();
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key?.startsWith(STORAGE_PREFIX)) continue;
    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) continue;
      for (const row of parsed) {
        const p = row as Payment;
        if (p?.id && typeof p.employee_id === "string") {
          byId.set(p.id, p);
        }
      }
    } catch {
      /* ignore corrupt buckets */
    }
  }
  return [...byId.values()];
}

/** VAT refunds stored locally (Refund History reads the same buckets; Admin used to read only Supabase). */
export function getVatRefundPaymentsFromBrowserLocalStorage(): Payment[] {
  return getAllPaymentsFromBrowserLocalStorage().filter(
    (p) => p.employee_id === "vat-refund" && isBotChainVatToken(p.token),
  );
}

/** Remove all VAT refund rows from every `gemetra_payments_*` bucket in this browser. */
export function clearVatRefundPaymentsFromBrowserLocalStorage(): number {
  if (typeof localStorage === "undefined") return 0;

  let removed = 0;
  const keysToUpdate: Array<{ key: string; next: Payment[] }> = [];

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key?.startsWith(STORAGE_PREFIX)) continue;
    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) continue;
      const kept: Payment[] = [];
      for (const row of parsed) {
        const p = row as Payment;
        if (p?.employee_id === "vat-refund") {
          removed++;
        } else if (p?.id) {
          kept.push(p);
        }
      }
      if (kept.length !== parsed.length) {
        keysToUpdate.push({ key, next: kept });
      }
    } catch {
      /* ignore corrupt buckets */
    }
  }

  for (const { key, next } of keysToUpdate) {
    localStorage.setItem(key, JSON.stringify(next));
  }

  return removed;
}
