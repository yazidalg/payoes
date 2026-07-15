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
  /* Full-hero gradient wash, transparent at the top and tinted at the bottom. */
  washClassName: string;
  /* Solid accent gradient for small chips (badge dot, step numbers). */
  accentClassName: string;
  graphic: ComponentType;
  steps: { title: string; description: string }[];
  benefits: { title: string; description: string }[];
  flow?: { title?: string; steps: { title: string; description: string }[] };
};

export const FEATURES: Record<string, Feature> = {
  payments: {
    slug: "payments",
    washClassName:
      "bg-gradient-to-b from-transparent via-violet-100/50 to-violet-200/80",
    accentClassName: "bg-gradient-to-b from-violet-500 to-violet-600",
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
    flow: {
      title: "Create a payment",
      steps: [
        {
          title: "Send one request",
          description:
            "POST to /v1/payments with pricing_currency, pricing_amount, and any metadata like an order_id.",
        },
        {
          title: "Get a checkout URL back",
          description:
            "The response returns a payment ID (pay_...) and a hosted checkout_url.",
        },
        {
          title: "Send your customer there",
          description:
            "Payoes handles wallet connection, on-chain verification, and settlement.",
        },
      ],
    },
  },

  checkout: {
    slug: "checkout",
    washClassName:
      "bg-gradient-to-b from-transparent via-emerald-100/50 to-emerald-200/80",
    accentClassName: "bg-gradient-to-b from-emerald-500 to-emerald-600",
    badge: "Checkout",
    title: "Checkout & payment links",
    tagline:
      "Every payment gets a hosted checkout page with your branding, and reusable payment links work anywhere you can paste a URL. No frontend work, no customer login.",
    graphic: PaymentLinksGraphic,
    steps: [
      {
        title: "Create a link or invoice",
        description:
          "Spin up a reusable payment link or finalize an invoice from the API or dashboard.",
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
    flow: {
      title: "Create a payment link",
      steps: [
        {
          title: "Create the link",
          description:
            "POST to /v1/payment-links with your line items and a settlement asset.",
        },
        {
          title: "Get a shareable URL",
          description:
            "The response returns a link ID (plink_...) and a hosted URL on the /l/ path.",
        },
        {
          title: "Share it anywhere",
          description:
            "Every visit spins up a fresh checkout session and its own payment record.",
        },
      ],
    },
  },

  invoicing: {
    slug: "invoicing",
    washClassName:
      "bg-gradient-to-b from-transparent via-orange-100/50 to-orange-200/80",
    accentClassName: "bg-gradient-to-b from-orange-500 to-orange-600",
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
    flow: {
      title: "Create and finalize an invoice",
      steps: [
        {
          title: "Draft the invoice",
          description:
            "POST to /v1/invoices with an amount, a customer_id, a description, and a due date.",
        },
        {
          title: "Finalize it",
          description:
            "A second call to /finalize turns the draft (inv_...) into an open invoice with a hosted_invoice_url.",
        },
        {
          title: "Get paid on-chain",
          description:
            "The invoice flips to paid the moment the payment confirms, and your webhook fires.",
        },
      ],
    },
  },

  "qr-checkout": {
    slug: "qr-checkout",
    washClassName:
      "bg-gradient-to-b from-transparent via-blue-100/50 to-blue-200/80",
    accentClassName: "bg-gradient-to-b from-blue-500 to-blue-600",
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
    washClassName:
      "bg-gradient-to-b from-transparent via-rose-100/50 to-rose-200/80",
    accentClassName: "bg-gradient-to-b from-rose-500 to-rose-600",
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
    flow: {
      title: "Example event delivery",
      steps: [
        {
          title: "Payoes POSTs to your endpoint",
          description:
            "Each delivery carries Payoes-Event, Payoes-Signature, Payoes-Timestamp, and Payoes-Delivery-ID headers.",
        },
        {
          title: "Read the payload",
          description:
            "The body includes the event name, like payment.completed, and the full payment object.",
        },
        {
          title: "Verify, then react",
          description:
            "Check the HMAC-SHA256 signature with your whsec_ secret, then update orders, send emails, or unlock access.",
        },
      ],
    },
  },
};
