export const COOKIE_NAME = "achadinhos_admin_token";

const DEFAULT_SECRET = "shopee_affiliate_admin_secret_key_2026_super_safe";

function getSecret(): string {
  return process.env.ADMIN_SESSION_SECRET || DEFAULT_SECRET;
}

/** Computes a simple SHA-256 signature using Web Crypto API (Edge and Node compatible) */
async function computeHash(data: string, secret: string): Promise<string> {
  const enc = new TextEncoder();
  const keyData = enc.encode(secret);
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", cryptoKey, enc.encode(data));
  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Generates a signed session token valid for 7 days */
export async function createSessionToken(): Promise<string> {
  const secret = getSecret();
  const timestamp = Date.now();
  const payload = `admin_${timestamp}`;
  const sig = await computeHash(payload, secret);
  return `${payload}.${sig}`;
}

/** Verifies that a session token is valid and not expired (7 days) */
export async function verifySessionToken(token: string | null | undefined): Promise<boolean> {
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 2) return false;

  const [payload, sig] = parts;
  const secret = getSecret();
  const expectedSig = await computeHash(payload, secret);

  if (sig !== expectedSig) return false;

  const timeStr = payload.replace("admin_", "");
  const time = parseInt(timeStr, 10);
  if (isNaN(time)) return false;

  // 7 dias de validade
  const maxAgeMs = 7 * 24 * 60 * 60 * 1000;
  if (Date.now() - time > maxAgeMs) return false;

  return true;
}

/** Validates the admin password */
export function verifyAdminPassword(password: string): boolean {
  const adminPass = process.env.ADMIN_PASSWORD || "admin";
  return password === adminPass;
}
