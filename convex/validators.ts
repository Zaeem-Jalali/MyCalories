// Auth input rules, shared by the sign-in screen (for inline feedback) and
// the Password provider in auth.ts (the real guard). Keeping one copy means
// the client hint and the server check can never drift apart.
//
// This file is imported by BOTH the Convex backend and the React Native
// bundle, so it must stay pure: no secrets, no imports from ./_generated or
// anything server-only.

// A pragmatic format check, not deliverability: it rejects the obvious
// mistakes (no @, no domain dot, whitespace) without pretending the mailbox
// exists. Real verification would need an email provider wired into Convex.
export function emailProblem(email: string): string | null {
  const trimmed = email.trim();
  if (trimmed.length === 0) return "Enter your email address.";
  // Length is checked before the regex: the pattern backtracks super-linearly
  // on a long ambiguous string, and this runs on an unauthenticated endpoint.
  // 254 is the RFC 5321 maximum for an email address.
  if (trimmed.length > 254) return "Enter a valid email address.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    return "Enter a valid email address.";
  }
  return null;
}

export const PASSWORD_MAX_LENGTH = 128;

export const PASSWORD_RULES = [
  { label: "At least 8 characters", test: (p: string) => p.length >= 8 },
  { label: "One number", test: (p: string) => /[0-9]/.test(p) },
  {
    // A non-space symbol: a run of spaces should not satisfy this.
    label: "One special character",
    test: (p: string) => /[^A-Za-z0-9\s]/.test(p),
  },
] as const;

export function passwordProblem(password: string): string | null {
  if (password.length > PASSWORD_MAX_LENGTH) {
    return `Use a password of ${PASSWORD_MAX_LENGTH} characters or fewer.`;
  }
  const failed = PASSWORD_RULES.find((rule) => !rule.test(password));
  if (!failed) return null;
  if (password.length < 8) return "Use a password with at least 8 characters.";
  if (!/[0-9]/.test(password)) return "Add at least one number to your password.";
  return "Add at least one special character, like ! or #.";
}
