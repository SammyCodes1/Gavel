// Copies the Gavel ABI from the Foundry build output (contracts/out) into
// web/src/config/gavelAbi.ts. Run `forge build` in contracts/ first, then `npm run export-abi`.
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const artifact = resolve(here, "../../contracts/out/Gavel.sol/Gavel.json");
const target = resolve(here, "../src/config/gavelAbi.ts");

const { abi } = JSON.parse(readFileSync(artifact, "utf8"));
const source =
  "// Generated from contracts/out/Gavel.sol/Gavel.json by scripts/export-abi.mjs. Do not edit by hand.\n" +
  `export const gavelAbi = ${JSON.stringify(abi, null, 2)} as const;\n`;

writeFileSync(target, source);
console.log(`Wrote ${abi.length} ABI entries to ${target}`);
