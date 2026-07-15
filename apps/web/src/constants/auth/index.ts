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

/** User-facing copy for Auth.js `?error=` query values on `/auth/error`. */
export const AUTH_JS_ERROR_MESSAGES: Record<string, string> = {
  Configuration:
    "Sign-in is not configured correctly. Please try again later or contact support.",
  AccessDenied: "You do not have permission to sign in with this account.",
  Verification:
    "This sign-in link is no longer valid. Request a new link and try again.",
  Callback:
    "We encountered an issue processing your request. Please try again or contact support if the problem persists.",
  OAuthSignin:
    "There was an issue signing you in. Please ensure your provider settings are correct.",
  OAuthCallback:
    "We faced a problem while processing the response from the OAuth provider. Please try again.",
  OAuthAccountNotLinked:
    "It looks like you already have an account with this email. Please sign in with your account email instead.",
  CredentialsSignin: "Invalid email or password.",
  Default: "Something went wrong during sign-in. Please try again.",
};

export const AUTH_CONFIGURATION_ADMIN_HINT =
  "If you manage this app, verify AUTH_SECRET and OAuth provider environment variables.";
