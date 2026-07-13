export type DocArticle = {
  id: string;
  title: string;
  intro: string;
  bullets?: { label: string; text: string }[];
  code?: { label: string; snippet: string };
};

export type DocSection = {
  slug: string;
  title: string;
  description: string;
  accentClassName: string;
  washClassName: string;
  articles: DocArticle[];
};

/* Content condensed from docs/ (Mintlify): introduction, quickstart,
   guides/*, and local-setup/*. Keep in sync when those files change. */
export const DOC_SECTIONS: Record<string, DocSection> = {
  "get-started": {
    slug: "get-started",
    title: "Get started",
    description:
      "What Payoes is, how a payment flows from API call to on-chain settlement, and your first payment on Stellar Testnet.",
    accentClassName: "bg-gradient-to-b from-amber-500 to-amber-600",
    washClassName:
      "bg-gradient-to-b from-transparent via-amber-100/50 to-amber-200/80",
    articles: [
      {
        id: "what-payoes-is",
        title: "What Payoes is",
        intro:
          "Payoes is open-source, developer-first payment infrastructure for the Stellar ecosystem. Instead of integrating wallets, building checkout flows, monitoring Horizon, and wiring webhooks yourself, you create a payment through a REST API and share a hosted checkout link.",
        bullets: [
          {
            label: "Payment infrastructure",
            text: "For merchants and developers, not a consumer product.",
          },
          {
            label: "Hosted checkout",
            text: "A ready payment page with Stellar Wallets Kit built in.",
          },
          {
            label: "Horizon-backed verification",
            text: "Every payment is confirmed against the Stellar network.",
          },
          {
            label: "Webhooks",
            text: "Lifecycle events delivered to your backend.",
          },
          {
            label: "Not a wallet or exchange",
            text: "Payoes never holds keys and offers no on-ramp.",
          },
          {
            label: "Not a custody provider",
            text: "Funds settle directly to your own Stellar address.",
          },
        ],
      },
      {
        id: "how-it-works",
        title: "How a payment flows",
        intro:
          "Five steps take a payment from creation to settlement, and Payoes handles everything between your API call and the webhook.",
        bullets: [
          {
            label: "1. Set up your organization",
            text: "Connect a settlement wallet: the Stellar address that receives payments.",
          },
          {
            label: "2. Create a payment",
            text: "Use the dashboard or POST /api/v1/payments with an amount and asset.",
          },
          {
            label: "3. Share the checkout link",
            text: "Payoes returns a checkout_url. Send it by email, chat, or from your product.",
          },
          {
            label: "4. Customer pays with a wallet",
            text: "They connect a Stellar wallet on the hosted page and approve the transaction.",
          },
          {
            label: "5. Payoes verifies and notifies",
            text: "The payment is confirmed on Horizon, the status updates, and webhooks fire.",
          },
        ],
      },
      {
        id: "quickstart",
        title: "Quickstart: first payment on Testnet",
        intro:
          "Create a sandbox API key under Developers, then API Keys (it uses the pk_test_ prefix and is shown once), create a payment, open the checkout URL with a Testnet wallet, and watch the status flip to completed.",
        code: {
          label: "Create a payment",
          snippet: `curl -X POST https://payoes.com/api/v1/payments \\
  -H "Authorization: Bearer pk_test_YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "amount": "2",
    "asset": "XLM",
    "description": "Quickstart payment"
  }'

# => {
#   "id": "pay_nLU2gUDk-v3tdyd6",
#   "status": "pending",
#   "checkout_url": "https://payoes.com/c/pay_..."
# }`,
        },
        bullets: [
          {
            label: "No customer login",
            text: "Payers only connect a wallet at checkout time.",
          },
          {
            label: "Poll or listen",
            text: "GET /v1/payments/{id} shows the status, or register a webhook for payment.completed.",
          },
          {
            label: "tx_hash on completion",
            text: "Completed payments carry the Stellar transaction hash for the explorer.",
          },
        ],
      },
    ],
  },

  "core-concepts": {
    slug: "core-concepts",
    title: "Core concepts",
    description:
      "The Stripe-like object model, API key authentication, sandbox and production environments, and how customers work.",
    accentClassName: "bg-gradient-to-b from-indigo-500 to-indigo-600",
    washClassName:
      "bg-gradient-to-b from-transparent via-indigo-100/50 to-indigo-200/80",
    articles: [
      {
        id: "object-model",
        title: "The object model",
        intro:
          "Payoes follows a Stripe-like mental model adapted for Stellar. Every resource has a prefixed public ID that appears in the API, the dashboard, and hosted URLs.",
        bullets: [
          {
            label: "Payment intent (pay_)",
            text: "A single payment request with amount, assets, status, and checkout_url.",
          },
          {
            label: "Checkout session (cs_)",
            text: "A hosted checkout flow that creates an underlying payment intent.",
          },
          {
            label: "Payment link (plink_)",
            text: "Reusable link at /l/... where every visit starts a new checkout session.",
          },
          {
            label: "Invoice (inv_)",
            text: "Draft, then finalize to spawn a checkout session; statuses draft, open, paid, void.",
          },
          {
            label: "Customer (cus_)",
            text: "The payer: email, name, primary Stellar address, and payment history.",
          },
          {
            label: "Transaction",
            text: "Completed payments store the Stellar tx_hash for explorer lookup.",
          },
        ],
      },
      {
        id: "authentication",
        title: "Authentication",
        intro:
          "All REST API requests carry a Bearer API key. The full key is shown only once at creation; Payoes stores a hash and cannot recover it. To rotate, create a new key, update your configuration, then revoke the old one: revoked keys stop working immediately.",
        code: {
          label: "Authenticated request",
          snippet: `curl https://payoes.com/api/v1/payments \\
  -H "Authorization: Bearer pk_test_YOUR_KEY"

# Missing or invalid keys return 401
# { "error": "Unauthorized" }`,
        },
        bullets: [
          {
            label: "Server-side only",
            text: "Never expose keys in browser JavaScript or mobile apps.",
          },
          {
            label: "Scoped per environment",
            text: "A key belongs to one organization and one environment.",
          },
          {
            label: "Every request logged",
            text: "Method, path, status, and duration under Developers, then API Logs.",
          },
        ],
      },
      {
        id: "environments",
        title: "Environments",
        intro:
          "Sandbox runs on Stellar Testnet with pk_test_ keys and test tokens; production runs on Mainnet with pk_live_ keys and real value. Each environment has its own settlement wallet, and identity verification through Persona is required before production mode unlocks.",
        bullets: [
          {
            label: "Keys carry the environment",
            text: "A pk_test_ key always creates sandbox payments; pk_live_ creates production ones.",
          },
          {
            label: "Free Testnet funding",
            text: "Fund a test wallet from the Stellar Laboratory faucet and pay yourself to test.",
          },
          {
            label: "Production gate",
            text: "Persona verification (ID + liveness) plus a Mainnet settlement wallet.",
          },
          {
            label: "Payments expire",
            text: "Default 60 minutes; expired payments trigger a payment.expired webhook.",
          },
        ],
      },
      {
        id: "customers",
        title: "Customers",
        intro:
          "Customers group payments, enrich webhooks, and act as a light CRM. Pass customer_id when creating a payment to pre-link it, or let Payoes auto-create a customer from the payer wallet it sees at checkout.",
        bullets: [
          {
            label: "Auto-created from checkout",
            text: "Payoes reads the payer address on-chain and links or creates the customer.",
          },
          {
            label: "History included",
            text: "GET /v1/customers/{id} returns the profile plus linked payments.",
          },
          {
            label: "Not login accounts",
            text: "Customers never sign in; there are no saved payment methods that bypass wallet approval.",
          },
        ],
      },
    ],
  },

  payments: {
    slug: "payments",
    title: "Payments",
    description:
      "How hosted checkout works, where funds settle, reacting to webhooks, and recovering from errors.",
    accentClassName: "bg-gradient-to-b from-emerald-500 to-emerald-600",
    washClassName:
      "bg-gradient-to-b from-transparent via-emerald-100/50 to-emerald-200/80",
    articles: [
      {
        id: "hosted-checkout",
        title: "Hosted checkout",
        intro:
          "Every payment includes a checkout_url at /c/{id}. The page loads the amount, allowed assets, and your branding; the customer connects a wallet (Freighter, xBull, and more), approves, and Payoes verifies the transaction on Horizon.",
        code: {
          label: "Integration pattern",
          snippet: `// 1. Create a payment on your server
const payment = await fetch(
  "https://payoes.example.com/api/v1/payments",
  {
    method: "POST",
    headers: {
      Authorization: \`Bearer \${process.env.PAYOES_API_KEY}\`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount: "25",
      description: "Pro plan (monthly)",
      metadata: { user_id: "usr_123" },
    }),
  },
).then((r) => r.json());

// 2. Redirect the customer to checkout
return Response.redirect(payment.checkout_url);`,
        },
        bullets: [
          {
            label: "Asset choice at checkout",
            text: "Configure allowed_assets and the customer picks what to pay with.",
          },
          {
            label: "Trustline preflight",
            text: "Checkout catches missing USDC trustlines before the transaction is signed.",
          },
          {
            label: "Retry confirmation",
            text: "If Horizon lags, the page can re-confirm with the submitted transaction hash.",
          },
        ],
      },
      {
        id: "settlement-wallet",
        title: "Settlement wallet",
        intro:
          "The Stellar public key that receives payments, configured per environment and proven by connecting the wallet. Payoes snapshots the address into each payment, so changing it later never redirects pending payments.",
        bullets: [
          {
            label: "XLM requirement",
            text: "The account must exist and hold the minimum balance.",
          },
          {
            label: "USDC requirement",
            text: "An active trustline to the Circle USDC issuer for your network.",
          },
          {
            label: "No custody",
            text: "Payoes never holds private keys; use a dedicated wallet in production.",
          },
        ],
      },
      {
        id: "webhooks",
        title: "Webhooks",
        intro:
          "Register an HTTPS endpoint and Payoes delivers payment.created, payment.completed, payment.failed, and payment.expired events, each signed with HMAC-SHA256 over the timestamp and raw body using your whsec_ secret.",
        bullets: [
          {
            label: "Signed headers",
            text: "Payoes-Signature, Payoes-Event, Payoes-Timestamp, and Payoes-Delivery-ID on every delivery.",
          },
          {
            label: "Automatic retries",
            text: "Up to 5 attempts with exponential backoff, from 1 minute to 24 hours.",
          },
          {
            label: "Delivery logs and tests",
            text: "Inspect attempts, retry manually, and send webhook.test events from the dashboard.",
          },
        ],
      },
      {
        id: "errors",
        title: "Errors",
        intro:
          "Payments move through pending, completed, failed, and expired. API errors use conventional status codes (400 invalid request, 401 unauthorized, 404 not found), and the common Stellar failures all have clear fixes.",
        bullets: [
          {
            label: "op_no_trust",
            text: "Missing USDC trustline; add one to the correct issuer for your network.",
          },
          {
            label: "op_underfunded",
            text: "Balance too low for the amount plus fees; fund the wallet.",
          },
          {
            label: "op_line_full",
            text: "Destination trustline limit reached; raise the limit on the receiving account.",
          },
          {
            label: "Verification mismatches",
            text: "Wrong destination, amount, or asset is rejected; amounts normalize Stellar's 7 decimals.",
          },
        ],
      },
    ],
  },

  "self-hosting": {
    slug: "self-hosting",
    title: "Self-hosting",
    description:
      "Clone the repository and run the whole platform on your machine: web app, PostgreSQL, MinIO, and the docs.",
    accentClassName: "bg-gradient-to-b from-teal-500 to-teal-600",
    washClassName:
      "bg-gradient-to-b from-transparent via-teal-100/50 to-teal-200/80",
    articles: [
      {
        id: "what-you-run",
        title: "What you run locally",
        intro:
          "The stack is small: the Next.js web app serves the dashboard, hosted checkout, and the REST API, while Docker Compose provides PostgreSQL and MinIO for storage.",
        bullets: [
          {
            label: "Web app on :3000",
            text: "Dashboard, checkout, and API, started with npm run dev.",
          },
          {
            label: "PostgreSQL and MinIO",
            text: "docker compose up -d; MinIO console on :9001 for organization logos.",
          },
          {
            label: "Docs on :3001",
            text: "Mintlify preview via npm run docs:dev.",
          },
          {
            label: "Node.js 20+ and Docker",
            text: "The only hard prerequisites for the core app.",
          },
        ],
      },
      {
        id: "getting-started",
        title: "Getting started",
        intro:
          "From clone to a working dashboard in a handful of commands: install, start the containers, configure the environment, migrate, and sign in.",
        code: {
          label: "First run",
          snippet: `git clone git@github.com:payoes/payoes.git && cd payoes
npm install

docker compose up -d        # PostgreSQL + MinIO
cp apps/web/.env.example apps/web/.env

npm run db:migrate          # apply the schema
npm run dev                 # web app on :3000`,
        },
        bullets: [
          {
            label: "Onboarding flow",
            text: "Sign in, create an organization, and connect a Testnet settlement wallet.",
          },
          {
            label: "Verify end to end",
            text: "Create a sandbox payment and complete checkout with a Testnet wallet.",
          },
        ],
      },
      {
        id: "optional-integrations",
        title: "Optional integrations",
        intro:
          "Sandbox payments, checkout, customers, and webhooks all work with the default setup. These extras only matter for specific features.",
        bullets: [
          {
            label: "Google OAuth",
            text: "Sign in with Google on the dashboard.",
          },
          {
            label: "SMTP",
            text: "Team invitation and verification emails.",
          },
          {
            label: "Persona KYC",
            text: "Identity verification, required only to test production mode.",
          },
          {
            label: "Webhook retry worker",
            text: "Schedule POST /api/cron/webhook-retries for reliable delivery on low-traffic deployments.",
          },
        ],
      },
    ],
  },
};

export const DOC_SECTION_ORDER = [
  "get-started",
  "core-concepts",
  "payments",
  "self-hosting",
];
