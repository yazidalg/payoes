package handler

import (
	"net/http"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/payoesteam/payoes/apps/api/internal/httpx"
	"github.com/payoesteam/payoes/apps/api/internal/middleware"
)

// UserHandler serves /api/user profile routes.
type UserHandler struct {
	pool *pgxpool.Pool
}

func NewUserHandler(pool *pgxpool.Pool) *UserHandler {
	return &UserHandler{pool: pool}
}

type userProfile struct {
	ID              string     `json:"id"`
	Email           string     `json:"email"`
	Name            string     `json:"name"`
	Image           *string    `json:"image"`
	AuthProvider    string     `json:"authProvider"`
	EmailVerifiedAt *time.Time `json:"emailVerifiedAt"`
	CreatedAt       time.Time  `json:"createdAt"`
	UpdatedAt       time.Time  `json:"updatedAt"`
}

// GetUser ports GET /api/user
func (h *UserHandler) GetUser(w http.ResponseWriter, r *http.Request) {
	sessionUser := middleware.UserFromContext(r.Context())
	if sessionUser == nil {
		httpx.Error(w, http.StatusUnauthorized, "Unauthorized")
		return
	}
	user, err := h.loadProfile(r, sessionUser.ID)
	if err != nil || user == nil {
		httpx.Error(w, http.StatusNotFound, "Not found")
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]any{"user": user})
}

// PatchUser ports PATCH /api/user
func (h *UserHandler) PatchUser(w http.ResponseWriter, r *http.Request) {
	sessionUser := middleware.UserFromContext(r.Context())
	if sessionUser == nil {
		httpx.Error(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	var body struct {
		Name  *string `json:"name"`
		Image *string `json:"image"`
	}
	if err := decodeBody(r, &body); err != nil {
		httpx.Error(w, http.StatusBadRequest, "Invalid request")
		return
	}
	if body.Name == nil && body.Image == nil {
		httpx.Error(w, http.StatusBadRequest, "No fields to update")
		return
	}

	existing, err := h.loadProfile(r, sessionUser.ID)
	if err != nil || existing == nil {
		httpx.Error(w, http.StatusNotFound, "Not found")
		return
	}

	name := existing.Name
	image := existing.Image
	if body.Name != nil {
		name = strings.TrimSpace(*body.Name)
		if name == "" {
			httpx.Error(w, http.StatusBadRequest, "Name is required")
			return
		}
	}
	if body.Image != nil {
		if *body.Image == "" {
			image = nil
		} else {
			image = body.Image
		}
	}

	var user userProfile
	err = h.pool.QueryRow(r.Context(), `
		UPDATE users SET name = $1, image = $2, updated_at = NOW()
		WHERE id = $3
		RETURNING id, email, name, image, auth_provider, email_verified_at, created_at, updated_at`,
		name, image, sessionUser.ID,
	).Scan(&user.ID, &user.Email, &user.Name, &user.Image, &user.AuthProvider, &user.EmailVerifiedAt, &user.CreatedAt, &user.UpdatedAt)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "Unable to update profile")
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]any{"user": user})
}

func (h *UserHandler) loadProfile(r *http.Request, userID string) (*userProfile, error) {
	var user userProfile
	err := h.pool.QueryRow(r.Context(), `
		SELECT id, email, name, image, auth_provider, email_verified_at, created_at, updated_at
		FROM users WHERE id = $1`, userID,
	).Scan(&user.ID, &user.Email, &user.Name, &user.Image, &user.AuthProvider, &user.EmailVerifiedAt, &user.CreatedAt, &user.UpdatedAt)
	if err == pgx.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &user, nil
}
