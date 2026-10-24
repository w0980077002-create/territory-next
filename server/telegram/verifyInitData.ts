/**
 * Private server-side Telegram Mini App initData verifier (TERRITORY 2.0).
 * RFC-equivalent to https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 *
 * Do not import into Vite/UI: bot token is a server-only secret, and userId
 * from initDataUnsafe is never a trusted identity.
 */
export type VerifiedV2TelegramProfile = Readonly<{
  telegramUserId: number;
  displayName: string;
  photoUrl: string | null;
  authDate: number;
}>;

const encoder = new TextEncoder();
const MAX_INITDATA_CHARS = 8192;
const ALLOWED_CLOCK_SKEW_SECONDS = 60;
export const V2_MAX_TELEGRAM_INITDATA_AGE = 3600;

async function hmacSha256(secret: Uint8Array, content: Uint8Array): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    'raw', secret as BufferSource,
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  );
  const signed = await crypto.subtle.sign('HMAC', key, content as BufferSource);
  return new Uint8Array(signed);
}

function readHex(hex: string): Uint8Array | null {
  if (!/^[0-9a-f]{64}$/i.test(hex)) return null;
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
}

function constantTimeBytesEqual(expected: Uint8Array, provided: Uint8Array): boolean {
  if (expected.length !== provided.length) return false;
  let difference = 0;
  for (let i = 0; i < expected.length; i++) difference |= expected[i] ^ provided[i];
  return difference === 0;
}

export async function verifyV2TelegramInitData(
  rawInitData: string,
  botToken: string,
  nowSeconds = Math.floor(Date.now() / 1000),
  maxAgeSeconds = V2_MAX_TELEGRAM_INITDATA_AGE,
): Promise<VerifiedV2TelegramProfile> {
  if (typeof rawInitData !== 'string' || rawInitData.length === 0 ||
      rawInitData.length > MAX_INITDATA_CHARS ||
      typeof botToken !== 'string' || botToken.length === 0 ||
      !Number.isSafeInteger(nowSeconds) || nowSeconds < 0 ||
      !Number.isSafeInteger(maxAgeSeconds) || maxAgeSeconds < 60) {
    throw new Error('TELEGRAM_INITDATA_INVALID');
  }

  const params = new URLSearchParams(rawInitData);
  const fields: [string, string][] = [];
  const found = new Set<string>();
  for (const [key, value] of params.entries()) {
    // Duplicate signed parameter names create ambiguous verification;
    // reject the whole input rather than selecting the first/last value.
    if (!key || found.has(key) || key.includes('\n') || key.includes('=') || value.includes('\n')) {
      throw new Error('TELEGRAM_INITDATA_INVALID');
    }
    found.add(key);
    if (key !== 'hash') fields.push([key, value]);
  }

  const providedHash = readHex(params.get('hash') ?? '');
  if (!providedHash) throw new Error('TELEGRAM_INITDATA_INVALID');
  const dateRaw = params.get('auth_date');
  if (!dateRaw || !/^[0-9]{1,12}$/.test(dateRaw)) throw new Error('TELEGRAM_INITDATA_INVALID');
  const authDate = Number(dateRaw);
  if (!Number.isSafeInteger(authDate) || authDate > nowSeconds + ALLOWED_CLOCK_SKEW_SECONDS ||
      nowSeconds - authDate > maxAgeSeconds) {
    throw new Error('TELEGRAM_INITDATA_EXPIRED');
  }

  const checkString = fields.sort(([a],[b])=>a.localeCompare(b,'en')).map(([key,value])=>key+'='+value).join('\n');
  const secret = await hmacSha256(encoder.encode('WebAppData'), encoder.encode(botToken));
  const expectedHash = await hmacSha256(secret, encoder.encode(checkString));
  if (!constantTimeBytesEqual(expectedHash, providedHash)) {
    throw new Error('TELEGRAM_INITDATA_SIGNATURE_INVALID');
  }

  let user: unknown;
  try { user = JSON.parse(params.get('user') ?? ''); }
  catch { throw new Error('TELEGRAM_INITDATA_PROFILE_INVALID'); }
  if (!user || typeof user !== 'object' || Array.isArray(user)) {
    throw new Error('TELEGRAM_INITDATA_PROFILE_INVALID');
  }
  const profile = user as Record<string, unknown>;
  const id = profile.id;
  if (typeof id !== 'number' || !Number.isSafeInteger(id) || id <= 0) {
    throw new Error('TELEGRAM_INITDATA_PROFILE_INVALID');
  }
  const parts = [profile.first_name,profile.last_name].filter(
    (value): value is string => typeof value === 'string' && value.trim().length > 0
  );
  const fromName = parts.join(' ').trim();
  const fallback = typeof profile.username === 'string' ? profile.username.trim() : '';
  const displayName = (fromName || fallback).slice(0,64);
  if (!displayName || /[\x00-\x1f]/.test(displayName)) {
    throw new Error('TELEGRAM_INITDATA_PROFILE_INVALID');
  }
  const photo = typeof profile.photo_url === 'string' ? profile.photo_url : null;
  const photoUrl = photo && photo.length <= 2048 && photo.startsWith('https://') ? photo : null;

  return { telegramUserId:id, displayName, photoUrl, authDate };
}
