package organizations

import "time"

// OrganizationJSON matches the dashboard Organization type (camelCase).
type OrganizationJSON struct {
	ID                    string     `json:"id"`
	Name                  string     `json:"name"`
	Email                 string     `json:"email"`
	Website               *string    `json:"website"`
	Description           *string    `json:"description"`
	LogoURL               *string    `json:"logoUrl"`
	LogoInitials          string     `json:"logoInitials"`
	Slug                  string     `json:"slug"`
	Environment           string     `json:"environment"`
	VerificationStatus    string     `json:"verificationStatus"`
	VerifiedAt            *time.Time `json:"verifiedAt"`
	VerificationExpiresAt *time.Time `json:"verificationExpiresAt"`
	CreatedAt             time.Time  `json:"createdAt"`
	UpdatedAt             time.Time  `json:"updatedAt"`
}

func SerializeOrganization(org Organization) OrganizationJSON {
	return OrganizationJSON{
		ID:                    org.ID,
		Name:                  org.Name,
		Email:                 org.Email,
		Website:               org.Website,
		Description:           org.Description,
		LogoURL:               org.LogoURL,
		LogoInitials:          org.LogoInitials,
		Slug:                  org.Slug,
		Environment:           org.Environment,
		VerificationStatus:    org.VerificationStatus,
		VerifiedAt:            org.VerifiedAt,
		VerificationExpiresAt: org.VerificationExpiresAt,
		CreatedAt:             org.CreatedAt,
		UpdatedAt:             org.UpdatedAt,
	}
}
