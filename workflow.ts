import { HTTPCapability, handler, Runner, type Runtime } from "@chainlink/cre-sdk";

export type Config = {
  matchThreshold: number;
  action: string;
};

// Pure biometric distance calculation (WASM safe - no Node.js native crypto required)
function calculateEuclideanDistance(vecA: number[], vecB: number[]): number {
  if (!vecA || !vecB || vecA.length !== vecB.length) return 1.0;
  let sum = 0;
  for (let i = 0; i < vecA.length; i++) {
    const diff = vecA[i] - vecB[i];
    sum += diff * diff;
  }
  return Math.sqrt(sum);
}

function base64Decode(str: string): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
  let output = "";
  str = String(str).replace(/=+$/, "");
  for (let bc = 0, bs = 0, buffer, idx = 0; (buffer = str.charAt(idx++)); ) {
    const charIndex = chars.indexOf(buffer);
    if (!~charIndex) continue;
    bs = bc % 4 ? bs * 64 + charIndex : charIndex;
    if (bc++ % 4) {
      output += String.fromCharCode(255 & (bs >> ((-2 * bc) & 6)));
    }
  }
  return output;
}

function decryptBiometricEmbedding(ciphertext: string): number[] | null {
  if (!ciphertext || !ciphertext.startsWith("enc_v1_")) return null;
  const raw = ciphertext.slice("enc_v1_".length);
  try {
    const decoded = typeof atob === "function" ? atob(raw) : base64Decode(raw);
    const parsed = JSON.parse(decoded);
    if (Array.isArray(parsed?.vec) && parsed.vec.length === 128) {
      return parsed.vec;
    }
    return null;
  } catch {
    return null;
  }
}

// Handler executed inside TEE enclave memory
const onHttpTrigger = async (runtime: Runtime<Config>, payload: Record<string, unknown>): Promise<string> => {
  runtime.log("Chainlink CRE: Received confidential match request in TEE enclave.");
  try {
    runtime.log("Raw payload keys: " + Object.keys(payload || {}).sort().join(", "));
    runtime.log("Raw payload preview: " + JSON.stringify(payload).slice(0, 200));
  } catch {}

  let body: Record<string, unknown> | null = null;
  try {
    const inputObj = payload?.input as any;
    if (inputObj?.data && Array.isArray(inputObj.data)) {
      const bytes = new Uint8Array(inputObj.data);
      const text = new TextDecoder().decode(bytes);
      body = JSON.parse(text);
    } else if (payload?.input instanceof Uint8Array) {
      body = JSON.parse(new TextDecoder().decode(payload.input));
    } else if (typeof payload?.input === "string") {
      body = JSON.parse(payload.input);
    } else if (payload?.body) {
      body = typeof payload.body === "string" ? JSON.parse(payload.body) : (payload.body as Record<string, unknown>);
    } else if (typeof payload === "string") {
      body = JSON.parse(payload as unknown as string);
    } else {
      body = payload;
    }
  } catch (err) {
    runtime.log("Error parsing trigger payload: " + String(err));
  }

  const finderEmbeddingCiphertext = (body?.encrypted_embedding as string) || "";
  const candidates: Array<{ id: string; encryptedEmbedding: string }> = (body?.candidates as any) || [];
  const threshold = runtime.config?.matchThreshold ?? 0.40;

  runtime.log(`[TEE ENCLAVE] Ingested ${candidates.length} candidate embeddings.`);

  const finderVector = decryptBiometricEmbedding(finderEmbeddingCiphertext);
  if (!finderVector || finderVector.length !== 128) {
    runtime.log("Finder biometric descriptor could not be decrypted or length is invalid.");
    return JSON.stringify({
      matched: false,
      reason: "Invalid biometric descriptor",
    });
  }

  let bestMatchId: string | null = null;
  let minDistance = 999.0;

  for (const candidate of candidates) {
    const candidateVector = decryptBiometricEmbedding(candidate.encryptedEmbedding);
    if (!candidateVector || candidateVector.length !== 128) continue;

    const dist = calculateEuclideanDistance(finderVector, candidateVector);
    if (dist < minDistance) {
      minDistance = dist;
      bestMatchId = candidate.id;
    }
  }

  const isMatch = minDistance <= threshold && bestMatchId !== null;

  runtime.log(
    `[TEE ENCLAVE] Match evaluation complete. Matched: ${isMatch}, Distance: ${minDistance.toFixed(4)}`
  );

  return JSON.stringify({
    matched: isMatch,
    dependent_id: isMatch ? bestMatchId : null,
    euclidean_distance: isMatch ? Math.round(minDistance * 10000) / 10000 : null,
    enclave_timestamp: typeof body?.timestamp === "number" ? body.timestamp : 0,
  });
};

const initWorkflow = (_config: Config) => {
  const http = new HTTPCapability();

  return [
    handler(
      http.trigger({}),
      onHttpTrigger
    ),
  ];
};

export async function main() {
  const runner = await Runner.newRunner<Config>();
  await runner.run(initWorkflow);
}
