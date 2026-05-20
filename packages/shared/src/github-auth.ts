/**
 * Configuration for GitHub App authentication.
 */
export interface GitHubAppConfig {
  appId: string;
  privateKey: string; // PEM format
  installationId: string;
  /** User-Agent header sent on outbound GitHub API requests. */
  userAgent?: string;
}

/**
 * Base64URL encode a Uint8Array or string.
 */
export function base64UrlEncode(input: Uint8Array | string): string {
  const bytes = typeof input === "string" ? new TextEncoder().encode(input) : input;

  const base64 = btoa(String.fromCharCode(...bytes));
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

/**
 * Parse PEM-encoded private key to raw bytes.
 */
export function parsePemPrivateKey(pem: string): Uint8Array {
  // Remove PEM header/footer and newlines
  const pemContents = pem
    .replace(/-----BEGIN RSA PRIVATE KEY-----/g, "")
    .replace(/-----END RSA PRIVATE KEY-----/g, "")
    .replace(/-----BEGIN PRIVATE KEY-----/g, "")
    .replace(/-----END PRIVATE KEY-----/g, "")
    .replace(/\s/g, "");

  // Decode base64
  const binaryString = atob(pemContents);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Import RSA private key for signing.
 */
export async function importPrivateKey(pem: string): Promise<CryptoKey> {
  const keyData = parsePemPrivateKey(pem);

  // Try PKCS#8 format first (BEGIN PRIVATE KEY)
  try {
    return await crypto.subtle.importKey(
      "pkcs8",
      keyData.buffer as ArrayBuffer,
      {
        name: "RSASSA-PKCS1-v1_5",
        hash: "SHA-256",
      },
      false,
      ["sign"]
    );
  } catch {
    // Fall back to trying as PKCS#1 (BEGIN RSA PRIVATE KEY)
    // Cloudflare Workers may not support PKCS#1 directly,
    // so we may need to convert or use a different approach
    throw new Error(
      "Unable to import private key. Ensure it is in PKCS#8 format. " +
        "Convert with: openssl pkcs8 -topk8 -inform PEM -outform PEM -nocrypt -in key.pem -out key-pkcs8.pem"
    );
  }
}

const importedPrivateKeyCache = new Map<string, Promise<CryptoKey>>();

/**
 * Import and cache RSA private key for signing.
 */
export async function importPrivateKeyCached(pem: string): Promise<CryptoKey> {
  const existing = importedPrivateKeyCache.get(pem);
  if (existing) {
    return existing;
  }

  const inFlight = importPrivateKey(pem).catch((error) => {
    importedPrivateKeyCache.delete(pem);
    throw error;
  });
  importedPrivateKeyCache.set(pem, inFlight);
  return inFlight;
}

/**
 * Generate a JWT for GitHub App authentication.
 *
 * @param appId - GitHub App ID
 * @param privateKey - PEM-encoded private key
 * @returns Signed JWT valid for 10 minutes
 */
export async function generateAppJwt(appId: string, privateKey: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);

  // JWT header
  const header = {
    alg: "RS256",
    typ: "JWT",
  };

  // JWT payload
  const payload = {
    iat: now - 60, // Issued 60 seconds ago (clock skew tolerance)
    exp: now + 600, // Expires in 10 minutes
    iss: appId,
  };

  // Encode header and payload
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signingInput = `${encodedHeader}.${encodedPayload}`;

  // Sign with RSA-SHA256
  const key = await importPrivateKeyCached(privateKey);
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(signingInput)
  );

  const encodedSignature = base64UrlEncode(new Uint8Array(signature));

  return `${signingInput}.${encodedSignature}`;
}
