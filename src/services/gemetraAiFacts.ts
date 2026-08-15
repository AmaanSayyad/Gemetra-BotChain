/**
 * Single source of truth for AI-facing product facts — keeps answers aligned with the shipped app.
 */
import { PUSD_SOLANA_MINT } from "../utils/ethereum";

/** Override with `VITE_GEMINI_MODEL` if Google rotates defaults (see Gemini API model list). */
export const GEMETRA_AI_MODEL =
  (import.meta.env.VITE_GEMINI_MODEL as string | undefined)?.trim() || "gemini-2.5-flash";

export const GEMETRA_APP_SNAPSHOT = {
  product: "Gemetra",
  /** Primary settlement rail in this codebase */
  payrollChain: "Solana mainnet-beta",
  gasToken: "SOL",
  payrollStablecoinName: "Palm USD",
  payrollStablecoinSymbol: "PUSD",
  /** Optional disbursement asset in the shipped UI (bulk payroll, VAT refund, scheduled payments). */
  optionalNativePayoutSymbol: "SOL",
  walletUi: "Solana Wallet Adapter (Phantom, Solflare, Ledger, WalletConnect, etc.)",
  pusdMintSolana: PUSD_SOLANA_MINT,
  tokenProgramSolana:
    "SPL Token-2022 (associated token addresses use Token-2022 program id, not legacy SPL Token only)",
  explorers: {
    mintSolscan: `https://solscan.io/token/${PUSD_SOLANA_MINT}`,
  },
  docs: ["https://www.palmusd.com", "https://www.palmusd.com/pages/developers.html"],
} as const;

export function solanaTxExplorerUrl(signature: string): string {
  const s = signature.trim();
  if (!s) return GEMETRA_APP_SNAPSHOT.explorers.mintSolscan;
  return `https://solscan.io/tx/${s}`;
}

/** Static system instruction: rules + facts (no user PII). */
export function buildGemetraSystemInstruction(): string {
  const today = new Date().toISOString().slice(0, 10);
  const G = GEMETRA_APP_SNAPSHOT;
  return `You are Gemetra's in-app assistant.

REFERENCE DATE (use for time-relative phrasing): ${today}

AUTHORITATIVE PRODUCT FACTS (override outdated training assumptions):
• Gemetra is a payroll/VAT-remittance dashboard; payouts in THIS app use **Solana (${
    G.payrollChain
  })**, native fees in **SOL**, default stable payouts in **${G.payrollStablecoinName} (${G.payrollStablecoinSymbol})**, and optional **${G.optionalNativePayoutSymbol}** disbursements when the user selects SOL in payroll, VAT refund, or scheduled payment flows.
• Users connect a Solana wallet from the browser via the Wallet Adapter (Phantom, Solflare, Ledger, WalletConnect, etc.).
• On Solana, PUSD uses mint address: ${G.pusdMintSolana} (${G.tokenProgramSolana}). Mint on explorer: ${G.explorers.mintSolscan}
• Official Palm USD pointers: ${G.docs.join(" | ")}

ACCURACY & BEHAVIOR:
1. Do **not** claim payroll uses **MNEE**. Older hackathon wording is obsolete. If users say "MNEE", politely clarify that this product uses **Palm USD (PUSD) on Solana** for payouts here.
2. Do **not** invent circulation, TVL, partnership dates, listings, audits, regulatory claims, or "live chain counts". If asked for evolving protocol/market metrics, summarize from user-provided data when present — otherwise defer to palmusd.com and note figures change.
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

**What it is:** ${G.payrollStablecoinName} is a USD‑pegged stablecoin used in this product for nominally dollar‑denominated payroll and refunds on **Solana**.

**Solana mint (what this app integrates):**
\`${G.pusdMintSolana}\`
• Explorer: ${G.explorers.mintSolscan}
• Program type: ${G.tokenProgramSolana}

**In Gemetra**
• Connect a **Solana wallet** on **Solana mainnet‑beta**, keep a small SOL balance for fees, and hold/send **PUSD** for stablecoin payouts.
• Some screens also let you pay out **native SOL** instead of PUSD when the token toggle is set to SOL (bulk payroll, VAT refund, scheduled payments).
• For circulating supply / reserves / legal, see **${G.docs[0]}** — do not guess those numbers in product copy.

**Note:** If you asked about “MNEE”, this codebase historically mixed names; payroll here is **PUSD on Solana** as above.`;
}
