package auth

import "strings"

var allowedPostAuthPrefixes = []string{
	"/invite/",
	"/onboarding",
	"/dashboard",
	"/business/",
	"/organizations/",
}

// GetSafePostAuthRedirect ports lib/auth/safe-redirect.ts
func GetSafePostAuthRedirect(callbackURL string) string {
	if callbackURL == "" || !strings.HasPrefix(callbackURL, "/") || strings.HasPrefix(callbackURL, "//") {
		return ""
	}
	for _, prefix := range allowedPostAuthPrefixes {
		if callbackURL == prefix || strings.HasPrefix(callbackURL, prefix) {
			return callbackURL
		}
	}
	return ""
}
