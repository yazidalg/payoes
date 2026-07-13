package email

import (
	"fmt"
	"html"
	"strings"
	"time"
)

const defaultSupportURL = "https://payoes.com"

// DefaultWordmarkURL builds {webURL}/logo-full.png (logo served by the web app).
func DefaultWordmarkURL(webURL string) string {
	return strings.TrimRight(strings.TrimSpace(webURL), "/") + "/logo-full.png"
}

func htmlEscape(value string) string {
	return html.EscapeString(value)
}

func stripURLScheme(rawURL string) string {
	trimmed := strings.TrimSpace(rawURL)
	trimmed = strings.TrimPrefix(trimmed, "https://")
	trimmed = strings.TrimPrefix(trimmed, "http://")
	return trimmed
}

func formatFiatDisplay(amount, currencyCode string) string {
	code := strings.ToUpper(strings.TrimSpace(currencyCode))
	switch code {
	case "USD":
		return "$" + amount
	case "EUR":
		return "€" + amount
	case "GBP":
		return "£" + amount
	case "IDR":
		return "Rp" + amount
	default:
		if code == "" {
			return amount
		}
		return amount + " " + code
	}
}

func FormatDueDateLabel(dueAt *time.Time) string {
	if dueAt == nil {
		return "N/A"
	}
	return dueAt.UTC().Format("January 2, 2006")
}

func emailShell(preview, recipientEmail, wordmarkURL, body string) string {
	if wordmarkURL == "" {
		wordmarkURL = DefaultWordmarkURL("http://localhost:3000")
	}
	return fmt.Sprintf(`<!DOCTYPE html>
<html lang="en">
<head>
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>%s</title>
</head>
<body style="margin:0;padding:0;background-color:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
<span style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">%s</span>
<table role="presentation" width="100%%" cellspacing="0" cellpadding="0" style="background-color:#ffffff;">
<tr>
<td align="center" style="padding:40px 16px;">
<table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width:600px;width:100%%;border:1px solid #e5e5e5;border-radius:4px;padding:20px 40px;">
<tr>
<td style="padding-top:32px;padding-bottom:8px;">
<img src="%s" height="32" alt="Payoes" style="display:block;border:0;outline:none;text-decoration:none;" />
</td>
</tr>
<tr>
<td style="color:#000000;font-size:14px;line-height:24px;">
%s
</td>
</tr>
<tr>
<td style="padding-top:24px;">
<hr style="border:none;border-top:1px solid #e5e5e5;margin:24px 0;" />
<p style="margin:0 0 12px;font-size:12px;line-height:24px;color:#737373;">
This email was intended for <span style="color:#000000;">%s</span>.
If you were not expecting this email, you can ignore it. If you are concerned about your account safety, please
<a href="%s" style="color:#404040;text-decoration:underline;">contact support</a>.
</p>
<p style="margin:0;font-size:12px;color:#737373;">Payoes</p>
</td>
</tr>
</table>
</td>
</tr>
</table>
</body>
</html>`,
		htmlEscape(preview),
		htmlEscape(preview),
		htmlEscape(wordmarkURL),
		body,
		htmlEscape(recipientEmail),
		htmlEscape(defaultSupportURL),
	)
}

func emailButton(href, label string) string {
	return fmt.Sprintf(`<table role="presentation" cellspacing="0" cellpadding="0" style="margin:32px 0;">
<tr>
<td style="border-radius:8px;background-color:#054fbf;">
<a href="%s" style="display:inline-block;padding:12px 24px;font-size:12px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;">%s</a>
</td>
</tr>
</table>`,
		htmlEscape(href),
		htmlEscape(label),
	)
}

func emailURLFallback(rawURL string) string {
	return fmt.Sprintf(`<p style="margin:0 0 8px;font-size:14px;line-height:24px;color:#000000;">or copy and paste this URL into your browser:</p>
<p style="margin:0 0 16px;max-width:384px;word-break:break-word;font-size:14px;line-height:24px;font-weight:500;color:#9333ea;">%s</p>`,
		htmlEscape(stripURLScheme(rawURL)),
	)
}

type VerificationEmail struct {
	Email          string
	Name           string
	URL            string
	ExpiresInHours int
	WordmarkURL    string
}

func VerificationHTML(input VerificationEmail) string {
	body := fmt.Sprintf(`<h1 style="margin:28px 0;font-size:20px;font-weight:500;color:#000000;">Verify your email address</h1>
<p style="margin:0 0 16px;font-size:14px;line-height:24px;color:#000000;">Hi %s,</p>
<p style="margin:0 0 16px;font-size:14px;line-height:24px;color:#000000;">Thanks for signing up for Payoes. Click the button below to verify your email and continue setting up your organization.</p>
%s
%s
<p style="margin:0;font-size:14px;line-height:24px;color:#000000;">This link expires in %d hours.</p>`,
		htmlEscape(input.Name),
		emailButton(input.URL, "Verify email"),
		emailURLFallback(input.URL),
		input.ExpiresInHours,
	)
	return emailShell("Verify your Payoes email", input.Email, input.WordmarkURL, body)
}

type OrganizationInviteEmail struct {
	Email            string
	OrganizationName string
	Role             string
	InviterName      string
	InviterEmail     string
	InviteURL        string
	ExpiresLabel     string
	WordmarkURL      string
}

func OrganizationInviteHTML(input OrganizationInviteEmail) string {
	roleLabel := "Member"
	if input.Role == "admin" {
		roleLabel = "Admin"
	}

	var intro string
	if strings.TrimSpace(input.InviterName) != "" && strings.TrimSpace(input.InviterEmail) != "" {
		intro = fmt.Sprintf(`<p style="margin:0 0 16px;font-size:14px;line-height:24px;color:#000000;"><strong>%s</strong> (<a href="mailto:%s" style="color:#2563eb;text-decoration:none;">%s</a>) invited you to join <strong>%s</strong> on Payoes as <strong>%s</strong>.</p>`,
			htmlEscape(input.InviterName),
			htmlEscape(input.InviterEmail),
			htmlEscape(input.InviterEmail),
			htmlEscape(input.OrganizationName),
			htmlEscape(roleLabel),
		)
	} else {
		intro = fmt.Sprintf(`<p style="margin:0 0 16px;font-size:14px;line-height:24px;color:#000000;">You have been invited to join <strong>%s</strong> on Payoes as <strong>%s</strong>.</p>`,
			htmlEscape(input.OrganizationName),
			htmlEscape(roleLabel),
		)
	}

	body := fmt.Sprintf(`<h1 style="margin:28px 0;font-size:20px;font-weight:500;color:#000000;">Join %s on Payoes</h1>
%s
%s
%s
<p style="margin:0;font-size:14px;line-height:24px;color:#000000;">This invitation expires on %s.</p>`,
		htmlEscape(input.OrganizationName),
		intro,
		emailButton(input.InviteURL, "Accept invitation"),
		emailURLFallback(input.InviteURL),
		htmlEscape(input.ExpiresLabel),
	)
	preview := "Join " + input.OrganizationName + " on Payoes"
	return emailShell(preview, input.Email, input.WordmarkURL, body)
}

type InvoiceEmailItem struct {
	Description string
	Quantity    string
	UnitAmount  string
	LineAmount  string
}

type InvoiceEmail struct {
	Email            string
	InvoiceNumber    string
	AmountDue        string
	CurrencyCode     string
	DueDateLabel     string
	OrganizationName string
	CustomerName     string
	Description      string
	Items            []InvoiceEmailItem
	PayURL           string
	EnvironmentLabel string
	WordmarkURL      string
}

func InvoiceHTML(input InvoiceEmail) string {
	amountDue := formatFiatDisplay(input.AmountDue, input.CurrencyCode)
	envSuffix := ""
	if strings.TrimSpace(input.EnvironmentLabel) != "" {
		envSuffix = fmt.Sprintf(" (%s)", htmlEscape(input.EnvironmentLabel))
	}

	greeting := "Hi,"
	if strings.TrimSpace(input.CustomerName) != "" {
		greeting = "Hi " + htmlEscape(input.CustomerName) + ","
	}

	memo := ""
	if strings.TrimSpace(input.Description) != "" {
		memo = " Memo: " + htmlEscape(input.Description) + "."
	}

	rows := strings.Builder{}
	for _, item := range input.Items {
		rows.WriteString(fmt.Sprintf(`<tr>
<td style="border-bottom:1px solid #e5e5e5;padding:12px 8px 12px 0;color:#000000;">%s</td>
<td style="border-bottom:1px solid #e5e5e5;padding:12px 8px;text-align:right;color:#000000;">%s</td>
<td style="border-bottom:1px solid #e5e5e5;padding:12px 8px;text-align:right;color:#000000;">%s</td>
<td style="border-bottom:1px solid #e5e5e5;padding:12px 0 12px 8px;text-align:right;color:#000000;">%s</td>
</tr>`,
			htmlEscape(item.Description),
			htmlEscape(item.Quantity),
			htmlEscape(formatFiatDisplay(item.UnitAmount, input.CurrencyCode)),
			htmlEscape(formatFiatDisplay(item.LineAmount, input.CurrencyCode)),
		))
	}

	paySection := ""
	if strings.TrimSpace(input.PayURL) != "" {
		paySection = emailButton(input.PayURL, "Pay invoice")
	}

	body := fmt.Sprintf(`<p style="margin:32px 0 8px;font-size:13px;line-height:20px;letter-spacing:0.08em;text-transform:uppercase;color:#737373;">Invoice from %s%s</p>
<h1 style="margin:8px 0;font-size:28px;font-weight:500;color:#000000;">%s due</h1>
<p style="margin:0 0 24px;font-size:14px;line-height:24px;color:#525252;">Invoice %s · Due %s</p>
<p style="margin:0 0 16px;font-size:14px;line-height:24px;color:#000000;">%s</p>
<p style="margin:0 0 24px;font-size:14px;line-height:24px;color:#000000;">%s sent you an invoice for %s.%s</p>
<table role="presentation" width="100%%" cellspacing="0" cellpadding="0" style="margin:24px 0;border-collapse:collapse;font-size:14px;color:#000000;">
<thead>
<tr>
<th style="border-bottom:1px solid #e5e5e5;padding-bottom:8px;text-align:left;font-weight:600;color:#737373;">Description</th>
<th style="border-bottom:1px solid #e5e5e5;padding-bottom:8px;text-align:right;font-weight:600;color:#737373;">Qty</th>
<th style="border-bottom:1px solid #e5e5e5;padding-bottom:8px;text-align:right;font-weight:600;color:#737373;">Unit price</th>
<th style="border-bottom:1px solid #e5e5e5;padding-bottom:8px;text-align:right;font-weight:600;color:#737373;">Amount</th>
</tr>
</thead>
<tbody>
%s
</tbody>
</table>
<p style="margin:0 0 24px;text-align:right;font-size:15px;font-weight:600;color:#000000;">Total due: %s</p>
%s`,
		htmlEscape(input.OrganizationName),
		envSuffix,
		htmlEscape(amountDue),
		htmlEscape(input.InvoiceNumber),
		htmlEscape(input.DueDateLabel),
		greeting,
		htmlEscape(input.OrganizationName),
		htmlEscape(amountDue),
		memo,
		rows.String(),
		htmlEscape(amountDue),
		paySection,
	)

	preview := fmt.Sprintf("Invoice %s from %s", input.InvoiceNumber, input.OrganizationName)
	return emailShell(preview, input.Email, input.WordmarkURL, body)
}
