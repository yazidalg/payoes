package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"path/filepath"
	"strings"
	"syscall"
	"time"

	"github.com/joho/godotenv"

	apiauth "github.com/payoesteam/payoes/apps/api/internal/auth"
	"github.com/payoesteam/payoes/apps/api/internal/config"
	"github.com/payoesteam/payoes/apps/api/internal/db"
	"github.com/payoesteam/payoes/apps/api/internal/email"
	"github.com/payoesteam/payoes/apps/api/internal/handler"
	authsvc "github.com/payoesteam/payoes/apps/api/internal/service/auth"
)

func main() {
	loadEnvFiles()

	cfg := config.Load()
	if cfg.AuthSecret == "" {
		log.Fatal("AUTH_SECRET is required")
	}
	if cfg.DatabaseURL == "" {
		log.Fatal("DATABASE_URL is required")
	}

	ctx := context.Background()
	pool, err := db.Connect(ctx, cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("database: %v", err)
	}
	defer pool.Close()

	sessions, err := apiauth.NewSessionManager(cfg.AuthSecret, cfg.WebURL, !strings.HasPrefix(cfg.WebURL, "http://localhost"))
	if err != nil {
		log.Fatalf("session: %v", err)
	}

	mailer := email.NewSender(cfg)
	users := authsvc.NewService(pool, cfg, mailer)

	router := handler.NewRouter(handler.Deps{
		Config:   cfg,
		Pool:     pool,
		Sessions: sessions,
		Users:    users,
		Mailer:   mailer,
	})

	srv := &http.Server{
		Addr:              ":" + cfg.Port,
		Handler:           router,
		ReadHeaderTimeout: 10 * time.Second,
	}

	go func() {
		log.Printf("payoes api listening on :%s", cfg.Port)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("listen: %v", err)
		}
	}()

	stop := make(chan os.Signal, 1)
	signal.Notify(stop, syscall.SIGINT, syscall.SIGTERM)
	<-stop

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()
	if err := srv.Shutdown(shutdownCtx); err != nil {
		log.Printf("shutdown: %v", err)
	}
	fmt.Println("api stopped")
}

func loadEnvFiles() {
	// Prefer apps/api/.env when running via `npm run dev:api` (cwd apps/api).
	candidates := []string{
		".env",
		".env.local",
		filepath.Join("apps", "api", ".env"),
		filepath.Join("apps", "api", ".env.local"),
	}
	for _, path := range candidates {
		_ = godotenv.Load(path)
	}
}
