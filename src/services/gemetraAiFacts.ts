/**
 * Single source of truth for AI-facing product facts — keeps answers aligned with the shipped app.
 */
import { BOTCHAIN_USDT_ADDRESS, explorerTokenUrl, explorerTxUrl } from "../config/botchain";

/** Override with `VITE_GEMINI_MODEL` if Google rotates defaults (see Gemini API model list). */
export const GEMETRA_AI_MODEL =
  (import.meta.env.VITE_GEMINI_MODEL as string | undefined)?.trim() || "gemini-2.5-flash";

export const GEMETRA_APP_SNAPSHOT = {
  product: "Gemetra",
  payrollChain: "BOT Chain mainnet",
  gasToken: "BOT",
  payrollStablecoinName: "USDT",
  payrollStablecoinSymbol: "USDT",
  optionalNativePayoutSymbol: "BOT",
  walletUi: "EVM wallets (MetaMask, BO Wallet, WalletConnect, Coinbase)",
  usdtAddress: BOTCHAIN_USDT_ADDRESS,
  tokenProgram: "ERC-20 on BOT Chain (chain ID 677)",
  explorers: {
    token: explorerTokenUrl(BOTCHAIN_USDT_ADDRESS),
  },
  docs: [
    "https://www.botchain.ai/",
    "https://dev-docs.botchain.ai/docs/Developers/quick-guide/",
    "https://scan.botchain.ai/",
  ],
} as const;

export function solanaTxExplorerUrl(signature: string): string {
  return explorerTxUrl(signature);
}

/** Static system instruction: rules + facts (no user PII). */
export function buildGemetraSystemInstruction(): string {
  const today = new Date().toISOString().slice(0, 10);
  const G = GEMETRA_APP_SNAPSHOT;
  return `You are Gemetra's in-app assistant.

REFERENCE DATE (use for time-relative phrasing): ${today}

AUTHORITATIVE PRODUCT FACTS (override outdated training assumptions):
• Gemetra is a payroll/VAT-remittance dashboard; payouts in THIS app use **BOT Chain (${
    G.payrollChain
  })**, native fees in **BOT**, default stable payouts in **${G.payrollStablecoinName} (${G.payrollStablecoinSymbol})**, and optional **${G.optionalNativePayoutSymbol}** disbursements when the user selects BOT in payroll, VAT refund, or scheduled payment flows.
• Users connect an EVM wallet (MetaMask, BO Wallet, WalletConnect, Coinbase) on BOT Chain (chain ID 677).
• On BOT Chain, USDT uses contract address: ${G.usdtAddress} (${G.tokenProgram}). Token on explorer: ${G.explorers.token}
• Official BOT Chain pointers: ${G.docs.join(" | ")}

ACCURACY & BEHAVIOR:
1. Do **not** claim payroll uses **MNEE** or **PUSD on Solana**. Older hackathon wording is obsolete. If users say "PUSD", "SOL", or "MNEE", politely clarify that this product now settles in **USDT and native BOT on BOT Chain**.
2. Do **not** invent circulation, TVL, partnership dates, listings, audits, regulatory claims, or "live chain counts". If asked for evolving protocol/market metrics, summarize from user-provided data when present — otherwise defer to botchain.ai and note figures change.
3. Ground payroll/employee/payment specifics **only** in the USER CONTEXT block supplied in the conversation turn (employee list, payments, counts). Never fabricate salaries or recipients.
4. For general crypto ATH/ATL/price/market trivia not in USER CONTEXT: answer from well-known facts but avoid precision you are unsure about; prefer ranges or "approximately" unless user context includes live numbers from tools/APIs elsewhere in the pipeline.
5. Be concise first; elaborate if the user asks for depth.

OUTPUT: Clear markdown where helpful; no filler hype.`;
}

/** User-turn context appended before the user's question (PII). */
export function buildGemetraUserContextBlock(params: {
  companyName: string;
  employeeLines: string;
  paymentLines: string;
  memoryLines: string;
  thinkingSummary: string;
}): string {
  return `[USER CONTEXT]
Company display name: ${params.companyName}
${params.thinkingSummary}

Employees:
${params.employeeLines}

Recent payments (if any):
${params.paymentLines}

Recent conversation excerpts:
${params.memoryLines}`;
}

export function formatPusdInfoReply(): string {
  const G = GEMETRA_APP_SNAPSHOT;
  return `🪙 **${G.payrollStablecoinName} (${G.payrollStablecoinSymbol}) — how Gemetra uses it**

**What it is:** Bridged USDT on BOT Chain — the USD‑pegged stablecoin used in this product for nominally dollar‑denominated payroll and refunds.

**BOT Chain contract (what this app integrates):**
\`${G.usdtAddress}\`
• Explorer: ${G.explorers.token}
• Program type: ${G.tokenProgram}

**In Gemetra**
• Connect an **EVM wallet** on **BOT Chain mainnet (677)**, keep a small **BOT** balance for fees, and hold/send **USDT** for stablecoin payouts.
• Some screens also let you pay out **native BOT** instead of USDT when the token toggle is set to BOT (bulk payroll, VAT refund, scheduled payments).
• For network docs, see **${G.docs[0]}**.

**Note:** If you asked about “PUSD”, “SOL”, or “MNEE”, this product now settles on **BOT Chain with USDT / BOT**.`;
}
