package handler

import (
	"net/http"
	"strings"

	"github.com/payoesteam/payoes/apps/api/internal/httpx"
	"github.com/payoesteam/payoes/apps/api/internal/middleware"
	orgsvc "github.com/payoesteam/payoes/apps/api/internal/service/organizations"
	paymentmethodssvc "github.com/payoesteam/payoes/apps/api/internal/service/paymentmethods"
	"github.com/payoesteam/payoes/apps/api/internal/stellar"
)

// GetSettlementWallet ports GET /api/organizations/{id}/settlement-wallet
// (also used for /receiving-wallet).
func (h *OrganizationsHandler) GetSettlementWallet(w http.ResponseWriter, r *http.Request) {
	org, _, ok := h.requireMember(w, r)
	if !ok {
		return
	}
	wallet, err := h.orgs.GetSettlementWallet(r.Context(), org.ID, org.Environment)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "Unable to load settlement wallet")
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]any{
		"wallet": orgsvc.SerializeSettlementWallet(wallet),
	})
}

// PutSettlementWallet ports PUT /api/organizations/{id}/settlement-wallet
// (also used for /receiving-wallet).
func (h *OrganizationsHandler) PutSettlementWallet(w http.ResponseWriter, r *http.Request) {
	org, _, ok := h.requireMember(w, r)
	if !ok {
		return
	}

	var body struct {
		StellarAddress string  `json:"stellarAddress"`
		WalletProvider *string `json:"walletProvider"`
		Environment    *string `json:"environment"`
	}
	if err := decodeBody(r, &body); err != nil || strings.TrimSpace(body.StellarAddress) == "" {
		httpx.Error(w, http.StatusBadRequest, "Stellar address is required")
		return
	}
	if body.WalletProvider != nil && len(*body.WalletProvider) > 64 {
		httpx.Error(w, http.StatusBadRequest, "Invalid request")
		return
	}

	targetEnvironment := org.Environment
	if body.Environment != nil && *body.Environment != "" {
		if *body.Environment != "sandbox" && *body.Environment != "production" {
			httpx.Error(w, http.StatusBadRequest, "Invalid request")
			return
		}
		targetEnvironment = *body.Environment
	}

	if targetEnvironment == "sandbox" && org.Environment == "production" {
		httpx.Error(w, http.StatusForbidden, "Sandbox settlement wallet cannot be changed while in production mode")
		return
	}

	stellarAddress := strings.TrimSpace(body.StellarAddress)
	if !stellar.IsValidEd25519PublicKey(stellarAddress) {
		httpx.Error(w, http.StatusBadRequest, "Invalid Stellar public key")
		return
	}

	exists, err := stellar.AccountExists(stellarAddress, targetEnvironment)
	if err != nil {
		httpx.Error(w, http.StatusServiceUnavailable, "Unable to verify Stellar account. Try again later.")
		return
	}
	if !exists {
		msg := "This Stellar account was not found on Testnet. Fund the account or switch your wallet to Testnet."
		if targetEnvironment == "production" {
			msg = "This Stellar account was not found on Mainnet. Fund the account or switch your wallet to Mainnet."
		}
		httpx.Error(w, http.StatusBadRequest, msg)
		return
	}

	wallet, err := h.orgs.UpsertSettlementWallet(r.Context(), org.ID, targetEnvironment, stellarAddress, body.WalletProvider)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "Unable to save settlement wallet")
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]any{
		"wallet": orgsvc.SerializeSettlementWallet(wallet),
	})
}

// PostSettlementWalletTrustlines ports POST /api/organizations/{id}/settlement-wallet/trustlines
// (also used for /receiving-wallet/trustlines).
func (h *OrganizationsHandler) PostSettlementWalletTrustlines(w http.ResponseWriter, r *http.Request) {
	org, _, ok := h.requireMember(w, r)
	if !ok {
		return
	}

	var body struct {
		Action           string   `json:"action"`
		SourcePublicKey  string   `json:"sourcePublicKey"`
		Environment      *string  `json:"environment"`
		EnabledMethodIDs []string `json:"enabled_method_ids"`
	}
	if err := decodeBody(r, &body); err != nil {
		httpx.Error(w, http.StatusBadRequest, "Invalid request")
		return
	}
	if (body.Action != "check" && body.Action != "build") || strings.TrimSpace(body.SourcePublicKey) == "" {
		httpx.Error(w, http.StatusBadRequest, "Invalid request")
		return
	}

	environment := org.Environment
	if body.Environment != nil && *body.Environment != "" {
		environment = *body.Environment
	}

	var required []paymentmethodssvc.TrustlineAsset
	var err error
	if len(body.EnabledMethodIDs) > 0 {
		required, err = h.paymentMethods.RequiredTrustlineAssetsForMethodIDs(r.Context(), org.ID, body.EnabledMethodIDs, environment)
	} else {
		required, err = h.paymentMethods.RequiredTrustlineAssets(r.Context(), org.ID, environment)
	}
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "Unable to prepare trustlines")
		return
	}

	writeTrustlineResponse(w, body.Action, body.SourcePublicKey, environment, required)
}

// PreviewTrustlines ports POST /api/trustlines/preview.
func (h *OrganizationsHandler) PreviewTrustlines(w http.ResponseWriter, r *http.Request) {
	if middleware.UserFromContext(r.Context()) == nil {
		httpx.Error(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	var body struct {
		Action          string `json:"action"`
		SourcePublicKey string `json:"sourcePublicKey"`
		Environment     string `json:"environment"`
	}
	if err := decodeBody(r, &body); err != nil {
		httpx.Error(w, http.StatusBadRequest, "Invalid request")
		return
	}
	if (body.Action != "check" && body.Action != "build") ||
		strings.TrimSpace(body.SourcePublicKey) == "" ||
		(body.Environment != "sandbox" && body.Environment != "production") {
		httpx.Error(w, http.StatusBadRequest, "Invalid request")
		return
	}

	required := paymentmethodssvc.DefaultRequiredTrustlineAssets(body.Environment)
	writeTrustlineResponse(w, body.Action, body.SourcePublicKey, body.Environment, required)
}

func writeTrustlineResponse(w http.ResponseWriter, action, sourcePublicKey, environment string, required []paymentmethodssvc.TrustlineAsset) {
	stellarAssets := make([]stellar.TrustlineAsset, 0, len(required))
	for _, a := range required {
		stellarAssets = append(stellarAssets, stellar.TrustlineAsset{
			AssetCode:     a.AssetCode,
			IssuerAddress: a.IssuerAddress,
			DisplayName:   a.DisplayName,
		})
	}

	missing, err := stellar.GetMissingTrustlines(sourcePublicKey, stellarAssets, environment)
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, err.Error())
		return
	}

	if action == "check" {
		out := make([]map[string]any, 0, len(missing))
		for _, asset := range missing {
			out = append(out, map[string]any{
				"asset_code":     asset.AssetCode,
				"issuer_address": asset.IssuerAddress,
				"display_name":   asset.DisplayName,
			})
		}
		httpx.JSON(w, http.StatusOK, map[string]any{
			"missing":     out,
			"has_missing": len(missing) > 0,
		})
		return
	}

	if len(missing) == 0 {
		httpx.JSON(w, http.StatusOK, map[string]any{
			"xdr":         nil,
			"has_missing": false,
		})
		return
	}

	xdr, err := stellar.BuildChangeTrustTransactionXDR(sourcePublicKey, missing, environment)
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, err.Error())
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]any{
		"xdr":           xdr,
		"has_missing":   true,
		"missing_count": len(missing),
	})
}
