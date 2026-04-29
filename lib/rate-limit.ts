type LoginAttemptState = {
  attempts: number;
  firstAttemptAt: number;
  blockedUntil: number;
};

declare global {
  // eslint-disable-next-line no-var
  var __loginAttempts: Map<string, LoginAttemptState> | undefined;
}

const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_BLOCK_MS = 15 * 60 * 1000;
const MAX_LOGIN_ATTEMPTS = 5;

function getStore() {
  globalThis.__loginAttempts ??= new Map<string, LoginAttemptState>();
  return globalThis.__loginAttempts;
}

function cleanupExpired(now: number) {
  for (const [key, state] of getStore()) {
    const windowExpired = now - state.firstAttemptAt > LOGIN_WINDOW_MS;
    const blockExpired = state.blockedUntil <= now;
    if (windowExpired && blockExpired) {
      getStore().delete(key);
    }
  }
}

export function buildLoginRateLimitKey(input: {
  ip: string;
  tenantSlug: string;
  email: string;
}) {
  return [
    input.ip.trim().toLowerCase() || "unknown",
    input.tenantSlug.trim().toLowerCase(),
    input.email.trim().toLowerCase()
  ].join(":");
}

export function checkLoginRateLimit(key: string) {
  const now = Date.now();
  cleanupExpired(now);

  const state = getStore().get(key);
  return {
    blocked: Boolean(state && state.blockedUntil > now),
    retryAfterSeconds: state && state.blockedUntil > now
      ? Math.ceil((state.blockedUntil - now) / 1000)
      : 0
  };
}

export function recordFailedLogin(key: string) {
  const now = Date.now();
  cleanupExpired(now);

  const current = getStore().get(key);
  const windowExpired = !current || now - current.firstAttemptAt > LOGIN_WINDOW_MS;
  const nextAttempts = windowExpired ? 1 : current.attempts + 1;

  getStore().set(key, {
    attempts: nextAttempts,
    firstAttemptAt: windowExpired ? now : current.firstAttemptAt,
    blockedUntil: nextAttempts >= MAX_LOGIN_ATTEMPTS ? now + LOGIN_BLOCK_MS : 0
  });
}

export function clearLoginRateLimit(key: string) {
  getStore().delete(key);
}
