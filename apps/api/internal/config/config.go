// Package config loads environment variables matching apps/web/.env.example.
package config

import (
	"os"
	"strconv"
	"strings"
)

type Config struct {
	Port string

	AuthSecret string
	AuthURL    string
	WebURL     string
	APIURL     string

	GoogleClientID     string
	GoogleClientSecret string

	DatabaseURL string

	S3Endpoint  string
	S3PublicURL string
	S3AccessKey string
	S3SecretKey string
	S3Bucket    string
	S3Region    string

	SMTPHost     string
	SMTPPort     string
	SMTPUser     string
	SMTPPassword string
	SMTPFrom     string

	StellarTestnetOperatorSecret string
	StellarMainnetOperatorSecret string

	SorobanTestnetRPCURL     string
	SorobanTestnetContractID string
	SorobanMainnetRPCURL     string
	SorobanMainnetContractID string

	PersonaAPIKey             string
	PersonaWebhookSecret      string
	PersonaInquiryTemplateID  string

	CoinGeckoAPIKey         string
	InvoiceQuoteTTLMinutes  int
	CronSecret              string

	ShopifyClientID     string
	ShopifyClientSecret string
	ShopifyScopes       string

	IntegrationsStateSecret string

	CORSOrigins []string
}

func Load() Config {
	webURL := envOr("WEB_URL", envOr("AUTH_URL", "http://localhost:3000"))
	apiURL := envOr("API_URL", "http://localhost:8080")
	authURL := envOr("AUTH_URL", apiURL)

	origins := []string{webURL, "http://localhost:3000"}
	if extra := os.Getenv("CORS_ORIGINS"); extra != "" {
		for _, o := range strings.Split(extra, ",") {
			if t := strings.TrimSpace(o); t != "" {
				origins = append(origins, t)
			}
		}
	}

	return Config{
		Port: envOr("PORT", "8080"),

		AuthSecret: os.Getenv("AUTH_SECRET"),
		AuthURL:    authURL,
		WebURL:     webURL,
		APIURL:     apiURL,

		GoogleClientID:     os.Getenv("AUTH_GOOGLE_ID"),
		GoogleClientSecret: os.Getenv("AUTH_GOOGLE_SECRET"),

		DatabaseURL: os.Getenv("DATABASE_URL"),

		S3Endpoint:  envOr("S3_ENDPOINT", "http://localhost:9000"),
		S3PublicURL: envOr("S3_PUBLIC_URL", "http://localhost:9000/payoes-uploads"),
		S3AccessKey: envOr("S3_ACCESS_KEY", "payoes"),
		S3SecretKey: envOr("S3_SECRET_KEY", "payoessecret"),
		S3Bucket:    envOr("S3_BUCKET", "payoes-uploads"),
		S3Region:    envOr("S3_REGION", "us-east-1"),

		SMTPHost:     os.Getenv("SMTP_HOST"),
		SMTPPort:     envOr("SMTP_PORT", "587"),
		SMTPUser:     os.Getenv("SMTP_USER"),
		SMTPPassword: os.Getenv("SMTP_PASSWORD"),
		SMTPFrom:     envOr("SMTP_FROM", "Payoes <noreply@localhost>"),

		StellarTestnetOperatorSecret: os.Getenv("STELLAR_TESTNET_OPERATOR_SECRET"),
		StellarMainnetOperatorSecret: os.Getenv("STELLAR_MAINNET_OPERATOR_SECRET"),

		SorobanTestnetRPCURL:     envOr("SOROBAN_TESTNET_RPC_URL", "https://soroban-testnet.stellar.org"),
		SorobanTestnetContractID: os.Getenv("SOROBAN_TESTNET_CONTRACT_ID"),
		SorobanMainnetRPCURL:     os.Getenv("SOROBAN_MAINNET_RPC_URL"),
		SorobanMainnetContractID: os.Getenv("SOROBAN_MAINNET_CONTRACT_ID"),

		PersonaAPIKey:            os.Getenv("PERSONA_API_KEY"),
		PersonaWebhookSecret:     os.Getenv("PERSONA_WEBHOOK_SECRET"),
		PersonaInquiryTemplateID: os.Getenv("PERSONA_INQUIRY_TEMPLATE_ID"),

		CoinGeckoAPIKey:        os.Getenv("COINGECKO_API_KEY"),
		InvoiceQuoteTTLMinutes: envInt("INVOICE_QUOTE_TTL_MINUTES", 15),
		CronSecret:             os.Getenv("CRON_SECRET"),

		ShopifyClientID:     os.Getenv("SHOPIFY_CLIENT_ID"),
		ShopifyClientSecret: os.Getenv("SHOPIFY_CLIENT_SECRET"),
		ShopifyScopes:       envOr("SHOPIFY_SCOPES", "read_orders,write_orders"),

		IntegrationsStateSecret: os.Getenv("INTEGRATIONS_STATE_SECRET"),

		CORSOrigins: origins,
	}
}

func envOr(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func envInt(key string, fallback int) int {
	v := os.Getenv(key)
	if v == "" {
		return fallback
	}
	n, err := strconv.Atoi(v)
	if err != nil {
		return fallback
	}
	return n
}
