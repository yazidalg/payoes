// Package pricing ports apps/web/src/lib/pricing/quotes.ts.
package pricing

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"os"
	"strconv"
	"strings"
	"sync"
	"time"
)

const (
	DefaultSlippageBPS           = 50
	RateCacheTTL                 = 60 * time.Second
	DefaultInvoiceQuoteTTLMinutes = 15
)

var (
	stablecoinFiatMap = map[string]string{
		"USDC": "USD",
		"PYUSD": "USD",
		"EURC": "EUR",
		"AUDD": "AUD",
		"NGNC": "USD",
	}
	assetToCoinGecko = map[string]string{
		"XLM":  "stellar",
		"USDC": "usd-coin",
		"EURC": "euro-coin",
		"PYUSD": "paypal-usd",
		"AUDD": "novatti-australian-digital-dollar",
	}
)

type AllowedAsset struct {
	AssetCode     string  `json:"asset_code"`
	IssuerAddress *string `json:"issuer_address"`
}

type Quote struct {
	PricingAmount       string       `json:"pricing_amount"`
	PricingCurrency     string       `json:"pricing_currency"`
	PaidAsset           AllowedAsset `json:"paid_asset"`
	PaidAmount          string       `json:"paid_amount"`
	SettlementAsset     AllowedAsset `json:"settlement_asset"`
	SettlementAmount    string       `json:"settlement_amount"`
	Rate                string       `json:"rate"`
	SettlementQuoteRate string       `json:"settlement_quote_rate"`
	RequiresPathPayment bool         `json:"requires_path_payment"`
	ExpiresAt           time.Time    `json:"expires_at"`
}

type rateCacheEntry struct {
	expiresAt time.Time
	rates     map[string]float64
}

var (
	rateCache   = map[string]rateCacheEntry{}
	rateCacheMu sync.Mutex
)

func quoteTTLMinutes(configured int) int {
	if configured > 0 {
		return configured
	}
	return DefaultInvoiceQuoteTTLMinutes
}

func NormalizeStellarAmount(amount string) string {
	parts := strings.Split(strings.TrimSpace(amount), ".")
	whole := "0"
	frac := ""
	if len(parts) > 0 && parts[0] != "" {
		whole = parts[0]
	}
	if len(parts) > 1 {
		frac = parts[1]
	}
	frac = (frac + "0000000")[:7]
	return whole + "." + frac
}

func AssetsMatch(left, right AllowedAsset) bool {
	leftIssuer := ""
	rightIssuer := ""
	if left.IssuerAddress != nil {
		leftIssuer = strings.TrimSpace(*left.IssuerAddress)
	}
	if right.IssuerAddress != nil {
		rightIssuer = strings.TrimSpace(*right.IssuerAddress)
	}
	return left.AssetCode == right.AssetCode && leftIssuer == rightIssuer
}

func IsQuoteExpired(expiresAt *time.Time) bool {
	return expiresAt != nil && !expiresAt.After(time.Now())
}

func AmountsWithinSlippage(expected, actual string, slippageBPS int) bool {
	if slippageBPS <= 0 {
		slippageBPS = DefaultSlippageBPS
	}
	exp, err1 := strconv.ParseFloat(expected, 64)
	act, err2 := strconv.ParseFloat(actual, 64)
	if err1 != nil || err2 != nil {
		return false
	}
	if exp == 0 {
		return act == 0
	}
	diff := (act - exp) / exp
	if diff < 0 {
		diff = -diff
	}
	return diff <= float64(slippageBPS)/10_000
}

func ApplySendMaxBuffer(amount string, slippageBPS int) (string, error) {
	if slippageBPS <= 0 {
		slippageBPS = DefaultSlippageBPS
	}
	numeric, err := strconv.ParseFloat(amount, 64)
	if err != nil || numeric <= 0 {
		return "", fmt.Errorf("Invalid amount for send max buffer")
	}
	buffered := numeric * (1 + float64(slippageBPS)/10_000)
	return NormalizeStellarAmount(fmt.Sprintf("%.7f", buffered)), nil
}

func BuildPaymentQuote(pricingAmount, pricingCurrency string, paidAsset, settlementAsset AllowedAsset, ttlMinutes int) (*Quote, error) {
	invoiceTotal, err := strconv.ParseFloat(pricingAmount, 64)
	if err != nil || invoiceTotal <= 0 {
		return nil, fmt.Errorf("Invalid invoice amount for quote")
	}

	assetPriceInFiat, err := fetchAssetPriceInFiat(paidAsset.AssetCode, pricingCurrency)
	if err != nil {
		return nil, err
	}
	paidAmount := NormalizeStellarAmount(fmt.Sprintf("%.7f", invoiceTotal/assetPriceInFiat))

	invoiceUSD, err := getInvoiceUSDValue(pricingAmount, pricingCurrency)
	if err != nil {
		return nil, err
	}
	paidAssetUSD, err := fetchAssetPriceInFiat(paidAsset.AssetCode, "USD")
	if err != nil {
		return nil, err
	}
	if err := assertQuoteUSDValue(invoiceUSD, paidAmount, paidAssetUSD); err != nil {
		return nil, err
	}

	settlementAmount := paidAmount
	if !AssetsMatch(paidAsset, settlementAsset) {
		settlementPrice, err := fetchAssetPriceInFiat(settlementAsset.AssetCode, pricingCurrency)
		if err != nil {
			return nil, err
		}
		settlementAmount = NormalizeStellarAmount(fmt.Sprintf("%.7f", invoiceTotal/settlementPrice))
	}

	paidNumeric, _ := strconv.ParseFloat(paidAmount, 64)
	settlementNumeric, _ := strconv.ParseFloat(settlementAmount, 64)
	settlementQuoteRate := "0"
	if paidNumeric > 0 {
		settlementQuoteRate = fmt.Sprintf("%.7f", settlementNumeric/paidNumeric)
	}

	return &Quote{
		PricingAmount:       pricingAmount,
		PricingCurrency:     pricingCurrency,
		PaidAsset:           paidAsset,
		PaidAmount:          paidAmount,
		SettlementAsset:     settlementAsset,
		SettlementAmount:    settlementAmount,
		Rate:                strconv.FormatFloat(assetPriceInFiat, 'f', -1, 64),
		SettlementQuoteRate: settlementQuoteRate,
		RequiresPathPayment: !AssetsMatch(paidAsset, settlementAsset),
		ExpiresAt:           time.Now().Add(time.Duration(quoteTTLMinutes(ttlMinutes)) * time.Minute),
	}, nil
}

func assertQuoteUSDValue(invoiceUSD float64, paidAmount string, paidAssetUSD float64) error {
	paidNumeric, err := strconv.ParseFloat(paidAmount, 64)
	if err != nil || paidNumeric <= 0 {
		return fmt.Errorf("Invalid quoted paid amount")
	}
	ratio := (paidNumeric * paidAssetUSD) / invoiceUSD
	if ratio < 0.5 || ratio > 2 {
		return fmt.Errorf("Unable to build a reliable quote for this currency pair. Please try again.")
	}
	return nil
}

func getInvoiceUSDValue(amount, currency string) (float64, error) {
	numeric, err := strconv.ParseFloat(amount, 64)
	if err != nil || numeric <= 0 {
		return 0, fmt.Errorf("Invalid invoice amount for quote")
	}
	fiatPerUSD, err := getFiatPerUSD(currency)
	if err != nil {
		return 0, err
	}
	return numeric / fiatPerUSD, nil
}

func getFiatPerUSD(fiatCurrency string) (float64, error) {
	if fiatCurrency == "USD" {
		return 1, nil
	}
	return fetchFiatPerUSD(fiatCurrency)
}

func fetchFiatPerUSD(fiatCurrency string) (float64, error) {
	cacheKey := "fiat:" + fiatCurrency
	rateCacheMu.Lock()
	if cached, ok := rateCache[cacheKey]; ok && cached.expiresAt.After(time.Now()) {
		rateCacheMu.Unlock()
		return cached.rates["usd"], nil
	}
	rateCacheMu.Unlock()

	vs := strings.ToLower(fiatCurrency)
	u, _ := url.Parse("https://api.coingecko.com/api/v3/simple/price")
	q := u.Query()
	q.Set("ids", "usd-coin")
	q.Set("vs_currencies", vs)
	u.RawQuery = q.Encode()

	data, err := coinGeckoGet(u.String())
	if err != nil {
		return 0, fmt.Errorf("Unable to fetch fiat exchange rates")
	}
	fiatPerUSD, ok := data["usd-coin"][vs]
	if !ok || fiatPerUSD <= 0 {
		return 0, fmt.Errorf("Exchange rate unavailable for %s", fiatCurrency)
	}

	rateCacheMu.Lock()
	rateCache[cacheKey] = rateCacheEntry{
		expiresAt: time.Now().Add(RateCacheTTL),
		rates:     map[string]float64{"usd": fiatPerUSD},
	}
	rateCacheMu.Unlock()
	return fiatPerUSD, nil
}

func fetchAssetPriceInFiat(assetCode, fiatCurrency string) (float64, error) {
	if pegged, ok := stablecoinFiatMap[assetCode]; ok {
		peggedPerUSD, err := getFiatPerUSD(pegged)
		if err != nil {
			return 0, err
		}
		targetPerUSD, err := getFiatPerUSD(fiatCurrency)
		if err != nil {
			return 0, err
		}
		price := targetPerUSD / peggedPerUSD
		if price <= 0 {
			return 0, fmt.Errorf("Exchange rate unavailable for %s", assetCode)
		}
		if price < 0.01 {
			return 0, fmt.Errorf("Exchange rate out of acceptable range for %s", assetCode)
		}
		return price, nil
	}

	cacheKey := "asset:" + assetCode + ":" + fiatCurrency
	rateCacheMu.Lock()
	if cached, ok := rateCache[cacheKey]; ok && cached.expiresAt.After(time.Now()) {
		rateCacheMu.Unlock()
		return cached.rates["price"], nil
	}
	rateCacheMu.Unlock()

	coinID, ok := assetToCoinGecko[assetCode]
	if !ok {
		return 0, fmt.Errorf("Pricing is not available for %s", assetCode)
	}
	vs := strings.ToLower(fiatCurrency)
	u, _ := url.Parse("https://api.coingecko.com/api/v3/simple/price")
	q := u.Query()
	q.Set("ids", coinID)
	q.Set("vs_currencies", vs)
	u.RawQuery = q.Encode()

	data, err := coinGeckoGet(u.String())
	if err != nil {
		return 0, fmt.Errorf("Unable to fetch asset prices")
	}
	price, ok := data[coinID][vs]
	if !ok || price <= 0 {
		return 0, fmt.Errorf("Price unavailable for %s", assetCode)
	}

	rateCacheMu.Lock()
	rateCache[cacheKey] = rateCacheEntry{
		expiresAt: time.Now().Add(RateCacheTTL),
		rates:     map[string]float64{"price": price},
	}
	rateCacheMu.Unlock()
	return price, nil
}

func coinGeckoGet(rawURL string) (map[string]map[string]float64, error) {
	req, err := http.NewRequest(http.MethodGet, rawURL, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Accept", "application/json")
	if key := strings.TrimSpace(os.Getenv("COINGECKO_API_KEY")); key != "" {
		req.Header.Set("x-cg-demo-api-key", key)
	}
	client := &http.Client{Timeout: 15 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return nil, fmt.Errorf("coingecko status %d", resp.StatusCode)
	}
	var data map[string]map[string]float64
	if err := json.NewDecoder(resp.Body).Decode(&data); err != nil {
		return nil, err
	}
	return data, nil
}
