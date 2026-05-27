import { describe, it } from "vitest";
import { RepoSecretsStore } from "./db/repo-secrets";
import { generateEncryptionKey } from "./auth/crypto";
import { webcrypto } from "node:crypto";

if (!(globalThis as any).crypto) {
  (globalThis as any).crypto = webcrypto;
}

class BenchmarkFakeD1Database {
  prepare() {
    return this;
  }
  bind() {
    return this;
  }
  all() {
    return { results: [] };
  }
  run() {
    return { meta: { changes: 1 } };
  }
  async batch() {
    return [];
  }
}

describe("Performance Benchmark", () => {
  it("benchmarks setSecrets", async () => {
    const db = new BenchmarkFakeD1Database();
    const store = new RepoSecretsStore(db as any, generateEncryptionKey());

    const secrets: Record<string, string> = {};
    for (let i = 0; i < 50; i++) {
      secrets[`KEY_${i}`] = `value_${i}_${"a".repeat(100)}`;
    }

    // Warmup
    await store.setSecrets(1, "Owner", "Repo", secrets);

    const start = performance.now();
    for (let i = 0; i < 100; i++) {
      await store.setSecrets(1, "Owner", "Repo", secrets);
    }
    const end = performance.now();
    console.log(`Baseline benchmark time: ${end - start} ms`);
  });
});
