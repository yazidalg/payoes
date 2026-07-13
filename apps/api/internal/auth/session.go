package auth

import (
	"fmt"
	"net/http"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

type SessionUser struct {
	ID    string  `json:"id"`
	Email string  `json:"email"`
	Name  string  `json:"name"`
	Image *string `json:"image"`
}

type SessionManager struct {
	secret []byte
	secure bool
	webURL string
}

type sessionClaims struct {
	Email string  `json:"email"`
	Name  string  `json:"name"`
	Image *string `json:"image,omitempty"`
	jwt.RegisteredClaims
}

func NewSessionManager(secret, webURL string, secure bool) (*SessionManager, error) {
	if secret == "" {
		return nil, fmt.Errorf("AUTH_SECRET is not configured")
	}
	return &SessionManager{
		secret: []byte(secret),
		secure: secure,
		webURL: webURL,
	}, nil
}

func (s *SessionManager) Issue(user SessionUser) (string, error) {
	claims := sessionClaims{
		Email: user.Email,
		Name:  user.Name,
		Image: user.Image,
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   user.ID,
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(30 * 24 * time.Hour)),
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(s.secret)
}

func (s *SessionManager) Parse(tokenString string) (*SessionUser, error) {
	token, err := jwt.ParseWithClaims(tokenString, &sessionClaims{}, func(t *jwt.Token) (any, error) {
		if t.Method != jwt.SigningMethodHS256 {
			return nil, fmt.Errorf("unexpected signing method")
		}
		return s.secret, nil
	})
	if err != nil {
		return nil, err
	}
	claims, ok := token.Claims.(*sessionClaims)
	if !ok || !token.Valid || claims.Subject == "" {
		return nil, fmt.Errorf("invalid token")
	}
	return &SessionUser{
		ID:    claims.Subject,
		Email: claims.Email,
		Name:  claims.Name,
		Image: claims.Image,
	}, nil
}

func (s *SessionManager) SetCookie(w http.ResponseWriter, token string) {
	http.SetCookie(w, &http.Cookie{
		Name:     CookieName,
		Value:    token,
		Path:     "/",
		HttpOnly: true,
		Secure:   s.secure,
		SameSite: http.SameSiteLaxMode,
		MaxAge:   int((30 * 24 * time.Hour).Seconds()),
	})
}

func (s *SessionManager) ClearCookie(w http.ResponseWriter) {
	http.SetCookie(w, &http.Cookie{
		Name:     CookieName,
		Value:    "",
		Path:     "/",
		HttpOnly: true,
		Secure:   s.secure,
		SameSite: http.SameSiteLaxMode,
		MaxAge:   -1,
	})
}

func (s *SessionManager) UserFromRequest(r *http.Request) (*SessionUser, error) {
	cookie, err := r.Cookie(CookieName)
	if err != nil || cookie.Value == "" {
		// Also accept Authorization Bearer for API tooling.
		authHeader := r.Header.Get("Authorization")
		if len(authHeader) > 7 && authHeader[:7] == "Bearer " {
			return s.Parse(authHeader[7:])
		}
		return nil, fmt.Errorf("no session")
	}
	return s.Parse(cookie.Value)
}

func (s *SessionManager) CreatePostVerifyLoginToken(userID string) (string, error) {
	claims := jwt.MapClaims{
		"sub":     userID,
		"purpose": "email-verify-login",
		"iat":     time.Now().Unix(),
		"exp":     time.Now().Add(5 * time.Minute).Unix(),
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(s.secret)
}

func (s *SessionManager) VerifyPostVerifyLoginToken(tokenString string) (string, error) {
	token, err := jwt.Parse(tokenString, func(t *jwt.Token) (any, error) {
		if t.Method != jwt.SigningMethodHS256 {
			return nil, fmt.Errorf("unexpected signing method")
		}
		return s.secret, nil
	})
	if err != nil || !token.Valid {
		return "", fmt.Errorf("invalid token")
	}
	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		return "", fmt.Errorf("invalid claims")
	}
	if claims["purpose"] != "email-verify-login" {
		return "", fmt.Errorf("invalid purpose")
	}
	sub, _ := claims["sub"].(string)
	if sub == "" {
		return "", fmt.Errorf("missing subject")
	}
	return sub, nil
}
