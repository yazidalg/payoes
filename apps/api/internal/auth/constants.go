package auth

const (
	EmailVerificationTokenTTLHours         = 24
	EmailVerificationResendCooldownSeconds = 60

	CookieName = "payoes_session"
)

const (
	CodeInvalidCredentials = "INVALID_CREDENTIALS"
	CodeGoogleAccount      = "GOOGLE_ACCOUNT"
	CodeCredentialsAccount = "CREDENTIALS_ACCOUNT"
	CodeEmailNotVerified   = "EMAIL_NOT_VERIFIED"
	CodeEmailExists        = "EMAIL_EXISTS"
	CodeInvalidToken       = "INVALID_TOKEN"
	CodeTokenExpired       = "TOKEN_EXPIRED"
	CodeResendCooldown     = "RESEND_COOLDOWN"
)

var ErrorMessages = map[string]string{
	CodeInvalidCredentials: "Invalid email or password.",
	CodeGoogleAccount:      "This email is linked to Google sign-in. Continue with Google instead.",
	CodeCredentialsAccount: "This email is registered with a password. Sign in with your email and password instead.",
	CodeEmailNotVerified:   "Verify your email before signing in. Check your inbox for the verification link.",
	CodeEmailExists:        "An account with this email already exists.",
	CodeInvalidToken:       "This verification link is invalid. Request a new one.",
	CodeTokenExpired:       "This verification link has expired. Request a new one.",
	CodeResendCooldown:     "Please wait a moment before requesting another email.",
}
