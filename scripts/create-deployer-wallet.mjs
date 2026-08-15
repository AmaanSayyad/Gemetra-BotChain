import { writeFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const out = resolve(__dirname, "../.deployer.json");

if (existsSync(out)) {
  console.log("Deployer already exists at .deployer.json (not overwritten).");
  process.exit(0);
}

const privateKey = generatePrivateKey();
const account = privateKeyToAccount(privateKey);
writeFileSync(
  out,
  JSON.stringify(
    {
      address: account.address,
      privateKey,
      chainId: 677,
      rpc: "https://rpc.botchain.ai",
      createdAt: new Date().toISOString(),
    },
    null,
    2
  )
);
console.log("Created BOT Chain deployer wallet");
console.log("Address:", account.address);
console.log("Saved to .deployer.json (gitignored)");
console.log("Fund this address with BOT (gas) on mainnet: https://dex.botchain.ai");
