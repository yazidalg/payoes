package analytics

import (
	"context"
	"math"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

// ported from: apps/web/src/lib/analytics/service.ts

type paymentRow struct {
	ID                     string
	Status                 string
	SourceType             string
	PricingAmount          *string
	PricingCurrency        *string
	QuotedSettlementAmount *string
	PaidAsset              *string
	SettlementAsset        string
	CustomerID             *string
	ConfirmedAt            *time.Time
	CreatedAt              time.Time
}

type BreakdownItem struct {
	Key   string  `json:"key"`
	Label string  `json:"label"`
	Value float64 `json:"value"`
}

type TimeseriesPoint struct {
	Date        string  `json:"date"`
	Volume      float64 `json:"volume"`
	Payments    int     `json:"payments"`
	SuccessRate float64 `json:"successRate"`
}

type DashboardAnalytics struct {
	Totals struct {
		Volume      float64 `json:"volume"`
		Payments    int     `json:"payments"`
		SuccessRate float64 `json:"successRate"`
	} `json:"totals"`
	Timeseries []TimeseriesPoint `json:"timeseries"`
	Breakdowns struct {
		PaymentMethods []BreakdownItem `json:"paymentMethods"`
		Assets         []BreakdownItem `json:"assets"`
		Status         []BreakdownItem `json:"status"`
		Customers      []BreakdownItem `json:"customers"`
	} `json:"breakdowns"`
}

type Service struct {
	pool *pgxpool.Pool
}

func NewService(pool *pgxpool.Pool) *Service {
	return &Service{pool: pool}
}

var sourceTypeLabels = map[string]string{
	"checkout_session": "Checkout Sessions",
	"invoice":          "Invoices",
	"payment_link":     "Payment Links",
	"direct":           "Manual",
}

var statusLabels = map[string]string{
	"completed":         "Succeeded",
	"pending":           "Pending",
	"deposit_received":  "Processing",
	"settling":          "Processing",
	"settlement_failed": "Settlement failed",
	"refunding":         "Refunding",
	"refunded":          "Refunded",
	"failed":            "Failed",
	"expired":           "Expired",
}

var sourceTypeOrder = []string{"checkout_session", "invoice", "payment_link", "direct"}
var statusOrder = []string{"completed", "pending", "failed", "expired"}

func aggregatePaymentStatus(status string) string {
	switch status {
	case "deposit_received", "settling", "refunding":
		return "pending"
	case "settlement_failed", "refunded":
		return "failed"
	default:
		return status
	}
}

func parseAmount(value *string) float64 {
	if value == nil || *value == "" {
		return 0
	}
	n, err := strconv.ParseFloat(*value, 64)
	if err != nil || math.IsInf(n, 0) || math.IsNaN(n) {
		return 0
	}
	return n
}

func getPaymentVolume(p paymentRow) float64 {
	if p.Status != "completed" {
		return 0
	}
	currency := ""
	if p.PricingCurrency != nil {
		currency = strings.ToUpper(strings.TrimSpace(*p.PricingCurrency))
	}
	if p.PricingAmount != nil && (currency == "" || currency == "USD") {
		return parseAmount(p.PricingAmount)
	}
	return parseAmount(p.QuotedSettlementAmount)
}

func getPaymentAsset(p paymentRow) string {
	if p.PaidAsset != nil {
		if trimmed := strings.TrimSpace(*p.PaidAsset); trimmed != "" {
			return trimmed
		}
	}
	if trimmed := strings.TrimSpace(p.SettlementAsset); trimmed != "" {
		return trimmed
	}
	return "Unknown"
}

func calculateSuccessRate(completed, failed, expired int) float64 {
	finalized := completed + failed + expired
	if finalized == 0 {
		return 0
	}
	return math.Round(float64(completed)/float64(finalized)*1000) / 10
}

func startOfDay(t time.Time) time.Time {
	y, m, d := t.In(time.Local).Date()
	return time.Date(y, m, d, 0, 0, 0, 0, time.Local)
}

func endOfDay(t time.Time) time.Time {
	y, m, d := t.In(time.Local).Date()
	return time.Date(y, m, d, 23, 59, 59, 999999999, time.Local)
}

func dateKey(t time.Time) string {
	return startOfDay(t).Format("2006-01-02")
}

type labeledValue struct {
	label string
	value float64
}

func buildBreakdown(items map[string]labeledValue, order []string) []BreakdownItem {
	type entry struct {
		key   string
		label string
		value float64
	}
	sorted := make([]entry, 0, len(items))
	for k, v := range items {
		sorted = append(sorted, entry{key: k, label: v.label, value: v.value})
	}
	sort.Slice(sorted, func(i, j int) bool {
		return sorted[i].value > sorted[j].value
	})

	if order == nil {
		out := make([]BreakdownItem, 0, len(sorted))
		for _, e := range sorted {
			out = append(out, BreakdownItem{Key: e.key, Label: e.label, Value: e.value})
		}
		return out
	}

	have := make(map[string]bool, len(items))
	for k := range items {
		have[k] = true
	}
	orderedKeys := make([]string, 0, len(items))
	for _, k := range order {
		if have[k] {
			orderedKeys = append(orderedKeys, k)
		}
	}
	for _, e := range sorted {
		found := false
		for _, k := range orderedKeys {
			if k == e.key {
				found = true
				break
			}
		}
		if !found {
			orderedKeys = append(orderedKeys, e.key)
		}
	}

	out := make([]BreakdownItem, 0, len(orderedKeys))
	for _, k := range orderedKeys {
		item := items[k]
		out = append(out, BreakdownItem{Key: k, Label: item.label, Value: item.value})
	}
	return out
}

func buildTimeseries(rows []paymentRow, from, to time.Time) []TimeseriesPoint {
	fromDay := startOfDay(from)
	toDay := startOfDay(to)

	type bucket struct {
		volume    float64
		payments  int
		completed int
		failed    int
		expired   int
	}
	buckets := map[string]*bucket{}
	var days []time.Time
	for d := fromDay; !d.After(toDay); d = d.AddDate(0, 0, 1) {
		key := dateKey(d)
		buckets[key] = &bucket{}
		days = append(days, d)
	}

	for _, payment := range rows {
		key := dateKey(payment.CreatedAt)
		b, ok := buckets[key]
		if !ok {
			continue
		}
		b.payments++
		switch payment.Status {
		case "completed":
			b.completed++
			b.volume += getPaymentVolume(payment)
		case "failed":
			b.failed++
		case "expired":
			b.expired++
		}
	}

	out := make([]TimeseriesPoint, 0, len(days))
	for _, day := range days {
		key := dateKey(day)
		b := buckets[key]
		out = append(out, TimeseriesPoint{
			Date:        key,
			Volume:      b.volume,
			Payments:    b.payments,
			SuccessRate: calculateSuccessRate(b.completed, b.failed, b.expired),
		})
	}
	return out
}

func (s *Service) GetOrganizationAnalytics(
	ctx context.Context,
	organizationID, environment string,
	from, to time.Time,
) (*DashboardAnalytics, error) {
	rangeFrom := startOfDay(from)
	rangeTo := endOfDay(to)

	rows, err := s.pool.Query(ctx, `
		SELECT id, status, source_type, pricing_amount, pricing_currency,
		       quoted_settlement_amount, paid_asset, settlement_asset, customer_id,
		       confirmed_at, created_at
		FROM payments
		WHERE organization_id = $1 AND environment = $2
		  AND created_at >= $3 AND created_at <= $4`,
		organizationID, environment, rangeFrom, rangeTo,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var paymentRows []paymentRow
	customerIDs := map[string]bool{}
	for rows.Next() {
		var p paymentRow
		if err := rows.Scan(
			&p.ID, &p.Status, &p.SourceType, &p.PricingAmount, &p.PricingCurrency,
			&p.QuotedSettlementAmount, &p.PaidAsset, &p.SettlementAsset, &p.CustomerID,
			&p.ConfirmedAt, &p.CreatedAt,
		); err != nil {
			return nil, err
		}
		paymentRows = append(paymentRows, p)
		if p.CustomerID != nil {
			customerIDs[*p.CustomerID] = true
		}
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	customerNameByID := map[string]string{}
	if len(customerIDs) > 0 {
		ids := make([]string, 0, len(customerIDs))
		for id := range customerIDs {
			ids = append(ids, id)
		}
		crows, err := s.pool.Query(ctx, `
			SELECT id, name, email FROM customers WHERE id = ANY($1)`, ids)
		if err != nil {
			return nil, err
		}
		for crows.Next() {
			var id string
			var name, email *string
			if err := crows.Scan(&id, &name, &email); err != nil {
				crows.Close()
				return nil, err
			}
			label := "Unknown customer"
			if name != nil && strings.TrimSpace(*name) != "" {
				label = strings.TrimSpace(*name)
			} else if email != nil && strings.TrimSpace(*email) != "" {
				label = strings.TrimSpace(*email)
			}
			customerNameByID[id] = label
		}
		if err := crows.Err(); err != nil {
			crows.Close()
			return nil, err
		}
		crows.Close()
	}

	statusCounts := map[string]int{
		"completed": 0,
		"pending":   0,
		"failed":    0,
		"expired":   0,
	}
	paymentMethods := map[string]labeledValue{}
	assets := map[string]labeledValue{}
	statuses := map[string]labeledValue{}
	customerVolumes := map[string]labeledValue{}
	var totalVolume float64

	for _, payment := range paymentRows {
		agg := aggregatePaymentStatus(payment.Status)
		statusCounts[agg]++

		sourceLabel := sourceTypeLabels[payment.SourceType]
		if sourceLabel == "" {
			sourceLabel = payment.SourceType
		}
		src := paymentMethods[payment.SourceType]
		src.label = sourceLabel
		src.value++
		paymentMethods[payment.SourceType] = src

		statusLabel := statusLabels[payment.Status]
		if statusLabel == "" {
			statusLabel = payment.Status
		}
		st := statuses[payment.Status]
		st.label = statusLabel
		st.value++
		statuses[payment.Status] = st

		if payment.Status == "completed" {
			volume := getPaymentVolume(payment)
			totalVolume += volume

			assetKey := getPaymentAsset(payment)
			asset := assets[assetKey]
			asset.label = assetKey
			asset.value += volume
			assets[assetKey] = asset

			if payment.CustomerID != nil {
				label := customerNameByID[*payment.CustomerID]
				if label == "" {
					label = "Unknown customer"
				}
				cv := customerVolumes[*payment.CustomerID]
				cv.label = label
				cv.value += volume
				customerVolumes[*payment.CustomerID] = cv
			}
		}
	}

	topCustomers := buildBreakdown(customerVolumes, nil)
	if len(topCustomers) > 8 {
		topCustomers = topCustomers[:8]
	}

	result := &DashboardAnalytics{}
	result.Totals.Volume = totalVolume
	result.Totals.Payments = len(paymentRows)
	result.Totals.SuccessRate = calculateSuccessRate(
		statusCounts["completed"], statusCounts["failed"], statusCounts["expired"],
	)
	result.Timeseries = buildTimeseries(paymentRows, rangeFrom, rangeTo)
	result.Breakdowns.PaymentMethods = buildBreakdown(paymentMethods, sourceTypeOrder)
	result.Breakdowns.Assets = buildBreakdown(assets, nil)
	result.Breakdowns.Status = buildBreakdown(statuses, statusOrder)
	result.Breakdowns.Customers = topCustomers

	if result.Timeseries == nil {
		result.Timeseries = []TimeseriesPoint{}
	}
	if result.Breakdowns.PaymentMethods == nil {
		result.Breakdowns.PaymentMethods = []BreakdownItem{}
	}
	if result.Breakdowns.Assets == nil {
		result.Breakdowns.Assets = []BreakdownItem{}
	}
	if result.Breakdowns.Status == nil {
		result.Breakdowns.Status = []BreakdownItem{}
	}
	if result.Breakdowns.Customers == nil {
		result.Breakdowns.Customers = []BreakdownItem{}
	}

	return result, nil
}
