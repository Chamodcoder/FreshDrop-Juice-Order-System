export function formatPrice(value: number | string | null | undefined) {
  const n = Number(value ?? 0);
  return `Rs. ${n.toLocaleString("en-LK", { maximumFractionDigits: 0 })}`;
}

export function formatDate(value: string | null | undefined) {
  if (!value) return "";
  return new Date(value).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Turns any backend/network failure into something safe to show a user. */
export function friendlyError(error: unknown, fallback = "Something went wrong. Please try again.") {
  if (!error) return fallback;
  const message = typeof error === "string" ? error : ((error as { message?: string }).message ?? "");
  
  // Exact string matches
  const safe: Record<string, string> = {
    "Invalid login credentials": "Email or password is incorrect.",
    "User already registered": "An account with this email already exists.",
    "Email not confirmed": "Please confirm your email before signing in.",
    "Email rate limit exceeded": "Too many requests. Please try again in an hour.",
  };
  if (safe[message]) return safe[message];

  // Regex pattern matches
  if (/rate limit|too many requests|over_email_send_rate_limit/i.test(message)) {
    return "Too many authentication requests. Please wait a moment and try again.";
  }
  if (/email_address_invalid|email.*invalid/i.test(message)) {
    return "This email address or domain is invalid or not allowed. Please check the spelling or use a different email.";
  }
  if (/signup_disabled|signups.*not allowed/i.test(message)) {
    return "New user signups are currently disabled. Please contact the administrator.";
  }
  if (/otp.*expired|code.*expired/i.test(message)) {
    return "The verification code has expired. Please request a new one.";
  }
  if (/foreign key constraint|violates.*foreign key/i.test(message)) {
    return "Some items in your cart are from a previous session or no longer exist. Please empty your cart and add them again.";
  }
  if (/failed to fetch|network/i.test(message)) {
    return "Network problem. Check your connection and try again.";
  }
  if (/password/i.test(message) && /least/i.test(message)) {
    return "Password must be at least 6 characters.";
  }

  // Log the unmapped error so it is visible in the browser console for debugging
  console.warn("[friendlyError] Unmapped auth error:", error);
  return fallback;
}
