# Payoes AI Context

## Overview

**Payoes** is a stablecoin-first digital banking application built on the Stellar network.

It is **not a crypto wallet** in the traditional sense. The goal is to make stablecoins feel as easy to use as money in a modern digital bank.

Inspired by digital banking experiences like Bank Jago, Payoes focuses on money management instead of crypto trading.

Users should rarely see blockchain terminology. Stellar serves as the infrastructure powering the application behind the scenes.

---

# Vision

> **Do it all with Stablecoins.**

Payoes enables users to:

- Store stablecoins
- Organize funds with Pockets
- Send and receive payments
- Pay using QR
- Swap stablecoins
- Earn passive yield
- Track financial goals
- Transfer money across borders

The experience should feel like using a digital bank, not a crypto exchange.

---

# Design Principles

## Banking First

Every feature should resemble a banking application rather than a crypto wallet.

Avoid emphasizing:

- Wallet Address
- Blockchain
- Gas Fees
- Smart Contract
- Seed Phrase (unless necessary)

Prefer language like:

- Balance
- Account
- Pocket
- Transfer
- Send Money
- Receive
- Savings
- Earn
- Payment

---

## Simplicity

Users should not need blockchain knowledge.

The application should abstract away technical complexity wherever possible.

---

## Stablecoin Native

Everything revolves around stablecoins.

Examples include:

- USDC
- EURC
- Other Stellar-issued stable assets

No focus on speculative tokens or trading.

---

# Target Users

- Freelancers
- Remote workers
- Digital nomads
- Small businesses
- Students
- Families
- Everyday users
- Cross-border payment users

---

# Core Features

## Wallet

The wallet is the user's primary account.

Features:

- Multi-stablecoin support
- Total portfolio balance
- Send
- Receive
- QR payment
- Transaction history
- Asset management

---

## Pockets

Inspired by Bank Jago's pockets.

Pockets allow users to separate money based on purpose.

Examples:

- Daily Spending
- Bills
- Emergency Fund
- Vacation
- Education
- Business
- Savings

Each pocket contains:

- Name
- Icon
- Color
- Balance
- Goal (optional)
- Earn status

Users can create unlimited pockets.

---

## Internal Transfers

Move funds instantly between pockets.

Example:

Daily Spending

↓

Vacation

↓

Emergency

---

## Smart Rules (Future)

Automate money movement.

Examples:

"When salary arrives"

- 10% → Savings
- 5% → Emergency
- Remaining → Daily

or

"Every Monday"

Move 20 USDC to Vacation Pocket.

---

## Send & Receive

Users can:

- Send money
- Receive money
- Scan QR
- Generate QR
- Share payment request

The experience should resemble a banking app.

---

## Social Payments

Instead of long Stellar addresses, users can use usernames.

Example:

@indra

instead of

GBKQ6....

The application maps usernames to Stellar addresses internally.

---

## QR Payments

Users can:

- Scan QR
- Pay instantly
- Request payment

QR may contain:

- recipient
- amount
- memo

---

## Cross Border Payments

One of the strongest use cases.

Examples:

Indonesia → Singapore

Indonesia → Philippines

Indonesia → Japan

Users should experience:

- Fast settlement
- Low fees
- Transparent transfers

---

## Swap

Users can swap between supported stablecoins.

Example:

USDC

↓

EURC

The swap experience should be simple and beginner friendly.

---

# Earn

Earn allows users to generate passive yield from idle stablecoins.

The UX should resemble a savings account or digital deposit product rather than DeFi.

Users should never be required to understand:

- Liquidity Pools
- Yield Farming
- Staking
- Smart Contracts

Instead, they simply enable:

Earn

and the system handles the complexity.

---

## Earn Modes

Examples:

### Flexible

- Withdraw anytime
- Lower APY

### Fixed

- 30 Days
- 60 Days
- 90 Days

Higher APY.

---

## Pocket Earn

Every Pocket can optionally enable Earn.

Example:

Emergency Fund

Balance:

1,250 USDC

Earn:

ON

Estimated APY:

4.5%

---

## Goal + Earn

Goals can continue earning while saving.

Example:

Japan Trip

Target:

3,000 USDC

Current:

1,850 USDC

Earn:

Enabled

Estimated completion:

5 months

---

# Analytics

Dashboard should help users understand finances.

Examples:

- Monthly Income
- Monthly Expenses
- Pocket Distribution
- Spending Categories
- Earn Performance
- Savings Progress

---

# Home Dashboard

The home screen should immediately answer:

- How much money do I have?
- Where is my money?
- What should I do next?

Sections:

- Total Balance
- Quick Actions
- My Pockets
- Recent Transactions
- Active Goals
- Total Earnings

---

# User Experience

The application should feel:

- Modern
- Friendly
- Clean
- Minimal
- Fast
- Premium

Avoid crypto exchange aesthetics.

Prefer digital banking aesthetics.

---

# Visual Style

Inspired by:

- Bank Jago
- Revolut
- Monzo
- N26

Characteristics:

- Rounded cards
- Large typography
- Soft shadows
- Plenty of whitespace
- Friendly illustrations
- Smooth animations

---

# Technical Foundation

Blockchain:

- Stellar

Primary Asset:

- USDC on Stellar

Potential Integrations:

- Stellar Wallet SDK
- Stellar RPC
- Horizon API
- Stellar DEX
- Soroban Smart Contracts (where appropriate)

---

# Product Philosophy

Payoes is not built for traders.

Payoes is built for people who want to use stablecoins as everyday money.

The blockchain should disappear into the background.

Users should simply feel like they are using the next generation of digital banking.

---

# Brand Personality

Keywords:

- Trustworthy
- Modern
- Simple
- Global
- Friendly
- Fast
- Secure
- Accessible
- Financial Freedom
- Everyday Banking

---

# One Sentence Pitch

**Payoes is a digital banking experience powered by Stellar, enabling anyone to save, spend, earn, and manage stablecoins as easily as using a modern bank.**
