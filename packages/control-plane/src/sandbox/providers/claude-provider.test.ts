import { describe, expect, it, vi, beforeEach } from "vitest";
import { ClaudeSandboxProvider, type ClaudeProviderConfig } from "./claude-provider";
import type { ClaudeRestClient } from "../claude-rest-client";

describe("ClaudeSandboxProvider", () => {
  const mockClient = {
    createEnvironment: vi.fn(),
    createAgent: vi.fn(),
    createSession: vi.fn(),
    sendEvents: vi.fn(),
    streamEvents: vi.fn(),
    config: { apiKey: "test" },
  } as unknown as ClaudeRestClient;

  const mockConfig: ClaudeProviderConfig = {
    scmProvider: "github",
  };

  const getCloneToken = vi.fn().mockResolvedValue("test-token");

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a sandbox correctly", async () => {
    const provider = new ClaudeSandboxProvider(mockClient, mockConfig, getCloneToken);

    vi.mocked(mockClient.createEnvironment).mockResolvedValueOnce({ id: "env-1" });
    vi.mocked(mockClient.createAgent).mockResolvedValueOnce({ id: "agent-1" });
    vi.mocked(mockClient.createSession).mockResolvedValueOnce({ id: "session-1" });

    const result = await provider.createSandbox({
      sessionId: "sess-1",
      sandboxId: "sb-1",
      repoOwner: "test-owner",
      repoName: "test-repo",
      controlPlaneUrl: "https://control.plane",
      sandboxAuthToken: "auth",
      provider: "anthropic",
      model: "anthropic/claude-3",
    });

    expect(result.providerObjectId).toBe("session-1");
    expect(result.sandboxId).toBe("sb-1");
    expect(result.status).toBe("ready");

    expect(mockClient.createEnvironment).toHaveBeenCalledWith({
      name: "env-sb-1",
      config: { type: "cloud" },
    });

    expect(mockClient.createAgent).toHaveBeenCalledWith({
      name: "agent-sb-1",
      model: "claude-3",
      tools: [
        {
          type: "agent_toolset_20260401",
          default_config: { enabled: true, permission_policy: { type: "always_allow" } },
        },
      ],
    });

    expect(mockClient.createSession).toHaveBeenCalledWith({
      agent: { type: "agent", id: "agent-1" },
      environment_id: "env-1",
      title: "sess-1",
      resources: [
        {
          type: "github_repository",
          url: "https://github.com/test-owner/test-repo",
          authorization_token: "test-token",
        },
      ],
    });
  });
});
