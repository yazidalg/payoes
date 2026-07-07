````md
# Payoes

> Open-source, developer-first payment infrastructure for the Stellar ecosystem.

Payoes enables developers to accept USDC and Stellar asset payments through a simple API. Instead of building payment flows, checkout pages, blockchain integrations, wallet handling, transaction monitoring, and webhook systems from scratch, developers can integrate Payoes and start accepting payments within minutes.

Payoes is not a wallet.

Payoes is not an exchange.

Payoes is payment infrastructure built for developers.

---

# Vision

Our mission is to become the payment infrastructure layer for applications built on Stellar.

Just as Stripe simplified online payments for Web2 applications, Payoes aims to simplify blockchain payments for developers building on Stellar.

Developers should only focus on building their products.

Payoes handles payment creation, checkout experiences, blockchain transaction verification, payment status, webhooks, and developer tools.

---

# Problem

Today, accepting blockchain payments requires developers to build many components themselves.

Typical challenges include:

- Wallet integration
- Blockchain transaction monitoring
- Payment verification
- Handling failed transactions
- Generating payment links
- Checkout experience
- Event notifications
- API design
- Transaction history
- Payment status management

Every project ends up rebuilding the same infrastructure.

Payoes eliminates this complexity by providing a unified payment platform.

---

# Solution

Payoes provides a complete payment infrastructure built specifically for Stellar.

Instead of interacting directly with blockchain primitives, developers interact with simple REST APIs.

Example:

```http
POST /v1/payments
```

Receive

```json
{
  "payment_id": "pay_123",
  "checkout_url": "https://pay.payoes.com/c/pay_123"
}
```

Developers simply share the checkout URL with customers.

Payoes handles the rest.

---

# Target Users

Payoes is designed for developers and businesses building on Stellar.

Examples include:

- SaaS platforms
- AI applications
- Marketplaces
- Agencies
- Freelancers
- Creator platforms
- Digital product stores
- Donation platforms
- Subscription businesses
- Developer tools

---

# Core Principles

## Developer First

Every feature starts with an API.

The dashboard exists to manage resources, while APIs remain the primary interface.

---

## API Driven

Everything available in the dashboard should also be available through APIs.

Nothing should exist exclusively in the UI.

---

## Blockchain Abstracted

Developers should not need to understand Stellar internals.

Payoes abstracts blockchain complexity into simple APIs.

---

## Open Source

The project is fully open source.

Developers can self-host, contribute, audit, and extend the platform.

---

## Modular

Every component should be independently maintainable.

Examples:

- Checkout
- Webhooks
- Payment Engine
- API
- Dashboard
- Blockchain Service

---

# Core Features

## Merchant Dashboard

Central dashboard for managing payment operations.

Features:

- Revenue overview
- Recent transactions
- Payment links
- API keys
- Webhooks
- Settings

---

## Payments

Create blockchain payments.

Supported assets:

- USDC
- XLM
- Custom Stellar Assets

## Payment Intents

Core payment records (`pay_...`), equivalent to Stripe Payment Intents.

Capabilities:

- One-time payments
- Custom amount
- Metadata
- Expiration
- Payment status
- Source tracking (`direct`, `checkout_session`, `payment_link`)

---

## Checkout Sessions

Hosted checkout flows (`cs_...`), equivalent to Stripe Checkout Sessions.

Each session creates an underlying payment intent and exposes a checkout URL at `/c/cs_...`.

---

## Payment Links

Reusable shareable links (`plink_...`), equivalent to Stripe Payment Links.

Example

```
https://pay.payoes.com/l/plink_xxxxxx
```

Each visit starts a new checkout session and payment intent.

Payment links can be shared through:

- Email
- WhatsApp
- Telegram
- QR Code
- Websites

---

## Invoices

Bill customers with draft-to-open invoices (`inv_...`).

Flow:

1. Create invoice (draft)
2. Finalize invoice to spawn checkout session + payment intent
3. Customer pays via hosted checkout
4. Invoice status becomes `paid`

---

## Subscriptions

Recurring billing (`sub_...`) with manual period billing.

Capabilities:

- Monthly or yearly intervals
- Linked customer
- Bill now creates a finalized invoice for the current period
- Period advances when the linked invoice is paid

---

## Hosted Checkout

Ready-to-use payment page.

Checkout includes:

- Merchant branding
- Payment amount
- Asset selection
- Wallet connection
- Transaction confirmation
- Success page
- Failure page

No frontend implementation required.

---

## Transactions

Track blockchain payments.

Every transaction stores:

- Payment ID
- Transaction Hash
- Asset
- Amount
- Sender
- Receiver
- Network
- Status
- Timestamp

---

## Customers

Merchants can organize payers.

Each customer contains:

- Name
- Email
- Wallet Address
- Notes
- Payment History

Customers can be reused across multiple payments.

---

## Webhooks

Receive real-time payment events.

Supported events:

- payment.created
- payment.completed
- payment.failed
- payment.expired

Webhook retries should be automatic.

---

## API Keys

Each merchant receives secure API credentials.

Capabilities:

- Generate API Keys
- Revoke Keys
- Rotate Keys
- View Usage

---

## API Logs

Developers can inspect every request.

Information includes:

- Endpoint
- Response
- Status Code
- Execution Time
- Timestamp

---

## Wallet Management

Merchants configure receiving wallets.

Wallet settings include:

- Default Receiving Wallet
- Testnet/Mainnet
- Asset Preferences

---

# Authentication

Dashboard Authentication

- Google OAuth
- GitHub OAuth
- Email Authentication

Checkout Authentication

No login required.

Customers simply connect a Stellar wallet when making a payment.

---

# Payment Flow

```
Merchant

↓

Login Dashboard

↓

Create Payment

↓

Generate Payment Link

↓

Share Link

↓

Customer Opens Checkout

↓

Connect Wallet

↓

Approve Transaction

↓

Payment Confirmed

↓

Blockchain Verification

↓

Webhook Delivered

↓

Dashboard Updated
```

---

# Dashboard Structure

```
Overview

Payments

Transactions

Payment Links

Customers

Developers
    API Keys
    Webhooks
    API Logs

Settings
```

---

# API Resources

```
POST   /payments
GET    /payments

POST   /payment-links
GET    /payment-links

POST   /customers
GET    /customers

GET    /transactions

POST   /webhooks
GET    /webhooks

POST   /api-keys
GET    /api-keys
```

---

# Developer Experience

Designed for minimal integration effort.

Features include:

- REST APIs
- OpenAPI Specification
- SDK
- Example Projects
- Sandbox
- Webhook Simulator
- Interactive API Documentation

---

# Technical Architecture

Frontend

- Next.js
- React
- Tailwind CSS

Backend

- Go
- Clean Architecture
- REST API

Database

- PostgreSQL

Cache

- Redis

Blockchain

- Stellar
- Soroban Smart Contracts

Infrastructure

- Docker
- OpenTelemetry
- Swagger/OpenAPI

---

# Future Features

Potential future capabilities include:

- Invoice Management
- Escrow Payments
- Split Payments
- Marketplace Payouts
- Multi-Organization Support
- SDK for multiple languages
- Embedded Checkout
- Payment Widgets
- QR Payments
- Stablecoin Swap
- Multi-network Support

---

# Design Philosophy

Payoes should feel like a modern developer platform.

Inspired by products such as Stripe, Vercel, Supabase, and Clerk.

Simple APIs.

Clean dashboard.

Excellent documentation.

Minimal integration time.

Powerful developer experience.

Blockchain should be invisible.

Developers build products.

Payoes handles payments.
````
