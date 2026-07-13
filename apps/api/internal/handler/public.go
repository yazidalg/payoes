package handler

import (
	"context"
	"errors"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/payoesteam/payoes/apps/api/internal/httpx"
)

// PublicHandler ports hosted invoice and payment-link public routes.
type PublicHandler struct {
	pool *pgxpool.Pool
}

func NewPublicHandler(pool *pgxpool.Pool) *PublicHandler {
	return &PublicHandler{pool: pool}
}

// GetInvoice ports GET /api/invoices/{invoiceId}
func (h *PublicHandler) GetInvoice(w http.ResponseWriter, r *http.Request) {
	invoiceID := chi.URLParam(r, "invoiceId")
	var publicID, status, currency, amount string
	err := h.pool.QueryRow(r.Context(), `
		SELECT public_id, status, currency_code, amount
		FROM invoices WHERE public_id = $1 LIMIT 1`, invoiceID).Scan(
		&publicID, &status, &currency, &amount,
	)
	if errors.Is(err, pgx.ErrNoRows) || err != nil {
		httpx.Error(w, http.StatusNotFound, "Invoice not found")
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]any{
		"invoice": map[string]any{
			"id":       publicID,
			"status":   status,
			"currency": currency,
			"amount":   amount,
		},
	})
}

// GetPaymentLink ports GET /api/payment-links/{linkId}
func (h *PublicHandler) GetPaymentLink(w http.ResponseWriter, r *http.Request) {
	linkID := chi.URLParam(r, "linkId")
	payload, err := h.loadPaymentLink(r.Context(), linkID)
	if err != nil || payload == nil {
		httpx.Error(w, http.StatusNotFound, "Payment link not found")
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]any{"payment_link": payload})
}

// CreateCheckoutFromLink ports POST /api/payment-links/{linkId}
func (h *PublicHandler) CreateCheckoutFromLink(w http.ResponseWriter, r *http.Request) {
	linkID := chi.URLParam(r, "linkId")
	payload, err := h.loadPaymentLink(r.Context(), linkID)
	if err != nil || payload == nil {
		httpx.Error(w, http.StatusNotFound, "Payment link not found")
		return
	}
	httpx.JSON(w, http.StatusNotImplemented, map[string]any{
		"error":        "Payment link checkout spawn is migrating to the Go API",
		"payment_link": payload,
	})
}

func (h *PublicHandler) loadPaymentLink(ctx context.Context, linkID string) (map[string]any, error) {
	var publicID string
	var amount string
	var active int
	var productName *string
	err := h.pool.QueryRow(ctx, `
		SELECT public_id, amount, active, product_name
		FROM payment_links WHERE public_id = $1 LIMIT 1`, linkID).Scan(
		&publicID, &amount, &active, &productName,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	name := ""
	if productName != nil {
		name = *productName
	}
	return map[string]any{
		"id":     publicID,
		"name":   name,
		"amount": amount,
		"active": active == 1,
	}, nil
}
