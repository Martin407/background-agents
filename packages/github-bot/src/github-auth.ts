import { DEFAULT_APP_NAME, generateAppJwt, type GitHubAppConfig } from "@open-inspect/shared";

export type { GitHubAppConfig };

async function getInstallationToken(
  jwt: string,
  installationId: string,
  userAgent: string
): Promise<string> {
  const url = `https://api.github.com/app/installations/${installationId}/access_tokens`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${jwt}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": userAgent,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get installation token: ${response.status} ${error}`);
  }

  const data = (await response.json()) as { token: string };
  return data.token;
}

export async function generateInstallationToken(config: GitHubAppConfig): Promise<string> {
  const jwt = await generateAppJwt(config.appId, config.privateKey);
  return getInstallationToken(jwt, config.installationId, config.userAgent || DEFAULT_APP_NAME);
}

const WRITE_PERMISSIONS = new Set(["write", "maintain", "admin"]);

export interface PermissionCheckResult {
  hasPermission: boolean;
  error?: boolean;
}

export async function checkSenderPermission(
  token: string,
  owner: string,
  repo: string,
  username: string,
  userAgent: string = DEFAULT_APP_NAME
): Promise<PermissionCheckResult> {
  try {
    const response = await fetch(
      `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/collaborators/${encodeURIComponent(username)}/permission`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
          "User-Agent": userAgent,
        },
      }
    );
    if (!response.ok) return { hasPermission: false, error: true };
    const data = (await response.json()) as { permission: string };
    return { hasPermission: WRITE_PERMISSIONS.has(data.permission) };
  } catch {
    return { hasPermission: false, error: true };
  }
}

export async function postReaction(
  token: string,
  url: string,
  content: string,
  userAgent: string = DEFAULT_APP_NAME
): Promise<boolean> {
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": userAgent,
      },
      body: JSON.stringify({ content }),
    });
    return response.ok;
  } catch {
    return false;
  }
}
