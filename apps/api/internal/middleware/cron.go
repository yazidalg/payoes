package middleware

import (
	"net/http"
	"strings"

	"github.com/payoesteam/payoes/apps/api/internal/httpx"
)

// RequireCronSecret mirrors apps/web cron auth (Bearer or x-cron-secret).
func RequireCronSecret(secret string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if secret == "" {
				httpx.Error(w, http.StatusServiceUnavailable, "CRON_SECRET is not configured")
				return
			}

			provided := r.Header.Get("x-cron-secret")
			if provided == "" {
				authHeader := r.Header.Get("Authorization")
				if strings.HasPrefix(authHeader, "Bearer ") {
					provided = strings.TrimSpace(strings.TrimPrefix(authHeader, "Bearer "))
				}
			}

			if provided == "" || provided != secret {
				httpx.Error(w, http.StatusUnauthorized, "Unauthorized")
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}
