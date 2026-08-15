/**
 * On-chain smoke tests against the deployed GemetraCore.
 * Usage: BOTCHAIN_NETWORK=testnet node scripts/e2e-botchain.mjs
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  createPublicClient,
  createWalletClient,
  http,
  parseEther,
  isAddress,
  getAddress,
  encodeFunctionData,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const NETWORK = (process.env.BOTCHAIN_NETWORK || "testnet").toLowerCase();

const NET =
  NETWORK === "testnet"
    ? {
        id: 968,
        name: "BOT Chain Testnet",
        rpc: "https://rpc.bohr.life",
        explorer: "https://scan.bohr.life",
        usdt: "0x75edC9335175Fc0552D51D48439F229c10420fe3",
      }
    : {
        id: 677,
        name: "BOT Chain",
        rpc: "https://rpc.botchain.ai",
        explorer: "https://scan.botchain.ai",
        usdt: "0xababc7ddc03e501d190c676bf3d92ef0e6e87a3c",
      };

const deployFile = resolve(root, `deployments/botchain-${NETWORK}.json`);
if (!existsSync(deployFile)) throw new Error(`Missing ${deployFile}`);
const deployment = JSON.parse(readFileSync(deployFile, "utf8"));
const core = getAddress(deployment.gemetraCore);

const deployerPath = resolve(root, ".deployer.json");
if (!existsSync(deployerPath)) throw new Error("Missing .deployer.json");
const { privateKey } = JSON.parse(readFileSync(deployerPath, "utf8"));
const account = privateKeyToAccount(privateKey);

const chain = {
  id: NET.id,
  name: NET.name,
  nativeCurrency: { name: "BOT", symbol: "BOT", decimals: 18 },
  rpcUrls: { default: { http: [NET.rpc] } },
};

const publicClient = createPublicClient({ chain, transport: http(NET.rpc) });
const walletClient = createWalletClient({
  account,
  chain,
  transport: http(NET.rpc),
});

const CORE_ABI = [
  {
    type: "function",
    name: "recordVatRefund",
    stateMutability: "nonpayable",
    inputs: [
      { name: "claimId", type: "bytes32" },
      { name: "recipient", type: "address" },
      { name: "token", type: "address" },
      { name: "amount", type: "uint256" },
      { name: "receiptRef", type: "string" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "disburse",
    stateMutability: "payable",
    inputs: [
      { name: "token", type: "address" },
      { name: "recipients", type: "address[]" },
      { name: "amounts", type: "uint256[]" },
      { name: "ref", type: "bytes32" },
      { name: "kind", type: "string" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "logAgentAction",
    stateMutability: "nonpayable",
    inputs: [
      { name: "actionId", type: "bytes32" },
      { name: "kind", type: "string" },
      { name: "payloadHash", type: "bytes32" },
    ],
    outputs: [],
  },
];

const results = [];
function ok(name, extra = "") {
  results.push({ name, pass: true, extra });
  console.log(`PASS  ${name}${extra ? ` — ${extra}` : ""}`);
}
function fail(name, extra = "") {
  results.push({ name, pass: false, extra });
  console.error(`FAIL  ${name}${extra ? ` — ${extra}` : ""}`);
}

async function main() {
  console.log("Network:", NET.name, NET.id);
  console.log("Core:", core);
  console.log("Deployer:", account.address);

  const block = await publicClient.getBlockNumber();
  ok("rpc", `block ${block}`);

  const code = await publicClient.getBytecode({ address: core });
  if (code && code !== "0x") ok("contract bytecode", `${code.length} chars`);
  else fail("contract bytecode", "empty");

  if (!isAddress(NET.usdt)) fail("usdt address");
  else ok("usdt address", NET.usdt);

  const usdtCode = await publicClient.getBytecode({ address: NET.usdt });
  if (usdtCode && usdtCode !== "0x") ok("usdt contract exists");
  else fail("usdt contract exists");

  const claimId = `0x${crypto.randomUUID().replace(/-/g, "").padEnd(64, "0")}`;
  const vatHash = await walletClient.writeContract({
    address: core,
    abi: CORE_ABI,
    functionName: "recordVatRefund",
    args: [
      claimId,
      account.address,
      "0x0000000000000000000000000000000000000000",
      parseEther("0.01"),
      "e2e-receipt",
    ],
  });
  const vatRcpt = await publicClient.waitForTransactionReceipt({ hash: vatHash });
  if (vatRcpt.status === "success") ok("recordVatRefund", vatHash);
  else fail("recordVatRefund", vatHash);

  const amount = parseEther("0.001");
  const disburseHash = await walletClient.writeContract({
    address: core,
    abi: CORE_ABI,
    functionName: "disburse",
    args: [
      "0x0000000000000000000000000000000000000000",
      [account.address],
      [amount],
      `0x${crypto.randomUUID().replace(/-/g, "").padEnd(64, "0")}`,
      "payroll",
    ],
    value: amount,
  });
  const disburseRcpt = await publicClient.waitForTransactionReceipt({ hash: disburseHash });
  if (disburseRcpt.status === "success") ok("disburse native BOT", disburseHash);
  else fail("disburse native BOT", disburseHash);

  const agentHash = await walletClient.writeContract({
    address: core,
    abi: CORE_ABI,
    functionName: "logAgentAction",
    args: [
      `0x${crypto.randomUUID().replace(/-/g, "").padEnd(64, "0")}`,
      "e2e-ai",
      `0x${"11".repeat(32)}`,
    ],
  });
  const agentRcpt = await publicClient.waitForTransactionReceipt({ hash: agentHash });
  if (agentRcpt.status === "success") ok("logAgentAction", agentHash);
  else fail("logAgentAction", agentHash);

  const failed = results.filter((r) => !r.pass);
  console.log(`\n${results.length - failed.length}/${results.length} passed`);
  if (failed.length) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
