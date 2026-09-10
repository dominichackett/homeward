import { execSync, spawnSync } from "child_process";
import fs from "fs";
import path from "path";
import os from "os";

console.log("🚀 [CRE Build] Compiling workflow.ts -> workflow.wasm");

// 1. Bundle TypeScript to minified JavaScript
console.log("📦 Step 1: Bundling workflow.ts with bun...");
try {
  execSync("bun build workflow.ts --bundle --minify --outfile=workflow.js", {
    stdio: "inherit",
  });
} catch (e) {
  console.error("❌ Failed to bundle workflow.ts with bun:", e);
  process.exit(1);
}

const jsStats = fs.statSync("workflow.js");
console.log(`✅ Bundled workflow.js (${(jsStats.size / 1024).toFixed(1)} KB)`);

// 2. Locate Javy and Plugin files
const javyBinary = path.join(
  os.homedir(),
  ".cache",
  "javy",
  "v8.1.0",
  "win32-x64",
  "javy.exe"
);

const witPath = path.resolve("node_modules/@chainlink/cre-sdk-javy-plugin/dist/workflow.wit");
const pluginPath = path.resolve("node_modules/@chainlink/cre-sdk-javy-plugin/dist/javy-chainlink-sdk.plugin.wasm");

if (!fs.existsSync(javyBinary)) {
  console.error(`❌ Javy executable not found at: ${javyBinary}`);
  process.exit(1);
}

// 3. Compile JavaScript to WebAssembly
console.log("🔨 Step 2: Compiling workflow.js to workflow.wasm via Javy...");
const javyArgs = [
  "build",
  "-C",
  `wit=${witPath}`,
  "-C",
  "wit-world=workflow",
  "-C",
  `plugin=${pluginPath}`,
  "-C",
  "deterministic=y",
  "workflow.js",
  "-o",
  "workflow.wasm",
];

const res = spawnSync(javyBinary, javyArgs, { stdio: "inherit" });
if (res.status !== 0) {
  console.error(`❌ Javy compilation failed with code ${res.status}`);
  process.exit(res.status || 1);
}

const wasmStats = fs.statSync("workflow.wasm");
console.log(`🎯 Successfully compiled: workflow.wasm (${(wasmStats.size / 1024 / 1024).toFixed(2)} MB)`);
