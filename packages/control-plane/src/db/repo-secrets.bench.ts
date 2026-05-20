import { webcrypto } from "node:crypto";
import { RepoSecretsStore } from "./repo-secrets";
import { generateEncryptionKey } from "../auth/crypto";

if (!(globalThis as { crypto?: typeof webcrypto }).crypto) {
  Object.defineProperty(globalThis, "crypto", { value: webcrypto, configurable: true });
}

// A simple fake D1Database for benchmarking
class FakeD1DatabaseBench {
  prepare() {
    return {
      bind: () => ({
        all: async () => ({ results: [] }),
        run: async () => ({ meta: { changes: 1 } }),
      }),
    };
  }
  async batch() {
    return [];
  }
}

async function runBench() {
  const db = new FakeD1DatabaseBench() as unknown as D1Database;
  const encryptionKey = generateEncryptionKey();
  const store = new RepoSecretsStore(db, encryptionKey);

  const numSecrets = 45; // Max limit is 50
  const secrets: Record<string, string> = {};
  for (let i = 0; i < numSecrets; i++) {
    secrets[`SECRET_${i}`] = `value_${i}`;
  }

  // Warmup
  for (let i = 0; i < 5; i++) {
    await store.setSecrets(1, "Owner", "Repo", secrets);
  }

  const start = performance.now();
  const iterations = 50;
  for (let i = 0; i < iterations; i++) {
    await store.setSecrets(1, "Owner", "Repo", secrets);
  }
  const end = performance.now();
  console.log(
    `Time taken for ${iterations} iterations of ${numSecrets} secrets: ${(end - start).toFixed(2)}ms`
  );
  console.log(`Average time per setSecrets call: ${((end - start) / iterations).toFixed(2)}ms`);
}

runBench().catch(console.error);
