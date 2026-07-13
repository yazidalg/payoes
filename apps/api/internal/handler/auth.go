package handler

import (
	"encoding/json"
	"errors"
	"net/http"
	"net/url"
	"strings"

	"golang.org/x/oauth2"
	"golang.org/x/oauth2/google"

	apiauth "github.com/payoesteam/payoes/apps/api/internal/auth"
	"github.com/payoesteam/payoes/apps/api/internal/config"
	"github.com/payoesteam/payoes/apps/api/internal/httpx"
	"github.com/payoesteam/payoes/apps/api/internal/middleware"
	authsvc "github.com/payoesteam/payoes/apps/api/internal/service/auth"
)

// AuthHandler ports apps/web/src/app/api/auth/*
type AuthHandler struct {
	cfg      config.Config
	users    *authsvc.Service
	sessions *apiauth.SessionManager
	oauth    *oauth2.Config
}

func NewAuthHandler(cfg config.Config, users *authsvc.Service, sessions *apiauth.SessionManager) *AuthHandler {
	var oauthCfg *oauth2.Config
	if cfg.GoogleClientID != "" && cfg.GoogleClientSecret != "" {
		oauthCfg = &oauth2.Config{
			ClientID:     cfg.GoogleClientID,
			ClientSecret: cfg.GoogleClientSecret,
			RedirectURL:  strings.TrimRight(cfg.APIURL, "/") + "/api/auth/callback/google",
			Scopes:       []string{"openid", "email", "profile"},
			Endpoint:     google.Endpoint,
		}
	}
	return &AuthHandler{cfg: cfg, users: users, sessions: sessions, oauth: oauthCfg}
}

type registerBody struct {
	Name        string `json:"name"`
	Email       string `json:"email"`
	Password    string `json:"password"`
	CallbackURL string `json:"callbackUrl"`
}

// Register ports POST /api/auth/register
func (h *AuthHandler) Register(w http.ResponseWriter, r *http.Request) {
	var body registerBody
	if err := httpx.DecodeJSON(r, &body); err != nil {
		httpx.Error(w, http.StatusBadRequest, "Invalid request")
		return
	}
	if strings.TrimSpace(body.Name) == "" {
		httpx.Error(w, http.StatusBadRequest, "Name is required")
		return
	}
	if !strings.Contains(body.Email, "@") {
		httpx.Error(w, http.StatusBadRequest, "Invalid email")
		return
	}
	if len(body.Password) < 8 {
		httpx.Error(w, http.StatusBadRequest, "Password must be at least 8 characters")
		return
	}

	callback := apiauth.GetSafePostAuthRedirect(body.CallbackURL)
	user, err := h.users.CreateUser(r.Context(), body.Name, body.Email, body.Password, callback)
	if err != nil {
		if errors.Is(err, authsvc.ErrEmailExists) {
			httpx.ErrorCode(w, http.StatusConflict, apiauth.ErrorMessages[apiauth.CodeEmailExists], apiauth.CodeEmailExists)
			return
		}
		if errors.Is(err, authsvc.ErrGoogleAccountExists) {
			httpx.ErrorCode(w, http.StatusConflict, apiauth.ErrorMessages[apiauth.CodeGoogleAccount], apiauth.CodeGoogleAccount)
			return
		}
		httpx.Error(w, http.StatusInternalServerError, "Unable to create account")
		return
	}

	httpx.JSON(w, http.StatusCreated, map[string]any{
		"user": map[string]string{
			"id":    user.ID,
			"email": user.Email,
			"name":  user.Name,
		},
		"requiresVerification": true,
	})
}

type loginBody struct {
	Email       string `json:"email"`
	Password    string `json:"password"`
	CallbackURL string `json:"callbackUrl"`
}

// ValidateLogin ports POST /api/auth/validate-login and also sets session cookie.
func (h *AuthHandler) ValidateLogin(w http.ResponseWriter, r *http.Request) {
	var body loginBody
	if err := httpx.DecodeJSON(r, &body); err != nil {
		httpx.Error(w, http.StatusBadRequest, "Invalid request")
		return
	}
	if !strings.Contains(body.Email, "@") {
		httpx.Error(w, http.StatusBadRequest, "Invalid email")
		return
	}
	if len(body.Password) < 8 {
		httpx.Error(w, http.StatusBadRequest, "Password must be at least 8 characters")
		return
	}

	user, code, err := h.users.ValidateCredentialLogin(r.Context(), body.Email, body.Password)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "Unable to sign in")
		return
	}
	if code != "" {
		httpx.ErrorCode(w, http.StatusUnauthorized, apiauth.ErrorMessages[code], code)
		return
	}

	token, err := h.sessions.Issue(*user)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "Unable to create session")
		return
	}
	h.sessions.SetCookie(w, token)

	redirectTo, err := h.users.ResolvePostAuthRedirect(r.Context(), user.ID, user.Email, body.CallbackURL)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "Unable to sign in")
		return
	}

	httpx.JSON(w, http.StatusOK, map[string]any{"ok": true, "redirectTo": redirectTo})
}

type resendBody struct {
	Email       string `json:"email"`
	CallbackURL string `json:"callbackUrl"`
}

// ResendVerification ports POST /api/auth/resend-verification
func (h *AuthHandler) ResendVerification(w http.ResponseWriter, r *http.Request) {
	var body resendBody
	if err := httpx.DecodeJSON(r, &body); err != nil {
		httpx.Error(w, http.StatusBadRequest, "Invalid request")
		return
	}
	if !strings.Contains(body.Email, "@") {
		httpx.Error(w, http.StatusBadRequest, "Invalid email")
		return
	}

	callback := apiauth.GetSafePostAuthRedirect(body.CallbackURL)
	user, err := h.users.FindByEmail(r.Context(), body.Email)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "Unable to resend verification email")
		return
	}
	if user == nil {
		httpx.JSON(w, http.StatusOK, map[string]any{"sent": true})
		return
	}
	if user.EmailVerifiedAt != nil {
		httpx.JSON(w, http.StatusOK, map[string]any{"sent": true, "alreadyVerified": true})
		return
	}

	_, err = h.users.ResendEmailVerification(r.Context(), user.ID, callback)
	if err != nil {
		if errors.Is(err, authsvc.ErrResendCooldown) {
			httpx.ErrorCode(w, http.StatusTooManyRequests, apiauth.ErrorMessages[apiauth.CodeResendCooldown], apiauth.CodeResendCooldown)
			return
		}
		if errors.Is(err, authsvc.ErrGoogleAccount) {
			httpx.ErrorCode(w, http.StatusBadRequest, apiauth.ErrorMessages[apiauth.CodeGoogleAccount], apiauth.CodeGoogleAccount)
			return
		}
		if errors.Is(err, authsvc.ErrEmailDeliveryFailed) {
			httpx.Error(w, http.StatusServiceUnavailable, "Unable to send the verification email. Check SMTP settings and try again.")
			return
		}
		httpx.Error(w, http.StatusInternalServerError, "Unable to resend verification email")
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]any{"sent": true})
}

// VerifyEmail ports GET /api/auth/verify-email
func (h *AuthHandler) VerifyEmail(w http.ResponseWriter, r *http.Request) {
	token := r.URL.Query().Get("token")
	callback := apiauth.GetSafePostAuthRedirect(r.URL.Query().Get("callbackUrl"))
	web := strings.TrimRight(h.cfg.WebURL, "/")

	redirectErr := func(code string) {
		httpx.Redirect(w, r, web+"/verify-email?error="+code)
	}

	if token == "" {
		redirectErr("invalid")
		return
	}

	user, err := h.users.ConsumeEmailVerificationToken(r.Context(), token)
	if err != nil {
		if errors.Is(err, authsvc.ErrTokenExpired) {
			redirectErr("expired")
			return
		}
		redirectErr("invalid")
		return
	}
	if user == nil {
		redirectErr("invalid")
		return
	}
	if user.EmailVerifiedAt == nil {
		if _, err := h.users.MarkEmailVerified(r.Context(), user.ID); err != nil {
			redirectErr("invalid")
			return
		}
	}

	sessionUser := apiauth.SessionUser{ID: user.ID, Email: user.Email, Name: user.Name, Image: user.Image}
	jwtToken, err := h.sessions.Issue(sessionUser)
	if err != nil {
		redirectErr("invalid")
		return
	}
	h.sessions.SetCookie(w, jwtToken)

	redirectTo, err := h.users.ResolvePostAuthRedirect(r.Context(), user.ID, user.Email, callback)
	if err != nil {
		redirectErr("invalid")
		return
	}
	httpx.Redirect(w, r, web+redirectTo)
}

// Session returns the current session user.
func (h *AuthHandler) Session(w http.ResponseWriter, r *http.Request) {
	user := middleware.UserFromContext(r.Context())
	if user == nil {
		var err error
		user, err = h.sessions.UserFromRequest(r)
		if err != nil || user == nil {
			httpx.JSON(w, http.StatusOK, map[string]any{"user": nil})
			return
		}
	}
	httpx.JSON(w, http.StatusOK, map[string]any{"user": user})
}

// Logout clears the session cookie.
func (h *AuthHandler) Logout(w http.ResponseWriter, r *http.Request) {
	h.sessions.ClearCookie(w)
	httpx.JSON(w, http.StatusOK, map[string]any{"ok": true})
}

// GoogleStart redirects to Google OAuth.
func (h *AuthHandler) GoogleStart(w http.ResponseWriter, r *http.Request) {
	if h.oauth == nil {
		httpx.Error(w, http.StatusServiceUnavailable, "Google OAuth is not configured")
		return
	}
	callback := apiauth.GetSafePostAuthRedirect(r.URL.Query().Get("callbackUrl"))
	state := url.QueryEscape(callback)
	httpx.Redirect(w, r, h.oauth.AuthCodeURL(state, oauth2.AccessTypeOnline))
}

// GoogleCallback handles Google OAuth callback.
func (h *AuthHandler) GoogleCallback(w http.ResponseWriter, r *http.Request) {
	web := strings.TrimRight(h.cfg.WebURL, "/")
	if h.oauth == nil {
		httpx.Redirect(w, r, web+"/login?error=Configuration")
		return
	}

	code := r.URL.Query().Get("code")
	if code == "" {
		httpx.Redirect(w, r, web+"/login?error=OAuthCallback")
		return
	}

	token, err := h.oauth.Exchange(r.Context(), code)
	if err != nil {
		httpx.Redirect(w, r, web+"/login?error=OAuthCallback")
		return
	}

	client := h.oauth.Client(r.Context(), token)
	resp, err := client.Get("https://www.googleapis.com/oauth2/v2/userinfo")
	if err != nil {
		httpx.Redirect(w, r, web+"/login?error=OAuthCallback")
		return
	}
	defer resp.Body.Close()

	var info struct {
		Email   string `json:"email"`
		Name    string `json:"name"`
		Picture string `json:"picture"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&info); err != nil || info.Email == "" {
		httpx.Redirect(w, r, web+"/login?error=OAuthCallback")
		return
	}

	var namePtr, imagePtr *string
	if strings.TrimSpace(info.Name) != "" {
		n := strings.TrimSpace(info.Name)
		namePtr = &n
	}
	if info.Picture != "" {
		p := info.Picture
		imagePtr = &p
	}

	user, err := h.users.UpsertOAuthUser(r.Context(), info.Email, namePtr, imagePtr)
	if err != nil {
		if errors.Is(err, authsvc.ErrCredentialsExists) {
			httpx.Redirect(w, r, web+"/login?error=credentials_account")
			return
		}
		httpx.Redirect(w, r, web+"/login?error=OAuthCallback")
		return
	}

	sessionUser := apiauth.SessionUser{ID: user.ID, Email: user.Email, Name: user.Name, Image: user.Image}
	jwtToken, err := h.sessions.Issue(sessionUser)
	if err != nil {
		httpx.Redirect(w, r, web+"/login?error=OAuthCallback")
		return
	}
	h.sessions.SetCookie(w, jwtToken)

	callback, _ := url.QueryUnescape(r.URL.Query().Get("state"))
	redirectTo, err := h.users.ResolvePostAuthRedirect(r.Context(), user.ID, user.Email, callback)
	if err != nil {
		httpx.Redirect(w, r, web+"/dashboard/payments")
		return
	}
	httpx.Redirect(w, r, web+redirectTo)
}
