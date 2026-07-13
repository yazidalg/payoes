package email

import (
	"fmt"
	"net/smtp"
	"strings"

	"github.com/payoesteam/payoes/apps/api/internal/config"
)

type Sender struct {
	cfg config.Config
}

type DeliveryResult struct {
	Delivered bool `json:"delivered"`
	Logged    bool `json:"logged"`
}

func NewSender(cfg config.Config) *Sender {
	return &Sender{cfg: cfg}
}

func (s *Sender) Send(to, subject, htmlBody string) DeliveryResult {
	if s.cfg.SMTPHost == "" {
		return DeliveryResult{Delivered: false, Logged: true}
	}

	from := s.cfg.SMTPFrom
	msg := strings.Builder{}
	msg.WriteString("From: " + from + "\r\n")
	msg.WriteString("To: " + to + "\r\n")
	msg.WriteString("Subject: " + subject + "\r\n")
	msg.WriteString("MIME-Version: 1.0\r\n")
	msg.WriteString("Content-Type: text/html; charset=UTF-8\r\n\r\n")
	msg.WriteString(htmlBody)

	addr := fmt.Sprintf("%s:%s", s.cfg.SMTPHost, s.cfg.SMTPPort)
	var auth smtp.Auth
	if s.cfg.SMTPUser != "" {
		auth = smtp.PlainAuth("", s.cfg.SMTPUser, s.cfg.SMTPPassword, s.cfg.SMTPHost)
	}

	err := smtp.SendMail(addr, auth, extractEmail(from), []string{to}, []byte(msg.String()))
	return DeliveryResult{Delivered: err == nil, Logged: false}
}

func extractEmail(from string) string {
	if i := strings.Index(from, "<"); i >= 0 {
		if j := strings.Index(from[i:], ">"); j > 0 {
			return from[i+1 : i+j]
		}
	}
	return strings.TrimSpace(from)
}
