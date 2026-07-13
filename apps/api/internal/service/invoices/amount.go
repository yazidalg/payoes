package invoices

import (
	"fmt"
	"math"
	"regexp"
	"strconv"
	"strings"
)

// ported from: apps/web/src/lib/invoices/amount.ts and currencies.ts

const defaultInvoiceCurrencyCode = "USD"
const defaultInvoiceDueDays = 30
const minPaymentExpiryMinutes = 5
const placeholderPricingPaymentAmount = "0.0000001"

type LineItemInput struct {
	Description string
	Quantity    string
	UnitAmount  string
}

var zeroDecimalCurrencies = map[string]bool{
	"BIF": true, "CLP": true, "DJF": true, "GNF": true, "ISK": true, "JPY": true,
	"KMF": true, "KRW": true, "PYG": true, "RWF": true, "UGX": true, "VND": true,
	"VUV": true, "XAF": true, "XOF": true, "XPF": true,
}

var threeDecimalCurrencies = map[string]bool{
	"BHD": true, "IQD": true, "JOD": true, "KWD": true, "LYD": true, "OMR": true, "TND": true,
}

func currencyDecimals(code string) int {
	if zeroDecimalCurrencies[code] {
		return 0
	}
	if threeDecimalCurrencies[code] {
		return 3
	}
	return 2
}

func isInvoiceCurrencyCode(code string) bool {
	if len(code) != 3 {
		return false
	}
	for _, r := range code {
		if r < 'A' || r > 'Z' {
			return false
		}
	}
	return true
}

func ResolveCurrencyCode(code string) string {
	normalized := strings.ToUpper(strings.TrimSpace(code))
	if isInvoiceCurrencyCode(normalized) {
		return normalized
	}
	return defaultInvoiceCurrencyCode
}

func fiatAmountPattern(currencyCode string) *regexp.Regexp {
	decimals := currencyDecimals(currencyCode)
	if decimals == 0 {
		return regexp.MustCompile(`^\d+$`)
	}
	return regexp.MustCompile(fmt.Sprintf(`^\d+(\.\d{1,%d})?$`, decimals))
}

func ParseFiatAmount(value, currencyCode string) (string, error) {
	if !isInvoiceCurrencyCode(currencyCode) {
		return "", fmt.Errorf("Unsupported invoice currency")
	}
	normalized := strings.ReplaceAll(strings.TrimSpace(value), ",", "")
	if normalized == "" {
		return "", fmt.Errorf("Amount is required")
	}
	if !fiatAmountPattern(currencyCode).MatchString(normalized) {
		decimals := currencyDecimals(currencyCode)
		if decimals == 0 {
			return "", fmt.Errorf("%s amounts must be whole numbers", currencyCode)
		}
		return "", fmt.Errorf("%s amounts support up to %d decimal places", currencyCode, decimals)
	}
	numeric, err := strconv.ParseFloat(normalized, 64)
	if err != nil || math.IsNaN(numeric) || numeric < 0 {
		return "", fmt.Errorf("Amount must be a valid number")
	}
	decimals := currencyDecimals(currencyCode)
	if decimals == 0 {
		return strconv.FormatInt(int64(math.Round(numeric)), 10), nil
	}
	return strconv.FormatFloat(numeric, 'f', decimals, 64), nil
}

func LineItemAmount(item LineItemInput, currencyCode string) (string, error) {
	quantity, err := strconv.ParseFloat(strings.TrimSpace(item.Quantity), 64)
	if err != nil || quantity <= 0 || math.IsNaN(quantity) || math.IsInf(quantity, 0) {
		return "", fmt.Errorf("Item quantity must be greater than zero")
	}
	unit, err := ParseFiatAmount(item.UnitAmount, currencyCode)
	if err != nil {
		return "", err
	}
	unitNum, _ := strconv.ParseFloat(unit, 64)
	lineTotal := quantity * unitNum
	decimals := currencyDecimals(currencyCode)
	if decimals == 0 {
		return strconv.FormatInt(int64(math.Round(lineTotal)), 10), nil
	}
	return strconv.FormatFloat(lineTotal, 'f', decimals, 64), nil
}

func CalculateTotal(items []LineItemInput, currencyCode string) (string, error) {
	if len(items) == 0 {
		return "", fmt.Errorf("Add at least one invoice item")
	}
	if !isInvoiceCurrencyCode(currencyCode) {
		return "", fmt.Errorf("Unsupported invoice currency")
	}
	var total float64
	for _, item := range items {
		quantity, err := strconv.ParseFloat(strings.TrimSpace(item.Quantity), 64)
		if err != nil {
			return "", fmt.Errorf("Item quantity must be greater than zero")
		}
		unit, err := ParseFiatAmount(item.UnitAmount, currencyCode)
		if err != nil {
			return "", err
		}
		unitNum, _ := strconv.ParseFloat(unit, 64)
		total += quantity * unitNum
	}
	if math.IsNaN(total) || math.IsInf(total, 0) || total <= 0 {
		return "", fmt.Errorf("Invoice total must be greater than zero")
	}
	decimals := currencyDecimals(currencyCode)
	if decimals == 0 {
		return strconv.FormatInt(int64(math.Round(total)), 10), nil
	}
	return strconv.FormatFloat(total, 'f', decimals, 64), nil
}
