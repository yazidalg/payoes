package middleware

import (
	"context"
	"net/http"

	"github.com/payoesteam/payoes/apps/api/internal/auth"
	"github.com/payoesteam/payoes/apps/api/internal/httpx"
)

type contextKey string

const UserContextKey contextKey = "session_user"

func RequireSession(sessions *auth.SessionManager) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			user, err := sessions.UserFromRequest(r)
			if err != nil || user == nil {
				httpx.Error(w, http.StatusUnauthorized, "Unauthorized")
				return
			}
			ctx := context.WithValue(r.Context(), UserContextKey, user)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

func OptionalSession(sessions *auth.SessionManager) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			user, _ := sessions.UserFromRequest(r)
			if user != nil {
				ctx := context.WithValue(r.Context(), UserContextKey, user)
				r = r.WithContext(ctx)
			}
			next.ServeHTTP(w, r)
		})
	}
}

func UserFromContext(ctx context.Context) *auth.SessionUser {
	user, _ := ctx.Value(UserContextKey).(*auth.SessionUser)
	return user
}
