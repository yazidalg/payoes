# @payoes/sdk

Official JavaScript SDK for embedding [Payoes](https://payoes.com) hosted checkout on your website. Open the same Stellar-powered checkout your customers see on Payoes, inside a responsive modal, without leaving your app.

[![npm version](https://img.shields.io/npm/v/@payoes/sdk.svg)](https://www.npmjs.com/package/@payoes/sdk)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

## Features

- **Hosted checkout embed**: loads Payoes checkout in an iframe modal on your site
- **Two distribution formats**: ESM for bundlers, IIFE for a single script tag
- **TypeScript support**: full type definitions included
- **Responsive modal**: fullscreen on mobile, centered panel on desktop
- **postMessage bridge**: secure communication between iframe and parent page
- **Zero runtime dependencies**: small bundle, tree-shakeable ESM build
- **Sandbox ready**: point `baseUrl` at your local or staging host

## Installation

### npm

```bash
npm install @payoes/sdk
```

```bash
yarn add @payoes/sdk
```

```bash
pnpm add @payoes/sdk
```

### Script tag

Load the browser bundle from Payoes:

```html
<script src="https://payoes.com/sdk/checkout.js"></script>
```

The script exposes a global `Payoes` object.

## Quick start

### 1. Create a payment on your server

Use your secret API key to create a payment. Never expose API keys in the browser.

```typescript
const payment = await fetch("https://payoes.com/api/v1/payments", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${process.env.PAYOES_API_KEY}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    pricing_currency: "USD",
    pricing_amount: "25",
    description: "Pro plan",
  }),
}).then((response) => response.json());
```

### 2. Open checkout in the browser

```typescript
import { Payoes } from "@payoes/sdk";

document.getElementById("pay-button")?.addEventListener("click", () => {
  Payoes.openCheckout({
    paymentId: payment.id,
    onComplete: ({ status, txHash }) => {
      if (status === "completed") {
        window.location.href = "/success";
      }
    },
    onClose: () => {
      console.log("Checkout closed");
    },
  });
});
```

### Script tag example

```html
<button id="pay-button" type="button">Pay now</button>

<script src="https://payoes.com/sdk/checkout.js"></script>
<script>
  document.getElementById("pay-button").addEventListener("click", () => {
    Payoes.openCheckout({
      paymentId: "pay_REPLACE_ME",
      onComplete: (result) => console.log(result),
    });
  });
</script>
```

## API reference

### `Payoes.openCheckout(options)`

Opens the hosted checkout in a modal iframe.

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `paymentId` | `string` | Yes* | Payment ID (`pay_...`) |
| `checkoutUrl` | `string` | Yes* | Full hosted checkout URL. Alternative to `paymentId` |
| `baseUrl` | `string` | No | Payoes host. Default: `https://payoes.com` |
| `onComplete` | `(result) => void` | No | Called when checkout reports `completed` or `refunded` |
| `onClose` | `() => void` | No | Called when the modal closes |
| `onError` | `(error: Error) => void` | No | Called when options are invalid or message handling fails |

\* Provide `paymentId` or `checkoutUrl`.

#### `onComplete` result

```typescript
type CheckoutCompleteResult = {
  paymentId: string;
  status: string;
  txHash?: string | null;
};
```

### `Payoes.closeCheckout()`

Programmatically closes the modal and notifies the iframe.

```typescript
Payoes.closeCheckout();
```

### Named exports

For tree-shaking or direct imports:

```typescript
import { openCheckout, closeCheckout, SDK_VERSION } from "@payoes/sdk";
```

## Modal behavior

| Viewport | Layout |
|----------|--------|
| Mobile (`< 768px`) | Fullscreen modal (`100dvh`) |
| Desktop | Centered modal, max width `1024px`, max height `90dvh` |

Customers can close the modal with the close button, backdrop click, or `Escape`.

## Embed vs redirect

| Approach | Best for |
|----------|----------|
| **Redirect** to `checkout_url` | Simplest integration, email links, mobile apps |
| **Embed** with `@payoes/sdk` | On-site checkout, SaaS billing pages, marketplaces |

## Security

**Client callbacks are for UX only.** Always confirm payment status on your server before fulfilling orders.

Use one of:

- [Webhooks](https://payoes.com/docs/guides/webhooks)
- `GET /api/v1/payments/{id}` with your secret API key

The SDK validates `postMessage` origin against `baseUrl` before handling events.

## postMessage protocol

The iframe loads `/c/{payment_id}?embed=1` and communicates with the parent page:

| Event | Direction | Payload |
|-------|-----------|---------|
| `payoes:checkout:ready` | iframe to parent | `{ paymentId }` |
| `payoes:checkout:completed` | iframe to parent | `{ paymentId, status, txHash? }` |
| `payoes:checkout:closed` | iframe to parent | `{ paymentId }` |
| `payoes:checkout:close` | parent to iframe | `{}` |

## Local development

Point the SDK at your local Payoes instance:

```typescript
Payoes.openCheckout({
  paymentId: "pay_...",
  baseUrl: "http://localhost:3000",
});
```

Create sandbox payments with a sandbox API key from your dashboard.

## Troubleshooting

### Iframe is blank or blocked

Ensure your Payoes host allows embedding. Checkout routes send `Content-Security-Policy: frame-ancestors *`.

### `onComplete` never fires

Confirm the payment reached `completed` or `refunded` status. Use webhooks as the source of truth.

### Wallet does not open on mobile

Some mobile wallets open in a separate app. After paying, return to the browser tab that opened the embed.

### `openCheckout` throws in Node.js

The SDK is browser-only. Call it from client-side code after user interaction.

## Package exports

| Import | Format | Use case |
|--------|--------|----------|
| `@payoes/sdk` | ESM + types | Bundlers (Vite, Webpack, Next.js client components) |
| `@payoes/sdk/checkout` | ESM | Programmatic checkout module without the global |
| `https://payoes.com/sdk/checkout.js` | IIFE | Plain HTML, legacy apps, no bundler |

## Requirements

- Modern browsers with `postMessage`, `matchMedia`, and ES module support
- A Payoes account with API keys configured
- Payments created server-side before opening checkout

## Documentation

- [Embedded checkout guide](https://payoes.com/docs/guides/checkout-embed)
- [Hosted checkout](https://payoes.com/docs/guides/checkout)
- [REST API reference](https://payoes.com/docs/api-reference/introduction)
- [Webhooks](https://payoes.com/docs/guides/webhooks)

## Development

This package lives in the [Payoes monorepo](https://github.com/payoesteam/payoes).

```bash
# From the repository root
npm run build:sdk
```

Build output:

- `dist/index.mjs`: ESM entry for bundlers
- `dist/checkout.js`: IIFE bundle copied to `apps/web/public/sdk/` for CDN delivery

## License

MIT
