import { formatAmountWithUnit } from "@/lib/format/amount";
import {
  formatAssetAmount,
  formatAssetRef,
  type CheckoutSessionRow,
  type InvoiceRow,
  type PaymentLinkRow,
  type PaymentRow,
} from "@/lib/payments/types";

export function getPaymentStatusVariant(status: string) {
  switch (status) {
    case "completed":
      return "success" as const;
    case "pending":
      return "pending" as const;
    case "failed":
    case "expired":
      return "error" as const;
    default:
      return "neutral" as const;
  }
}

export function formatSourceType(sourceType?: string) {
  switch (sourceType) {
    case "checkout_session":
      return "Checkout";
    case "payment_link":
      return "Payment link";
    case "invoice":
      return "Invoice";
    case "direct":
      return "API";
    default:
      return sourceType ?? "-";
  }
}

export function formatPaidAmount(payment: PaymentRow) {
  const amount = payment.quoted_paid_amount ?? payment.amount;
  const asset = payment.paid_asset ?? payment.settlement_asset;
  return formatAssetAmount(amount, asset);
}

export function formatSettlementTarget(payment: PaymentRow) {
  if (payment.pricing_amount && payment.pricing_currency) {
    return formatAmountWithUnit(payment.pricing_amount, payment.pricing_currency);
  }

  if (payment.quoted_settlement_amount) {
    return formatAssetAmount(
      payment.quoted_settlement_amount,
      payment.settlement_asset,
    );
  }

  return formatAssetAmount(payment.amount, payment.settlement_asset);
}

export function formatSettlementAmount(payment: PaymentRow) {
  if (payment.quoted_settlement_amount) {
    return formatAssetAmount(
      payment.quoted_settlement_amount,
      payment.settlement_asset,
    );
  }

  return "-";
}

export function formatInvoiceTotal(payment: PaymentRow) {
  if (payment.pricing_amount && payment.pricing_currency) {
    return formatAmountWithUnit(payment.pricing_amount, payment.pricing_currency);
  }

  return "-";
}

export function formatAllowedAssets(payment: PaymentRow) {
  const codes = payment.allowed_assets.map((asset) => asset.asset_code);
  return codes.length > 0 ? codes.join(", ") : "-";
}

export function formatPaidAsset(payment: PaymentRow) {
  return formatAssetRef(payment.paid_asset ?? payment.settlement_asset);
}

export function getCheckoutSessionStatusVariant(status: string) {
  switch (status) {
    case "complete":
    case "completed":
      return "success" as const;
    case "open":
      return "pending" as const;
    case "expired":
      return "error" as const;
    default:
      return "neutral" as const;
  }
}

export function getInvoiceStatusVariant(status: string) {
  switch (status) {
    case "paid":
      return "success" as const;
    case "open":
      return "pending" as const;
    case "void":
      return "error" as const;
    default:
      return "neutral" as const;
  }
}

export function getPaymentLinkStatusVariant(active: boolean) {
  return active ? ("success" as const) : ("neutral" as const);
}

export function formatCheckoutSessionAmount(session: CheckoutSessionRow) {
  if (!session.amount) {
    return "-";
  }

  return formatAssetAmount(session.amount, session.settlement_asset);
}

export function formatPaymentLinkAmount(link: PaymentLinkRow) {
  if (link.currency_code) {
    return formatAmountWithUnit(link.amount, link.currency_code);
  }

  return formatAssetAmount(link.amount, link.settlement_asset);
}

export function formatInvoiceAmount(invoice: InvoiceRow) {
  return formatAmountWithUnit(invoice.amount, invoice.currency_code);
}
