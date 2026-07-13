package middleware

import (
	"net/http"

	"github.com/go-chi/cors"
	"github.com/payoesteam/payoes/apps/api/internal/config"
)

func CORS(cfg config.Config) func(http.Handler) http.Handler {
	return cors.Handler(cors.Options{
		AllowedOrigins:   cfg.CORSOrigins,
		AllowedMethods:   []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-Cron-Secret", "X-Requested-With"},
		AllowCredentials: true,
		MaxAge:           300,
	})
}
