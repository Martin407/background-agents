import { createLogger } from "../../logger";
import { SandboxProviderError, type CreateSandboxConfig, type CreateSandboxResult, type SandboxProvider, type SandboxProviderCapabilities } from "../provider";
import type { ClaudeRestClient } from "../claude-rest-client";

const log = createLogger("claude-provider");

export interface ClaudeProviderConfig {
  scmProvider: string;
}

export class ClaudeSandboxProvider implements SandboxProvider {
  readonly name = "claude";

  readonly capabilities: SandboxProviderCapabilities = {
    supportsSnapshots: false,
    supportsRestore: false,
    supportsWarm: false,
    supportsPersistentResume: false,
    supportsExplicitStop: false,
  };

  constructor(
    private readonly client: ClaudeRestClient,
    private readonly config: ClaudeProviderConfig,
    private readonly getCloneToken: () => Promise<string | null>
  ) {}

  async createSandbox(config: CreateSandboxConfig): Promise<CreateSandboxResult> {
    try {
      log.info("Creating Claude environment", { sandboxId: config.sandboxId });
      const envResponse = await this.client.createEnvironment({
        name: `env-${config.sandboxId}`,
        config: { type: "cloud" },
      });
      const envId = envResponse.id;

      log.info("Creating Claude agent", { sandboxId: config.sandboxId, model: config.model });
      // remove prefix if it has one e.g. anthropic/claude-3-5-sonnet-20241022
      const model = config.model.replace(/^anthropic\//, "");

      const agentResponse = await this.client.createAgent({
        name: `agent-${config.sandboxId}`,
        model,
        tools: [
          {
            type: "agent_toolset_20260401",
            default_config: {
              enabled: true,
              permission_policy: { type: "always_allow" },
            },
          },
        ],
      });
      const agentId = agentResponse.id;

      log.info("Creating Claude session", { sandboxId: config.sandboxId });

      const cloneToken = await this.getCloneToken();
      const resources = [];
      if (cloneToken) {
        resources.push({
          type: "github_repository",
          url: `https://github.com/${config.repoOwner}/${config.repoName}`,
          authorization_token: cloneToken,
        });
      }

      const sessionResponse = await this.client.createSession({
        agent: {
          type: "agent",
          id: agentId,
        },
        environment_id: envId,
        resources,
        title: config.sessionId,
      });

      return {
        sandboxId: config.sandboxId,
        providerObjectId: sessionResponse.id,
        status: "ready", // Claude sessions are ready immediately
        createdAt: Date.now(),
      };
    } catch (error) {
      log.error("Failed to create Claude sandbox", { error });
      throw new SandboxProviderError(
        `Failed to create Claude sandbox: ${error instanceof Error ? error.message : String(error)}`,
        "permanent",
        error instanceof Error ? error : undefined
      );
    }
  }
}

export function createClaudeProvider(
  client: ClaudeRestClient,
  config: ClaudeProviderConfig,
  getCloneToken: () => Promise<string | null>
): ClaudeSandboxProvider {
  return new ClaudeSandboxProvider(client, config, getCloneToken);
}
