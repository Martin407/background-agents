import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { createClaudeRestClient, ClaudeApiError } from "./claude-rest-client";

describe("ClaudeRestClient", () => {
  const apiKey = "test-key";
  const client = createClaudeRestClient({ apiKey });

  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("throws error if no API key is provided", () => {
    expect(() => createClaudeRestClient({ apiKey: "" })).toThrow("ClaudeRestClient requires apiKey");
  });

  it("creates an environment", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: "env-123" }),
    } as any);

    const result = await client.createEnvironment({ name: "test-env", config: { type: "cloud" } });

    expect(result).toEqual({ id: "env-123" });
    expect(fetch).toHaveBeenCalledWith(
      "https://api.anthropic.com/v1/environments?beta=true",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "x-api-key": "test-key",
          "anthropic-beta": "managed-agents-2026-04-01",
        }),
        body: JSON.stringify({ name: "test-env", config: { type: "cloud" } }),
      })
    );
  });

  it("throws ClaudeApiError on failed request", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 401,
      text: async () => "Unauthorized",
    } as any);

    await expect(client.createEnvironment({ name: "test" })).rejects.toThrow(ClaudeApiError);
  });

  it("creates an agent", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: "agent-123" }),
    } as any);

    const result = await client.createAgent({ name: "test-agent", model: "claude-3" });

    expect(result).toEqual({ id: "agent-123" });
  });

  it("creates a session", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: "session-123" }),
    } as any);

    const result = await client.createSession({ agent: { type: "agent", id: "a" }, environment_id: "e" });

    expect(result).toEqual({ id: "session-123" });
  });
});
