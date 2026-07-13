package handler

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	chimw "github.com/go-chi/chi/v5/middleware"
	"github.com/jackc/pgx/v5/pgxpool"

	apiauth "github.com/payoesteam/payoes/apps/api/internal/auth"
	"github.com/payoesteam/payoes/apps/api/internal/config"
	"github.com/payoesteam/payoes/apps/api/internal/email"
	"github.com/payoesteam/payoes/apps/api/internal/kyc/persona"
	"github.com/payoesteam/payoes/apps/api/internal/middleware"
	analyticssvc "github.com/payoesteam/payoes/apps/api/internal/service/analytics"
	apikeyssvc "github.com/payoesteam/payoes/apps/api/internal/service/apikeys"
	apilogssvc "github.com/payoesteam/payoes/apps/api/internal/service/apilogs"
	authsvc "github.com/payoesteam/payoes/apps/api/internal/service/auth"
	checkoutsessions "github.com/payoesteam/payoes/apps/api/internal/service/checkoutsessions"
	customersvc "github.com/payoesteam/payoes/apps/api/internal/service/customers"
	integrationsvc "github.com/payoesteam/payoes/apps/api/internal/service/integrations"
	invoicesvc "github.com/payoesteam/payoes/apps/api/internal/service/invoices"
	kycsvc "github.com/payoesteam/payoes/apps/api/internal/service/kyc"
	orgsvc "github.com/payoesteam/payoes/apps/api/internal/service/organizations"
	paymentlinkssvc "github.com/payoesteam/payoes/apps/api/internal/service/paymentlinks"
	paymentmethodssvc "github.com/payoesteam/payoes/apps/api/internal/service/paymentmethods"
	paymentsvc "github.com/payoesteam/payoes/apps/api/internal/service/payments"
	settlementssvc "github.com/payoesteam/payoes/apps/api/internal/service/settlements"
	webhooksvc "github.com/payoesteam/payoes/apps/api/internal/service/webhooks"
)

// Deps wires shared dependencies into the HTTP router.
type Deps struct {
	Config   config.Config
	Pool     *pgxpool.Pool
	Sessions *apiauth.SessionManager
	Users    *authsvc.Service
	Mailer   *email.Sender
}

// NewRouter mounts all API routes with chi.
func NewRouter(deps Deps) http.Handler {
	orgs := orgsvc.NewService(deps.Pool)
	customers := customersvc.NewService(deps.Pool)
	payments := paymentsvc.NewService(deps.Pool, orgs, customers)
	apiKeys := apikeyssvc.NewService(deps.Pool)
	webhooks := webhooksvc.NewService(deps.Pool)
	personaClient := persona.NewClient(deps.Config.PersonaAPIKey, deps.Config.PersonaInquiryTemplateID)
	kyc := kycsvc.NewService(deps.Pool, orgs, personaClient)
	paymentMethods := paymentmethodssvc.NewService(deps.Pool)
	analytics := analyticssvc.NewService(deps.Pool)
	settlements := settlementssvc.NewService(deps.Pool)
	apiLogs := apilogssvc.NewService(deps.Pool)
	checkoutSessions := checkoutsessions.NewService(deps.Pool, payments, deps.Config.WebURL)
	invoices := invoicesvc.NewService(deps.Pool, customers, checkoutSessions, paymentMethods, deps.Mailer, deps.Config.WebURL)
	paymentLinks := paymentlinkssvc.NewService(deps.Pool, paymentMethods, deps.Config.WebURL)
	integrations := integrationsvc.NewService(deps.Pool, integrationsvc.Config{
		APIURL:                  deps.Config.APIURL,
		WebURL:                  deps.Config.WebURL,
		ShopifyClientID:         deps.Config.ShopifyClientID,
		ShopifyClientSecret:     deps.Config.ShopifyClientSecret,
		ShopifyScopes:           deps.Config.ShopifyScopes,
		IntegrationsStateSecret: deps.Config.IntegrationsStateSecret,
		AuthSecret:              deps.Config.AuthSecret,
	})

	authH := NewAuthHandler(deps.Config, deps.Users, deps.Sessions)
	orgsH := NewOrganizationsHandler(orgs, customers, payments, apiKeys, webhooks, kyc, paymentMethods, deps.Config.WebURL)
	verificationH := NewVerificationHandler(kyc, orgs)
	dashH := NewOrgDashboardHandler(orgs, analytics, payments, settlements, apiLogs, apiKeys, customers, deps.Config.WebURL)
	invoicesH := NewInvoicesHandler(orgs, invoices)
	paymentLinksH := NewPaymentLinksHandler(orgs, paymentLinks)
	checkoutSessionsH := NewCheckoutSessionsHandler(orgs, checkoutSessions)
	teamH := NewTeamHandler(orgs, deps.Mailer, deps.Config.WebURL)
	invitesPublicH := NewInvitesPublicHandler(orgs, deps.Config.WebURL)
	webhookDetailH := NewWebhookDetailHandler(orgs, webhooks)
	integrationsH := NewIntegrationsHandler(orgs, integrations, deps.Config.WebURL)
	v1H := NewV1Handler(customers, payments, deps.Config.WebURL)
	v1H.SetBillingServices(invoices, paymentLinks, checkoutSessions)
	payments.SetSettlementDeps(paymentsvc.SettlementDeps{
		Webhooks:        webhooks,
		CheckoutBaseURL: deps.Config.WebURL,
	})
	checkoutH := NewCheckoutHandler(deps.Pool, payments, checkoutSessions, deps.Config)
	cronH := NewCronHandler(webhooks, payments)
	inboundH := NewInboundWebhooksHandler(deps.Config)
	userH := NewUserHandler(deps.Pool)
	sessionH := NewSessionHandler(orgs, deps.Config)
	publicH := NewPublicHandler(deps.Pool)

	r := chi.NewRouter()
	r.Use(chimw.RequestID)
	r.Use(chimw.RealIP)
	r.Use(chimw.Recoverer)
	r.Use(middleware.CORS(deps.Config))

	r.Get("/healthz", func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"ok":true,"service":"payoes-api"}`))
	})

	r.Route("/api", func(r chi.Router) {
		r.Route("/auth", func(r chi.Router) {
			r.Post("/register", authH.Register)
			r.Post("/validate-login", authH.ValidateLogin)
			r.Post("/resend-verification", authH.ResendVerification)
			r.Get("/verify-email", authH.VerifyEmail)
			r.With(middleware.OptionalSession(deps.Sessions)).Get("/session", authH.Session)
			r.Post("/logout", authH.Logout)
			r.Get("/google", authH.GoogleStart)
			r.Get("/callback/google", authH.GoogleCallback)
		})

		r.Get("/invites/{token}", invitesPublicH.GetInvite)
		r.Get("/integrations/shopify/callback", integrationsH.ShopifyCallback)

		r.Group(func(r chi.Router) {
			r.Use(middleware.RequireSession(deps.Sessions))

			r.Get("/user", userH.GetUser)
			r.Patch("/user", userH.PatchUser)
			r.Post("/session/active-organization", sessionH.SetActiveOrganization)
			r.Post("/trustlines/preview", orgsH.PreviewTrustlines)
			r.Post("/invites/{token}/accept", invitesPublicH.AcceptInvite)

			r.Get("/organizations", orgsH.ListOrganizations)
			r.Post("/organizations", orgsH.CreateOrganization)
			r.Route("/organizations/{id}", func(r chi.Router) {
				r.Get("/", orgsH.GetOrganization)
				r.Patch("/", orgsH.UpdateOrganization)
				r.Delete("/", orgsH.DeleteOrganization)

				r.Get("/verification", verificationH.GetVerification)
				r.Post("/verification", verificationH.StartVerification)
				r.Post("/verification/session", verificationH.VerificationSession)

				r.Patch("/environment", orgsH.PatchEnvironment)
				r.Get("/analytics", dashH.GetAnalytics)

				r.Get("/members", orgsH.ListMembers)
				r.Patch("/members/{userId}", teamH.UpdateMember)
				r.Delete("/members/{userId}", teamH.DeleteMember)

				r.Get("/invites", teamH.ListInvites)
				r.Post("/invites", teamH.CreateInvite)
				r.Post("/invites/{inviteId}", teamH.ResendInvite)
				r.Delete("/invites/{inviteId}", teamH.RevokeInvite)

				r.Get("/payment-methods", orgsH.ListPaymentMethods)
				r.Post("/payment-methods", orgsH.CreatePaymentMethod)
				r.Patch("/payment-methods/settlement", orgsH.PatchPaymentMethodSettlement)
				r.Post("/payment-methods/validate", orgsH.ValidatePaymentMethod)
				r.Patch("/payment-methods/{methodId}", orgsH.UpdatePaymentMethod)
				r.Delete("/payment-methods/{methodId}", orgsH.DeletePaymentMethod)

				r.Get("/settlement-wallet", orgsH.GetSettlementWallet)
				r.Put("/settlement-wallet", orgsH.PutSettlementWallet)
				r.Post("/settlement-wallet/trustlines", orgsH.PostSettlementWalletTrustlines)
				r.Get("/receiving-wallet", orgsH.GetSettlementWallet)
				r.Put("/receiving-wallet", orgsH.PutSettlementWallet)
				r.Post("/receiving-wallet/trustlines", orgsH.PostSettlementWalletTrustlines)

				r.Get("/customers", orgsH.ListCustomers)
				r.Post("/customers", orgsH.CreateCustomer)
				r.Get("/customers/{customerId}", orgsH.GetCustomer)
				r.Patch("/customers/{customerId}", dashH.UpdateCustomer)

				r.Get("/payments", orgsH.ListPayments)
				r.Post("/payments", orgsH.CreatePayment)
				r.Get("/payments/counts", dashH.GetPaymentCounts)
				r.Get("/payments/{paymentId}", orgsH.GetPayment)

				r.Get("/transactions", dashH.ListTransactions)
				r.Get("/settlements", dashH.ListSettlements)

				r.Get("/invoices", invoicesH.List)
				r.Post("/invoices", invoicesH.Create)
				r.Post("/invoices/preview-email", invoicesH.PreviewEmail)
				r.Post("/invoices/send", invoicesH.CreateAndSend)
				r.Get("/invoices/{invoiceId}", invoicesH.Get)
				r.Patch("/invoices/{invoiceId}", invoicesH.Update)
				r.Delete("/invoices/{invoiceId}", invoicesH.Delete)
				r.Post("/invoices/{invoiceId}/finalize", invoicesH.Finalize)
				r.Post("/invoices/{invoiceId}/send", invoicesH.Send)
				r.Post("/invoices/{invoiceId}/void", invoicesH.Void)
				r.Post("/invoices/{invoiceId}/mark-paid", invoicesH.MarkPaid)

				r.Get("/payment-links", paymentLinksH.List)
				r.Post("/payment-links", paymentLinksH.Create)
				r.Get("/payment-links/{linkId}", paymentLinksH.Get)

				r.Get("/checkout-sessions", checkoutSessionsH.List)
				r.Get("/checkout-sessions/{sessionId}", checkoutSessionsH.Get)

				r.Get("/api-keys", orgsH.ListAPIKeys)
				r.Post("/api-keys", orgsH.CreateAPIKey)
				r.Get("/api-keys/{keyId}", dashH.GetAPIKey)
				r.Patch("/api-keys/{keyId}", orgsH.UpdateAPIKey)
				r.Delete("/api-keys/{keyId}", orgsH.DeleteAPIKey)
				r.Get("/api-logs", dashH.ListAPILogs)

				r.Get("/webhooks", orgsH.ListWebhooks)
				r.Post("/webhooks", orgsH.CreateWebhook)
				r.Get("/webhooks/{webhookId}", webhookDetailH.Get)
				r.Patch("/webhooks/{webhookId}", webhookDetailH.Patch)
				r.Delete("/webhooks/{webhookId}", webhookDetailH.Delete)
				r.Post("/webhooks/{webhookId}/test", webhookDetailH.Test)
				r.Post("/webhooks/{webhookId}/rotate-secret", webhookDetailH.RotateSecret)
				r.Post("/webhooks/{webhookId}/deliveries/{deliveryId}/retry", webhookDetailH.RetryDelivery)

				r.Get("/integrations", integrationsH.List)
				r.Post("/integrations/shopify/connect", integrationsH.ConnectShopify)
				r.Post("/integrations/woocommerce/connect", integrationsH.ConnectWooCommerce)
				r.Get("/integrations/{provider}", integrationsH.Get)
				r.Delete("/integrations/{provider}", integrationsH.Delete)
			})
		})

		r.Route("/v1", func(r chi.Router) {
			r.With(middleware.RequireAPIKey(apiKeys, &middleware.APIKeyAuthOptions{Resource: "payments", Action: "read"})).
				Get("/payments", v1H.ListPayments)
			r.With(middleware.RequireAPIKey(apiKeys, &middleware.APIKeyAuthOptions{Resource: "payments", Action: "write"})).
				Post("/payments", v1H.CreatePayment)
			r.With(middleware.RequireAPIKey(apiKeys, &middleware.APIKeyAuthOptions{Resource: "payments", Action: "read"})).
				Get("/payments/{id}", v1H.GetPayment)

			r.With(middleware.RequireAPIKey(apiKeys, &middleware.APIKeyAuthOptions{Resource: "customers", Action: "read"})).
				Get("/customers", v1H.ListCustomers)
			r.With(middleware.RequireAPIKey(apiKeys, &middleware.APIKeyAuthOptions{Resource: "customers", Action: "write"})).
				Post("/customers", v1H.CreateCustomer)
			r.With(middleware.RequireAPIKey(apiKeys, &middleware.APIKeyAuthOptions{Resource: "customers", Action: "read"})).
				Get("/customers/{id}", v1H.GetCustomer)

			r.With(middleware.RequireAPIKey(apiKeys, &middleware.APIKeyAuthOptions{Resource: "invoices", Action: "read"})).
				Get("/invoices", v1H.ListInvoices)
			r.With(middleware.RequireAPIKey(apiKeys, &middleware.APIKeyAuthOptions{Resource: "invoices", Action: "write"})).
				Post("/invoices", v1H.CreateInvoice)
			r.With(middleware.RequireAPIKey(apiKeys, &middleware.APIKeyAuthOptions{Resource: "invoices", Action: "read"})).
				Get("/invoices/{id}", v1H.GetInvoice)
			r.With(middleware.RequireAPIKey(apiKeys, &middleware.APIKeyAuthOptions{Resource: "invoices", Action: "write"})).
				Post("/invoices/{id}/finalize", v1H.FinalizeInvoice)

			r.With(middleware.RequireAPIKey(apiKeys, &middleware.APIKeyAuthOptions{Resource: "payment_links", Action: "read"})).
				Get("/payment-links", v1H.ListPaymentLinks)
			r.With(middleware.RequireAPIKey(apiKeys, &middleware.APIKeyAuthOptions{Resource: "payment_links", Action: "write"})).
				Post("/payment-links", v1H.CreatePaymentLink)
			r.With(middleware.RequireAPIKey(apiKeys, &middleware.APIKeyAuthOptions{Resource: "payment_links", Action: "read"})).
				Get("/payment-links/{id}", v1H.GetPaymentLink)

			r.With(middleware.RequireAPIKey(apiKeys, &middleware.APIKeyAuthOptions{Resource: "checkout_sessions", Action: "read"})).
				Get("/checkout-sessions", v1H.ListCheckoutSessions)
			r.With(middleware.RequireAPIKey(apiKeys, &middleware.APIKeyAuthOptions{Resource: "checkout_sessions", Action: "read"})).
				Get("/checkout-sessions/{id}", v1H.GetCheckoutSession)
		})

		r.Get("/checkout/{paymentId}", checkoutH.Get)
		r.Post("/checkout/{paymentId}", checkoutH.Post)
		r.Get("/checkout/{paymentId}/quote", checkoutH.Quote)

		r.Get("/invoices/{invoiceId}", publicH.GetInvoice)
		r.Get("/payment-links/{linkId}", publicH.GetPaymentLink)
		r.Post("/payment-links/{linkId}", publicH.CreateCheckoutFromLink)

		r.Post("/webhooks/persona", inboundH.Persona)
		r.Post("/webhooks/shopify", inboundH.Shopify)
		r.Post("/webhooks/woocommerce", inboundH.WooCommerce)

		r.Group(func(r chi.Router) {
			r.Use(middleware.RequireCronSecret(deps.Config.CronSecret))
			r.Post("/cron/settlement", cronH.Settlement)
			r.Post("/cron/webhook-retries", cronH.WebhookRetries)
		})
	})

	return r
}
