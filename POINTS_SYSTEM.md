# Points & rewards (Gemetra / PUSD)

## Overview

Gemetra includes a lightweight points layer on top of payroll, scheduled payments, and VAT refunds. Points are tracked per **wallet** and surfaced in the top bar. Conversion is denominated as **PUSD** in the UI (Palm USD on Solana); some database columns and internal names still say **MNEE** as legacy labels.

**Payment token vs points:** Payroll, scheduled runs, and VAT refunds can record `payments.token` as **`PUSD`** or **`SOL`** when you pick the token in the UI. Points earning rules are unchanged; **point conversion** still targets **PUSD** (not SOL).

Authoritative earning rules live in **`src/hooks/usePoints.ts`** (`POINTS_RULES`).

## Earning points

| Action | Points | Where it fires |
|--------|--------|----------------|
| Single / one-recipient payroll payment | **10** | `PaymentPreviewModal.tsx` |
| Bulk payroll (per employee paid) | **5 × employee count** | `PaymentPreviewModal.tsx` |
| Scheduled batch run | **3 × number processed** | `ScheduledPayments.tsx` |
| VAT refund (after on-chain succeeds) | **15** | `VATRefundPage.tsx` |

Earning is **best-effort**: failures in the points hook do not block payments or VAT flows.

## Wallet identity (important)

- `usePoints` resolves wallet identity from:
  - `wagmi` address when connected, otherwise
  - connected Solana wallet public key (`getConnectedAccount()`).
- This keeps rewards visible for Solana-first sessions in payroll and VAT flows.

LocalStorage keys mirror the resolved wallet address:

- `gemetra_points_<address>`
- `gemetra_point_transactions_<address>`

## Display & conversion

- **UI**: `PointsDisplay.tsx` (TopBar)—balance, conversion modal, transaction history shortcut.
- **Rate**: **`100` points ⇒ `1` PUSD** (`CONVERSION_RATE` in `usePoints.ts`).
- **Minimum convert**: **`100`** points.
- Conversion path calls **`convertPointsToMnee`** (name kept); it computes PUSDamount, may call **`sendMneePayment`** (Solana SPL transfer helper in `ethereum.ts`) when balance allows, otherwise records **pending** (treasury/backend expected in production).

## Storage & Supabase

- **Primary**: browser **localStorage** (fast, offline-friendly).
- **Secondary**: **`user_points`**, **`point_transactions`**, **`point_conversions`** via Supabase (upsert/insert in `earnPoints` / `convertPointsToMnee`). If Supabase rejects writes (RLS, schema), the app keeps working locally and logs errors—same pattern as payments.

Schema is defined in **`supabase/migrations/20250612200000_points_system.sql`**:

| Table | Role |
|-------|------|
| `user_points` | `user_id` (text wallet), `total_points`, `lifetime_points`, timestamps |
| `point_transactions` | Ledger: earned / converted / expired; `source` includes `payment`, `bulk_payment`, `scheduled_payment`, `vat_refund`, `conversion` |
| `point_conversions` | One row per conversion; `mnee_amount` / naming is legacy—the UI presents **PUSD** |

RLS/policies for these tables must allow your client (typically **anon**) if you want cross-device sync; otherwise points stay device-local only.

## Technical notes

- `earnPoints` uses a **functional** localStorage update; Supabase totals in the upsert still read **`userPoints` from closure**—under heavy parallelism there can be a small drift versus local state; reruns/sync can be hardened later.
- VAT refund points use the **Solana tx signature** as `source_id` when available.
- Code comments in `usePoints` still say “MNEE” in places; behavior is **Solana PUSD** via `sendMneePayment` / `getMneeBalance` (PUSD mint).

## Testing checklist

1. Connect a supported wallet session (Solana wallet or wagmi-backed connection).  
2. Single payment → **+10** points.  
3. Bulk to 3 employees → **+15** points.  
4. Run scheduled processor → **+3** per processed item.  
5. Complete a VAT refund → **+15** points.  
6. Convert **≥100** points → balance drops; check conversion status (completed vs pending) and console logs.

## Future enhancements

- Continue consolidating points/session identity across wallet surfaces.  
- Treasury-backed conversion with reliable on-chain PUSD delivery.  
- Bonus tiers, referrals, expiry, achievements.  
- Stronger Supabase + RLS story for multi-device points.
