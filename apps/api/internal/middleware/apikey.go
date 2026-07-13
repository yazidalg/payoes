package middleware

import (
	"context"
	"net/http"
	"strings"
	"time"

	"github.com/payoesteam/payoes/apps/api/internal/httpx"
	apikeyssvc "github.com/payoesteam/payoes/apps/api/internal/service/apikeys"
)

const APIKeyContextKey contextKey = "api_key"

// APIKeyAuthOptions mirrors ApiKeyAuthOptions in apps/web/src/lib/api-keys/auth.ts
type APIKeyAuthOptions struct {
	Resource string // payments | customers | invoices | payment_links | checkout_sessions
	Action   string // read | write
}

// RequireAPIKey authenticates Bearer API keys and logs the request to api_logs.
// ported from: apps/web/src/lib/api-keys/auth.ts
func RequireAPIKey(svc *apikeyssvc.Service, opts *APIKeyAuthOptions) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			startedAt := time.Now()

			authHeader := r.Header.Get("Authorization")
			if !strings.HasPrefix(authHeader, "Bearer ") {
				httpx.Error(w, http.StatusUnauthorized, "Unauthorized")
				return
			}
			rawKey := strings.TrimSpace(strings.TrimPrefix(authHeader, "Bearer "))

			apiKey, err := svc.Authenticate(r.Context(), rawKey)
			if err != nil || apiKey == nil {
				httpx.Error(w, http.StatusUnauthorized, "Unauthorized")
				return
			}

			if opts != nil && !apikeyssvc.HasScope(apiKey.Scopes, opts.Resource, opts.Action) {
				httpx.Error(w, http.StatusForbidden, "Forbidden")
				return
			}

			ctx := context.WithValue(r.Context(), APIKeyContextKey, apiKey)
			rw := &statusRecorder{ResponseWriter: w, status: http.StatusOK}
			next.ServeHTTP(rw, r.WithContext(ctx))

			_ = svc.LogRequest(r.Context(), apikeyssvc.LogRequestInput{
				OrganizationID: apiKey.OrganizationID,
				Environment:    apiKey.Environment,
				APIKeyID:       apiKey.ID,
				Method:         r.Method,
				Path:           r.URL.Path,
				StatusCode:     rw.status,
				DurationMs:     int(time.Since(startedAt).Milliseconds()),
			})
		})
	}
}

func APIKeyFromContext(ctx context.Context) *apikeyssvc.APIKey {
	key, _ := ctx.Value(APIKeyContextKey).(*apikeyssvc.APIKey)
	return key
}

type statusRecorder struct {
	http.ResponseWriter
	status int
}

func (r *statusRecorder) WriteHeader(code int) {
	r.status = code
	r.ResponseWriter.WriteHeader(code)
}
