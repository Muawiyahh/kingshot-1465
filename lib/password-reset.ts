/** Where a player whose password was reset chooses a new one (locale-less). */
export const NEW_PASSWORD_PATH = "/new-password";

/**
 * Set in an account's app_metadata (which only the server's service role can write) when an admin
 * resets its password, and cleared once the player chooses a new one. It reaches the session token
 * the next time the player signs in or their token refreshes.
 */
export const RESET_FLAG = "must_change_password";

/** True when the session token says the player must choose a new password first. */
export function mustChangePassword(claims: { app_metadata?: unknown } | null | undefined) {
  const meta = claims?.app_metadata;
  return Boolean(meta && typeof meta === "object" && (meta as Record<string, unknown>)[RESET_FLAG] === true);
}
