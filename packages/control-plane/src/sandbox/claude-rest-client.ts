import { createLogger } from "../logger";

const log = createLogger("claude-rest-client");

export interface ClaudeRestConfig {
  apiKey: string;
}

export interface ClaudeCreateEnvironmentParams {
  name: string;
  config?: any;
}

export interface ClaudeCreateAgentParams {
  name: string;
  model: string;
  tools?: any[];
  system?: string;
  description?: string;
}

export interface ClaudeCreateSessionParams {
  agent: {
    type: "agent";
    id: string;
  };
  environment_id: string;
  resources?: any[];
  title?: string;
}

export class ClaudeApiError extends Error {
  constructor(
    message: string,
    public readonly status: number
  ) {
    super(message);
    this.name = "ClaudeApiError";
  }
}

export class ClaudeRestClient {
  private readonly baseUrl = "https://api.anthropic.com/v1";

  constructor(public readonly config: ClaudeRestConfig) {
    if (!config.apiKey) {
      throw new Error("ClaudeRestClient requires apiKey");
    }
  }

  private getHeaders(): Record<string, string> {
    return {
      "Content-Type": "application/json",
      "x-api-key": this.config.apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-beta": "managed-agents-2026-04-01",
    };
  }

  private async request<T>(
    method: "GET" | "POST",
    path: string,
    body?: unknown
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const init: RequestInit = {
      method,
      headers: this.getHeaders(),
    };
    if (body !== undefined) {
      init.body = JSON.stringify(body);
    }

    const response = await fetch(url, init);

    if (!response.ok) {
      const text = await response.text();
      throw new ClaudeApiError(text || response.statusText, response.status);
    }

    return (await response.json()) as T;
  }

  async createEnvironment(params: ClaudeCreateEnvironmentParams): Promise<{ id: string }> {
    return this.request<{ id: string }>("POST", "/environments?beta=true", params);
  }

  async createAgent(params: ClaudeCreateAgentParams): Promise<{ id: string }> {
    return this.request<{ id: string }>("POST", "/agents?beta=true", params);
  }

  async createSession(params: ClaudeCreateSessionParams): Promise<{ id: string }> {
    return this.request<{ id: string }>("POST", "/sessions?beta=true", params);
  }

  async sendEvents(sessionId: string, events: any[]): Promise<any> {
    return this.request<any>("POST", `/sessions/${sessionId}/events?beta=true`, { events });
  }

  async streamEvents(sessionId: string): Promise<Response> {
    const url = `${this.baseUrl}/sessions/${sessionId}/events/stream?beta=true`;
    const response = await fetch(url, {
      method: "GET",
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new ClaudeApiError(text || response.statusText, response.status);
    }

    return response;
  }
}

export function createClaudeRestClient(config: ClaudeRestConfig): ClaudeRestClient {
  return new ClaudeRestClient(config);
}
