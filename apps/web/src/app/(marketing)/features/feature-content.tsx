import type { ComponentType } from "react";
import {
  InvoiceGraphic,
  PaymentLinksGraphic,
  PaymentsGraphic,
  QRGraphic,
  WebhooksGraphic,
} from "../feature-graphics";

export type Feature = {
  slug: string;
  badge: string;
  title: string;
  tagline: string;
  graphic: ComponentType;
  steps: { title: string; description: string }[];
  benefits: { title: string; description: string }[];
  code?: { title: string; snippet: string };
};

export const FEATURES: Record<string, Feature> = {
  payments: {
    slug: "payments",
    badge: "Payments",
    title: "Crypto payment processing",
    tagline:
      "Accept USDC, XLM, and any Stellar asset with a single API call. Payoes handles wallet connections, on-chain verification, and settlement, so a payment feels like a charge, not a blockchain project.",
    graphic: PaymentsGraphic,
    steps: [
      {
        title: "Create a payment",
        description:
          "One request to the API, or a few clicks in the dashboard. You get back a payment ID and a hosted checkout URL.",
      },
      {
        title: "Customer pays",
        description:
          "Your customer opens the checkout page, connects any Stellar wallet, and approves the transaction. No account needed.",
      },
      {
        title: "Verified and settled",
        description:
          "Payoes verifies the transaction on-chain, settles funds to your wallet, and fires a webhook the moment it confirms.",
      },
    ],
    benefits: [
      {
        title: "On-chain verification",
        description:
          "Every payment is verified against the Stellar network before it is marked complete.",
      },
      {
        title: "Direct wallet settlement",
        description:
          "Funds settle straight to your own Stellar wallet. Payoes never holds your money.",
      },
      {
        title: "USDC, XLM, and custom assets",
        description:
          "Accept stablecoins or any Stellar asset your business works with.",
      },
      {
        title: "Sandbox and production",
        description:
          "Build against Stellar Testnet in sandbox, then switch your API keys to Mainnet.",
      },
      {
        title: "Metadata and expiration",
        description:
          "Attach order IDs and custom data to payments, and set expiration windows.",
      },
      {
        title: "Full transaction records",
        description:
          "Every payment stores the transaction hash, sender, receiver, asset, amount, and network.",
      },
    ],
    code: {
      title: "Create a payment",
      snippet: `curl -X POST https://payoes.com/api/v1/payments \\
  -H "Authorization: Bearer pk_test_..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "amount": "49.99",
    "settlement_asset": "USDC",
    "metadata": { "order_id": "1042" }
  }'

# => { "id": "pay_...", "checkout_url": "https://payoes.com/c/..." }`,
    },
  },

  checkout: {
    slug: "checkout",
    badge: "Checkout",
    title: "Checkout & payment links",
    tagline:
      "Every payment gets a hosted checkout page with your branding, and reusable payment links work anywhere you can paste a URL. No frontend work, no customer login.",
    graphic: PaymentLinksGraphic,
    steps: [
      {
        title: "Create a link or session",
        description:
          "Spin up a reusable payment link or a one-off checkout session from the API or dashboard.",
      },
      {
        title: "Share it anywhere",
        description:
          "Email, WhatsApp, Telegram, QR codes, or embedded in your site. Every visit to a link starts a fresh checkout session.",
      },
      {
        title: "Customer pays in seconds",
        description:
          "The hosted page handles wallet connection, asset selection, and confirmation, with success and failure states built in.",
      },
    ],
    benefits: [
      {
        title: "Hosted checkout pages",
        description:
          "A ready-to-use payment page with your branding. Zero frontend implementation required.",
      },
      {
        title: "Reusable payment links",
        description:
          "One link, unlimited payments. Each visit spawns its own checkout session and payment record.",
      },
      {
        title: "Any Stellar wallet",
        description:
          "Customers connect with Freighter, xBull, Albedo, LOBSTR, and more via Stellar Wallets Kit.",
      },
      {
        title: "Automatic status detection",
        description:
          "Checkout polls the network and flips to success the moment the payment confirms on-chain.",
      },
      {
        title: "Built-in retry",
        description:
          "Failed transactions can be retried by the customer without starting over.",
      },
      {
        title: "Line items and customer fields",
        description:
          "Add products with quantities and prices, and optionally collect customer details at checkout.",
      },
    ],
    code: {
      title: "Create a payment link",
      snippet: `curl -X POST https://payoes.com/api/v1/payment-links \\
  -H "Authorization: Bearer pk_test_..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "items": [
      {
        "description": "Pro plan",
        "quantity": "1",
        "unit_amount": "49.99"
      }
    ],
    "settlement_asset": "USDC"
  }'

# => { "id": "plink_...", "url": "https://payoes.com/l/plink_..." }`,
    },
  },

  invoicing: {
    slug: "invoicing",
    badge: "Invoicing",
    title: "Invoicing",
    tagline:
      "Bill customers with invoices that collect themselves. Draft, finalize, and get paid in stablecoins, with the invoice flipping to paid the moment the transaction confirms on-chain.",
    graphic: InvoiceGraphic,
    steps: [
      {
        title: "Create a draft",
        description:
          "Set the amount, customer, description, and due date. Drafts can be edited until you finalize them.",
      },
      {
        title: "Finalize the invoice",
        description:
          "Finalizing generates a hosted payment page for the invoice that you can send to your customer.",
      },
      {
        title: "Get paid on-chain",
        description:
          "Your customer pays from their wallet. The invoice becomes paid on confirmation and your webhook fires.",
      },
    ],
    benefits: [
      {
        title: "Draft-to-paid lifecycle",
        description:
          "Clean statuses from draft to open to paid, mirrored in the dashboard and the API.",
      },
      {
        title: "Hosted invoice pages",
        description:
          "Every finalized invoice gets a public payment page. No portal or login for your customer.",
      },
      {
        title: "Tied to customers",
        description:
          "Invoices belong to customer records, so payment history stays organized in one place.",
      },
      {
        title: "Due dates and metadata",
        description:
          "Set due dates in days or absolute time, and attach custom metadata for your own systems.",
      },
      {
        title: "Powers subscriptions",
        description:
          "Recurring billing generates a finalized invoice each period; the period advances when it is paid.",
      },
    ],
    code: {
      title: "Create and finalize an invoice",
      snippet: `curl -X POST https://payoes.com/api/v1/invoices \\
  -H "Authorization: Bearer pk_test_..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "amount": "116.00",
    "customer_id": "cus_...",
    "description": "Pro plan, July",
    "due_in_days": 14
  }'

curl -X POST https://payoes.com/api/v1/invoices/inv_.../finalize \\
  -H "Authorization: Bearer pk_test_..."

# => { "id": "inv_...", "status": "open", "hosted_invoice_url": "..." }`,
    },
  },

  "qr-checkout": {
    slug: "qr-checkout",
    badge: "QR checkout",
    title: "QR code checkout",
    tagline:
      "Let customers pay by scanning a code with their mobile Stellar wallet. Perfect for in-person sales, printed materials, and any screen your customer is not sitting in front of.",
    graphic: QRGraphic,
    steps: [
      {
        title: "Open the checkout",
        description:
          "Every hosted checkout page includes a QR payment mode next to the wallet connect flow.",
      },
      {
        title: "Scan with a mobile wallet",
        description:
          "The customer scans the code with their Stellar wallet app and reviews the exact amount and asset.",
      },
      {
        title: "Approve and done",
        description:
          "The payment confirms on-chain and the checkout page updates automatically. No typing, no copy-paste.",
      },
    ],
    benefits: [
      {
        title: "Scan-to-pay at checkout",
        description:
          "A QR mode on every hosted checkout, generated with the exact payment details.",
      },
      {
        title: "Share links as QR codes",
        description:
          "Turn any payment link into a QR code for posters, receipts, packaging, or a counter display.",
      },
      {
        title: "Works with every session",
        description:
          "QR checkout is available on checkout sessions, payment links, and invoices alike.",
      },
      {
        title: "No app of our own",
        description:
          "Customers use the Stellar wallet they already have. Nothing new to install.",
      },
    ],
  },

  webhooks: {
    slug: "webhooks",
    badge: "Webhooks",
    title: "Webhooks & real-time events",
    tagline:
      "React to payments the moment they happen. Payoes delivers HMAC-signed events to your endpoint with automatic retries and full delivery logs.",
    graphic: WebhooksGraphic,
    steps: [
      {
        title: "Register an endpoint",
        description:
          "Add your HTTPS endpoint in the dashboard or via the API and choose the events you care about.",
      },
      {
        title: "Receive signed events",
        description:
          "Payoes POSTs each event with signature, event type, timestamp, and delivery ID headers.",
      },
      {
        title: "Verify and react",
        description:
          "Check the HMAC signature with your endpoint secret, then update orders, send emails, or unlock access.",
      },
    ],
    benefits: [
      {
        title: "Payment lifecycle events",
        description:
          "payment.created, payment.completed, payment.failed, and payment.expired, delivered in real time.",
      },
      {
        title: "HMAC-SHA256 signatures",
        description:
          "Every payload is signed over the timestamp and raw body with your whsec_ endpoint secret.",
      },
      {
        title: "Automatic retries",
        description:
          "Up to 5 attempts with exponential backoff, from 1 minute to 24 hours between tries.",
      },
      {
        title: "Delivery logs",
        description:
          "Inspect every attempt in the dashboard, with response codes and manual retry.",
      },
      {
        title: "Test events",
        description:
          "Send a webhook.test event from the dashboard to verify your integration before going live.",
      },
    ],
    code: {
      title: "Example event delivery",
      snippet: `POST https://acme.co/webhooks
Payoes-Event: payment.completed
Payoes-Signature: t=1721001600,v1=5f8c2a...
Payoes-Delivery-ID: whd_...

{
  "event": "payment.completed",
  "data": {
    "id": "pay_9tK4mQx8",
    "amount": "49.99",
    "settlement_asset": "USDC",
    "metadata": { "order_id": "1042" }
  }
}`,
    },
  },
};
