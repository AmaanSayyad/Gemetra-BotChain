# Points System

Gemetra includes a lightweight points layer on top of payroll, scheduled payments, and VAT refunds. Points are tracked per **wallet** and surfaced in the top bar. Conversion is denominated as **USDT** on **BOT Chain**.

---

## Flow

```mermaid
sequenceDiagram
  actor User
  participant UI as Gemetra UI
  participant Pts as usePoints / localStorage
  participant SB as Supabase
  participant W as Wallet
  participant U as USDT (BOT Chain)

  User->>UI: Complete payroll / VAT / scheduled payment
  UI->>Pts: earnPoints(source)
  Pts->>SB: upsert user_points + point_transactions

  User->>UI: Convert points → USDT
  UI->>Pts: convertPointsToUsdt(points, recipient?)
  Pts->>W: getUsdtBalance / sendPayment(USDT)
  alt Sufficient USDT in connected wallet
    W->>U: ERC-20 transfer
    Pts->>SB: point_conversions status=completed
  else Insufficient balance
    Pts->>SB: point_conversions status=pending (treasury)
  end
```

---

## Earning

Points are awarded for completed flows (see `POINTS_RULES` in `src/hooks/usePoints.ts`):

| Source | Typical award |
| --- | --- |
| Single payment | +10 |
| Bulk payroll (per employee factor) | +5 × count |
| Scheduled payment | +3 |
| VAT refund | +15 |

---

## Conversion

- **Rate:** `100` points ⇒ `1` USDT (`CONVERSION_RATE` in `usePoints.ts`).  
- **Path:** `convertPointsToUsdt` → `sendPayment(..., "USDT")` when the connected wallet holds enough USDT; otherwise records **pending** (treasury-backed fulfillment in production).  
- Recipient defaults to the connected wallet; UI allows an alternate BOT Chain address.

---

## Storage

| Layer | Detail |
| --- | --- |
| Primary | `localStorage` keys `gemetra_points_*`, `gemetra_point_transactions_*` |
| Secondary | Supabase `user_points`, `point_transactions`, `point_conversions` |
| Legacy column | `mnee_amount` stores the **USDT** amount (historical column name) |

```mermaid
erDiagram
  USER_POINTS ||--o{ POINT_TRANSACTIONS : has
  USER_POINTS ||--o{ POINT_CONVERSIONS : has

  USER_POINTS {
    text user_id PK
    int total_points
    int lifetime_points
  }

  POINT_TRANSACTIONS {
    text id PK
    text user_id
    int points
    text source
  }

  POINT_CONVERSIONS {
    text id PK
    text user_id
    int points
    decimal mnee_amount
    text status
    text transaction_hash
  }
```

---

## Future

- Dedicated treasury wallet for reliable USDT delivery on conversion.  
- Optional on-chain points receipt via `logAgentAction` / dedicated events.
