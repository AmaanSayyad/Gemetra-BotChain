/**
 * Deploy GemetraCore to BOT Chain mainnet.
 * Usage (after funding): node scripts/deploy-gemetra-core.mjs
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createWalletClient, createPublicClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import solc from "solc";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const deployerPath = resolve(root, ".deployer.json");
const outDir = resolve(root, "deployments");
const NETWORK = (process.env.BOTCHAIN_NETWORK || "mainnet").toLowerCase();
const outPath = resolve(outDir, `botchain-${NETWORK}.json`);
const NETWORKS = {
  mainnet: {
    id: 677,
    name: "BOT Chain",
    rpc: "https://rpc.botchain.ai",
    explorer: "https://scan.botchain.ai",
    usdt: "0xababc7ddc03e501d190c676bf3d92ef0e6e87a3c",
  },
  testnet: {
    id: 968,
    name: "BOT Chain Testnet",
    rpc: "https://rpc.bohr.life",
    explorer: "https://scan.bohr.life",
    usdt: process.env.BOTCHAIN_USDT || "0xababc7ddc03e501d190c676bf3d92ef0e6e87a3c",
  },
};
const NET = NETWORKS[NETWORK] || NETWORKS.mainnet;
const BOT_CHAIN = {
  id: NET.id,
  name: NET.name,
  nativeCurrency: { name: "BOT", symbol: "BOT", decimals: 18 },
  rpcUrls: { default: { http: [NET.rpc] } },
};

function compile() {
  const source = readFileSync(resolve(root, "contracts/GemetraCore.sol"), "utf8");
  const input = {
    language: "Solidity",
    sources: { "GemetraCore.sol": { content: source } },
    settings: {
      optimizer: { enabled: true, runs: 200 },
      outputSelection: { "*": { "*": ["abi", "evm.bytecode.object"] } },
    },
  };
  const output = JSON.parse(solc.compile(JSON.stringify(input)));
  if (output.errors?.some((e) => e.severity === "error")) {
    console.error(output.errors);
    throw new Error("Solidity compile failed");
  }
  const art = output.contracts["GemetraCore.sol"].GemetraCore;
  return { abi: art.abi, bytecode: `0x${art.evm.bytecode.object}` };
}

async function main() {
  if (!existsSync(deployerPath)) {
    throw new Error("Missing .deployer.json — generate a wallet first");
  }
  const { privateKey, address } = JSON.parse(readFileSync(deployerPath, "utf8"));
  const account = privateKeyToAccount(privateKey);
  if (account.address.toLowerCase() !== String(address).toLowerCase()) {
    throw new Error("Deployer address does not match private key");
  }

  const publicClient = createPublicClient({
    chain: BOT_CHAIN,
    transport: http(NET.rpc),
  });
  const walletClient = createWalletClient({
    account,
    chain: BOT_CHAIN,
    transport: http(NET.rpc),
  });

  const balance = await publicClient.getBalance({ address: account.address });
  console.log("Deployer:", account.address);
  console.log("BOT balance (wei):", balance.toString());
  if (balance === 0n) {
    throw new Error("Deployer has 0 BOT. Fund it for gas, then re-run.");
  }

  const { abi, bytecode } = compile();
  const hash = await walletClient.deployContract({
    abi,
    bytecode,
    account,
  });
  console.log("Deploy tx:", hash);
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  const contractAddress = receipt.contractAddress;
  if (!contractAddress) throw new Error("No contract address in receipt");

  mkdirSync(outDir, { recursive: true });
  const payload = {
    chainId: NET.id,
    network: NET.name,
    gemetraCore: contractAddress,
    deployer: account.address,
    txHash: hash,
    deployedAt: new Date().toISOString(),
    explorer: `${NET.explorer}/address/${contractAddress}`,
    usdt: NET.usdt,
  };
  writeFileSync(outPath, JSON.stringify(payload, null, 2));
  console.log("GemetraCore:", contractAddress);
  console.log("Wrote", outPath);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
