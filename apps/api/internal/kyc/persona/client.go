package persona

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
)

const (
	apiURL     = "https://api.withpersona.com/api/v1"
	apiVersion = "2023-01-05"
)

// InquiryStatus mirrors apps/web/src/lib/kyc/persona.ts
type InquiryStatus string

const (
	StatusCreated     InquiryStatus = "created"
	StatusPending     InquiryStatus = "pending"
	StatusCompleted   InquiryStatus = "completed"
	StatusApproved    InquiryStatus = "approved"
	StatusDeclined    InquiryStatus = "declined"
	StatusNeedsReview InquiryStatus = "needs_review"
	StatusFailed      InquiryStatus = "failed"
	StatusExpired     InquiryStatus = "expired"
)

type Client struct {
	apiKey     string
	templateID string
	http       *http.Client
}

func NewClient(apiKey, templateID string) *Client {
	return &Client{apiKey: apiKey, templateID: templateID, http: http.DefaultClient}
}

type Inquiry struct {
	InquiryID   string
	Status      InquiryStatus
	ReferenceID *string
	Fields      map[string]struct {
		Type  string `json:"type"`
		Value any    `json:"value"`
	}
}

type inquiryResponse struct {
	Data struct {
		ID         string `json:"id"`
		Attributes struct {
			Status      InquiryStatus `json:"status"`
			ReferenceID *string       `json:"reference-id"`
			Fields      map[string]struct {
				Type  string `json:"type"`
				Value any    `json:"value"`
			} `json:"fields"`
		} `json:"attributes"`
	} `json:"data"`
	Errors []struct {
		Title  string `json:"title"`
		Detail string `json:"detail"`
	} `json:"errors"`
}

type resumeResponse struct {
	Meta *struct {
		SessionToken *string `json:"session-token"`
	} `json:"meta"`
	Errors []struct {
		Title  string `json:"title"`
		Detail string `json:"detail"`
	} `json:"errors"`
}

func (c *Client) CreateInquiry(referenceID, note string) (*Inquiry, error) {
	body := map[string]any{
		"data": map[string]any{
			"attributes": map[string]any{
				"inquiry-template-id": c.templateID,
				"reference-id":        referenceID,
				"note":                note,
			},
		},
	}
	var resp inquiryResponse
	if err := c.request("POST", "/inquiries", body, &resp); err != nil {
		return nil, err
	}
	return &Inquiry{
		InquiryID: resp.Data.ID,
		Status:    resp.Data.Attributes.Status,
	}, nil
}

func (c *Client) GetInquiry(inquiryID string) (*Inquiry, error) {
	var resp inquiryResponse
	if err := c.request("GET", "/inquiries/"+inquiryID, nil, &resp); err != nil {
		return nil, err
	}
	return &Inquiry{
		InquiryID:   resp.Data.ID,
		Status:      resp.Data.Attributes.Status,
		ReferenceID: resp.Data.Attributes.ReferenceID,
		Fields:      resp.Data.Attributes.Fields,
	}, nil
}

func (c *Client) ResumeInquiry(inquiryID string) (string, error) {
	var resp resumeResponse
	if err := c.request("POST", "/inquiries/"+inquiryID+"/resume", map[string]any{"meta": map[string]any{}}, &resp); err != nil {
		return "", err
	}
	if resp.Meta == nil || resp.Meta.SessionToken == nil || *resp.Meta.SessionToken == "" {
		return "", fmt.Errorf("Persona did not return a session token")
	}
	return *resp.Meta.SessionToken, nil
}

func (c *Client) request(method, path string, body any, dst any) error {
	if c.apiKey == "" {
		return fmt.Errorf("PERSONA_API_KEY is not configured")
	}
	if c.templateID == "" {
		return fmt.Errorf("PERSONA_INQUIRY_TEMPLATE_ID is not configured")
	}

	var reader io.Reader
	if body != nil {
		raw, err := json.Marshal(body)
		if err != nil {
			return err
		}
		reader = bytes.NewReader(raw)
	}

	req, err := http.NewRequest(method, apiURL+path, reader)
	if err != nil {
		return err
	}
	req.Header.Set("Authorization", "Bearer "+c.apiKey)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Persona-Version", apiVersion)

	res, err := c.http.Do(req)
	if err != nil {
		return err
	}
	defer res.Body.Close()

	raw, err := io.ReadAll(res.Body)
	if err != nil {
		return err
	}
	if err := json.Unmarshal(raw, dst); err != nil {
		return err
	}

	if res.StatusCode >= 400 {
		var errBody struct {
			Errors []struct {
				Title  string `json:"title"`
				Detail string `json:"detail"`
			} `json:"errors"`
		}
		_ = json.Unmarshal(raw, &errBody)
		parts := make([]string, 0, len(errBody.Errors))
		for _, e := range errBody.Errors {
			if e.Detail != "" {
				parts = append(parts, e.Detail)
			} else if e.Title != "" {
				parts = append(parts, e.Title)
			}
		}
		msg := strings.Join(parts, "; ")
		if msg == "" {
			msg = fmt.Sprintf("Persona API request failed (%d)", res.StatusCode)
		}
		return fmt.Errorf("%s", msg)
	}
	return nil
}

func MapProviderStatus(status InquiryStatus) string {
	switch status {
	case StatusApproved, StatusCompleted:
		return "approved"
	case StatusDeclined, StatusFailed, StatusExpired:
		return "declined"
	case StatusNeedsReview:
		return "needs_review"
	case StatusPending:
		return "pending"
	default:
		return "created"
	}
}

func MapVerificationStatus(status InquiryStatus) string {
	provider := MapProviderStatus(status)
	switch provider {
	case "approved":
		return "verified"
	case "declined":
		return "rejected"
	case "pending", "needs_review":
		return "pending"
	default:
		return "unverified"
	}
}

func NeedsSessionToken(status InquiryStatus) bool {
	return status == StatusPending || status == StatusNeedsReview || status == StatusExpired
}

func MustBeReplaced(status InquiryStatus) bool {
	return status == StatusDeclined || status == StatusFailed
}

func ExtractProfile(fields map[string]struct {
	Type  string `json:"type"`
	Value any    `json:"value"`
}) (displayName, country *string) {
	if fields == nil {
		return nil, nil
	}
	read := func(key string) *string {
		v, ok := fields[key]
		if !ok {
			return nil
		}
		s, ok := v.Value.(string)
		if !ok || strings.TrimSpace(s) == "" {
			return nil
		}
		t := strings.TrimSpace(s)
		return &t
	}
	first := read("name-first")
	last := read("name-last")
	full := read("name-full")
	if full == nil {
		full = read("full-name")
	}
	if full == nil && (first != nil || last != nil) {
		parts := make([]string, 0, 2)
		if first != nil {
			parts = append(parts, *first)
		}
		if last != nil {
			parts = append(parts, *last)
		}
		joined := strings.Join(parts, " ")
		if joined != "" {
			full = &joined
		}
	}
	countryVal := read("address-country-code")
	if countryVal == nil {
		countryVal = read("selected-country-code")
	}
	if countryVal == nil {
		countryVal = read("country-code")
	}
	if countryVal == nil {
		countryVal = read("country")
	}
	return full, countryVal
}
