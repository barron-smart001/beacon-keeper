// Remembers which page sent the user to billing, so they can be returned
// there with full access once payment is confirmed. Survives the Paystack
// redirect because it lives in sessionStorage.
const RETURN_TO_KEY = "meridian:returnTo";
const DEFAULT_RETURN_TO = "/app";

export function rememberReturnTo(pathname) {
  if (!pathname?.startsWith("/app") || pathname.startsWith("/app/billing")) {
    return;
  }

  try {
    window.sessionStorage.setItem(RETURN_TO_KEY, pathname);
  } catch {
    // Storage can be unavailable (private mode); fall back to the default.
  }
}

export function takeReturnTo() {
  try {
    const pathname = window.sessionStorage.getItem(RETURN_TO_KEY);
    window.sessionStorage.removeItem(RETURN_TO_KEY);
    if (pathname?.startsWith("/app") && !pathname.startsWith("/app/billing")) {
      return pathname;
    }
  } catch {
    // Ignore storage failures.
  }

  return DEFAULT_RETURN_TO;
}
