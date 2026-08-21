# Gemetra — RWA Remittance on BOT Chain Mainnet

**Real-world VAT refunds & wage distribution** settled in **USDT / native BOT** on **BOT Chain Mainnet** (chain ID **677**).

| | |
| --- | --- |
| **Track** | **RWA Applications** (BOT Builder Challenge #2) |
| **Live demo** | https://gemetra-botchain-ten.vercel.app |
| **GitHub** | https://github.com/AmaanSayyad/Gemetra-BotChain |
| **Demo video** | https://youtu.be/U1QJ2HDRRQE |
| **Explorer (GemetraCore)** | https://scan.botchain.ai/address/0xf924220b12dbedb039245c0b960b7dbb37bf1eb2 |
| **Challenge brief** | [CHALLENGE_SUBMISSION.md](./CHALLENGE_SUBMISSION.md) |

---

## Overview

Gemetra is a **consumer-ready RWA remittance product**: it takes **real-world financial obligations**—tourist **VAT reclaim claims** and **payroll wage distribution**—and completes them on BOT Chain with wallet-signed USDT/BOT transfers plus an immutable on-chain claim registry.

Users connect an EVM wallet (MetaMask, BO Wallet, WalletConnect via Reown AppKit), keep custody of funds, and finish the full business loop on **mainnet**.

| RWA surface | Real-world asset / obligation | On-chain close |
| --- | --- | --- |
| VAT refunds | Tax reclaim after export validation | `recordVatRefund` + USDT/BOT payout |
| Payroll / scheduled pay | Wages owed to workers | `disburse` batch settlement |
| Claim / payrun records | Audit & compliance evidence | BOTScan events + Supabase mirror |

---

## Mainnet deployment

| Item | Value |
| --- | --- |
| Network | BOT Chain Mainnet |
| Chain ID | `677` |
| RPC | `https://rpc.botchain.ai` |
| Explorer | `https://scan.botchain.ai` |
| **GemetraCore** | `0xf924220b12dbedb039245c0b960b7dbb37bf1eb2` |
| Deploy tx | `0xb565ca7f27e8a8055f4bfe19ebb05da711d62072f6200f46657bdff326a64443` |
| Deployer | `0x562d89c9709B5F51dDAcABafC8e0e7A074186428` |
| USDT (ERC-20) | `0xababc7ddc03e501d190c676bf3d92ef0e6e87a3c` |

Artifact: [`deployments/botchain-mainnet.json`](./deployments/botchain-mainnet.json)  
Contract: [`contracts/GemetraCore.sol`](./contracts/GemetraCore.sol)

`GemetraCore` never custodies funds. It:

- **`disburse`** — batch native BOT or ERC-20 USDT `transferFrom` payer → recipients (payroll / refund distribution)  
- **`recordVatRefund`** — immutable VAT claim registry for RWA audit  
- **`logAgentAction`** — optional ops / automation audit trail  

---

## System architecture (RWA)

```mermaid
flowchart TB
  subgraph RealWorld["Real-world assets & obligations"]
    VATRW["VAT reclaim claims<br/>tourist tax"]
    WAGERW["Wage obligations<br/>payroll / schedules"]
  end

  subgraph Client
    WEB["React + Vite app"]
    W["EVM wallets<br/>Reown AppKit"]
  end

  subgraph App
    UI["VAT · Payroll · Admin · Ops"]
    ETH["ethereum.ts / wagmi / viem"]
  end

  subgraph Data
    SB["Supabase<br/>claims · payments · employees"]
  end

  subgraph BOT["BOT Chain Mainnet · 677"]
    CORE["GemetraCore<br/>registry + disburse"]
    USDT["USDT ERC-20"]
    SCAN["BOTScan"]
  end

  VATRW --> UI
  WAGERW --> UI
  WEB --> UI
  UI --> ETH
  UI --> SB
  ETH --> W
  W --> CORE
  W --> USDT
  CORE --> SCAN
  USDT --> SCAN
```

---

## End-to-end RWA product loop

```mermaid
sequenceDiagram
  actor Op as Operator / Employer
  participant UI as Gemetra Web
  participant W as Wallet (AppKit)
  participant C as GemetraCore
  participant T as USDT
  participant S as Supabase
  participant X as BOTScan

  Op->>UI: Open demo · connect wallet (eip155:677)
  W-->>UI: address + chain

  alt VAT refund (tax reclaim RWA)
    Op->>UI: Claim + receipt metadata
    UI->>W: Sign payout
    W->>C: recordVatRefund(claimId, …)
    W->>C: disburse / transfer USDT|BOT
    C-->>X: VatRefundRecorded + Disbursed
    UI->>S: Persist claim + tx hash
  else Payroll / wage distribution RWA
    Op->>UI: Employees + amounts + USDT|BOT
    UI->>W: approve USDT → GemetraCore (if needed)
    W->>T: approve(core, total)
    W->>C: disburse(...)
    C->>T: transferFrom(payer → recipients)
    C-->>X: Disbursed
    UI->>S: Store payment rows
  end

  Op->>X: Verify on BOTScan
```

---

## VAT refund (core RWA) sequence

```mermaid
sequenceDiagram
  actor Tourist
  participant Retailer
  participant Gemetra as Gemetra App
  participant Oracle as Export oracle (ops)
  participant Core as GemetraCore
  participant Wallet as Payer wallet

  Tourist->>Retailer: Purchase (VAT included)
  Retailer->>Gemetra: Tax-free tag / claim metadata
  Tourist->>Oracle: Airport export validation
  Oracle->>Gemetra: Validated claim (receipt ref)
  Gemetra->>Wallet: Request USDT/BOT payout signature
  Wallet->>Core: recordVatRefund + disburse/transfer
  Core-->>Tourist: On-chain refund + claim registry
```

---

## Wage distribution (RWA) sequence

```mermaid
sequenceDiagram
  actor HR as HR / CFO
  participant UI as Gemetra
  participant W as Wallet
  participant C as GemetraCore

  HR->>UI: Upload / select payrun (real wage obligations)
  HR->>UI: Preview totals · USDT or BOT
  UI->>W: User confirms & signs
  W->>C: disburse(payroll)
  C-->>UI: tx hash · BOTScan link
```

---

## Scheduled wage runs

```mermaid
sequenceDiagram
  actor User
  participant UI as Gemetra
  participant LS as localStorage / Supabase
  participant W as Wallet
  participant C as GemetraCore

  User->>UI: Schedule USDT|BOT wage run
  UI->>LS: Persist schedule + pre-approval limits
  loop When due
    UI->>W: Sign disburse / transfer
    W->>C: Settle on BOT Chain
    UI->>LS: Mark processed · next date
  end
```

---

## Features (RWA product)

- **VAT refunds** — claim form, USDT/BOT payout, on-chain `recordVatRefund`  
- **VAT admin** — filter/export claims for compliance ops  
- **Wage / bulk payroll** — CSV + preview + `GemetraCore.disburse`  
- **Scheduled distributions** — calendar, recurrence, per-token pre-approval  
- **Wallet-native UX** — Reown AppKit on chain 677  
- **RWA engagement points** — earn on completed VAT/wage settlements ([POINTS_SYSTEM.md](./POINTS_SYSTEM.md))  
- **Ops assistant** (optional) — in-app help over claim/payrun context; not the product’s RWA thesis  

---

## Stack

| Layer | Tech |
| --- | --- |
| Frontend | React 18, Vite, Tailwind, Framer Motion |
| Wallets | wagmi v3, viem, `@reown/appkit` |
| Chain | BOT Chain Mainnet `677` |
| Contracts | Solidity `GemetraCore` |
| Data | Supabase (Postgres) |
| Hosting | Vercel |

---

## Quick start

```bash
pnpm install
cp .env.example .env
pnpm dev
```

### Environment (production / mainnet)

```env
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
VITE_WALLETCONNECT_PROJECT_ID=...
VITE_BOTCHAIN_NETWORK=mainnet
VITE_GEMETRA_CORE_ADDRESS=0xf924220b12dbedb039245c0b960b7dbb37bf1eb2
```

### Deploy contracts (optional)

```bash
pnpm wallet:create
pnpm deploy:core
```

---

## Documentation

| Doc | Purpose |
| --- | --- |
| [CHALLENGE_SUBMISSION.md](./CHALLENGE_SUBMISSION.md) | RWA track checklist & migration answers |
| [VAT_REFUND_DOCUMENT_FORMAT_GUIDE.md](./VAT_REFUND_DOCUMENT_FORMAT_GUIDE.md) | Receipt / claim document formats |
| [VAT_REFUND_SAMPLE_DATA.md](./VAT_REFUND_SAMPLE_DATA.md) | Sample VAT claim payloads |
| [POINTS_SYSTEM.md](./POINTS_SYSTEM.md) | RWA engagement points on settlements |
| `samples/` | JSON / CSV claim examples |

---

## Why BOT Chain (migration)

Gemetra moved settlement to BOT Chain to run **RWA remittance** (VAT reclaim + wage distribution) on an EVM mainnet with USDT rails, custody-free `GemetraCore`, and BOTScan-verifiable claim/payrun evidence—not a superficial redeploy.

Growth focus: tourist VAT corridors + SME wage runs on BOT mainnet (see challenge doc).

---

## License & contact

MIT — see [LICENSE](./LICENSE)

- Email: amaansayyad2001@gmail.com  
- GitHub: [@AmaanSayyad](https://github.com/AmaanSayyad)  
- Telegram: [@amaan029](https://t.me/amaan029)
