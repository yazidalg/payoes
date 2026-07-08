export const EMAIL_VERIFICATION_TOKEN_TTL_HOURS = 24;

export const EMAIL_VERIFICATION_RESEND_COOLDOWN_SECONDS = 60;

export const AUTH_ERROR_CODES = {
  INVALID_CREDENTIALS: "INVALID_CREDENTIALS",
  GOOGLE_ACCOUNT: "GOOGLE_ACCOUNT",
  CREDENTIALS_ACCOUNT: "CREDENTIALS_ACCOUNT",
  EMAIL_NOT_VERIFIED: "EMAIL_NOT_VERIFIED",
  EMAIL_EXISTS: "EMAIL_EXISTS",
  INVALID_TOKEN: "INVALID_TOKEN",
  TOKEN_EXPIRED: "TOKEN_EXPIRED",
  RESEND_COOLDOWN: "RESEND_COOLDOWN",
} as const;

export type AuthErrorCode =
  (typeof AUTH_ERROR_CODES)[keyof typeof AUTH_ERROR_CODES];

export const AUTH_ERROR_MESSAGES: Record<AuthErrorCode, string> = {
  INVALID_CREDENTIALS: "Invalid email or password.",
  GOOGLE_ACCOUNT:
    "This email is linked to Google sign-in. Continue with Google instead.",
  CREDENTIALS_ACCOUNT:
    "This email is registered with a password. Sign in with your email and password instead.",
  EMAIL_NOT_VERIFIED:
    "Verify your email before signing in. Check your inbox for the verification link.",
  EMAIL_EXISTS: "An account with this email already exists.",
  INVALID_TOKEN: "This verification link is invalid. Request a new one.",
  TOKEN_EXPIRED: "This verification link has expired. Request a new one.",
  RESEND_COOLDOWN: "Please wait a moment before requesting another email.",
};
