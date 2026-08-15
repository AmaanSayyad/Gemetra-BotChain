import type { Payment } from "../lib/supabase";

const STORAGE_PREFIX = "gemetra_payments_";

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
    (p) => p.employee_id === "vat-refund",
  );
}
