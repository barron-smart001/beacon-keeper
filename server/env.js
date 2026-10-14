/**
 * Reads an environment variable and removes the whitespace, line breaks and
 * surrounding quote marks that often come along when a key is pasted into a
 * hosting dashboard. A key with any of these is rejected as "Invalid API key".
 */
export function env(name) {
  const raw = process.env[name];
  if (typeof raw !== "string") return undefined;

  const cleaned = raw.trim().replace(/^(["'])(.*)\1$/s, "$2").trim();
  return cleaned || undefined;
}
