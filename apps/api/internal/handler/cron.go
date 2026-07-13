package handler

import (
	"net/http"

	"github.com/payoesteam/payoes/apps/api/internal/httpx"
	paymentsvc "github.com/payoesteam/payoes/apps/api/internal/service/payments"
	webhooksvc "github.com/payoesteam/payoes/apps/api/internal/service/webhooks"
)

// CronHandler ports apps/web/src/app/api/cron/*
type CronHandler struct {
	webhooks *webhooksvc.Service
	payments *paymentsvc.Service
}

func NewCronHandler(webhooks *webhooksvc.Service, payments *paymentsvc.Service) *CronHandler {
	return &CronHandler{webhooks: webhooks, payments: payments}
}

// Settlement ports POST /api/cron/settlement
func (h *CronHandler) Settlement(w http.ResponseWriter, r *http.Request) {
	processed, err := paymentsvc.RunEscrowSettlementWorker(r.Context(), h.payments)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "Settlement worker failed")
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]any{
		"ok":        true,
		"worker":    "escrow_settlement",
		"processed": processed,
	})
}

// WebhookRetries ports POST /api/cron/webhook-retries
func (h *CronHandler) WebhookRetries(w http.ResponseWriter, r *http.Request) {
	processed, err := h.webhooks.ProcessDueRetries(r.Context(), 25)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "Unable to process webhook retries")
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]any{"ok": true, "processed": processed})
}
