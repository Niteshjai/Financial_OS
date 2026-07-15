# AssetMap Backend - Developer Guide

Welcome to the AssetMap Backend! This document outlines the architecture, capabilities, and background processes running our Fastify Node.js server.

## Tech Stack Overview
- **Framework:** Fastify (Node.js)
- **Language:** TypeScript
- **Database:** PostgreSQL 15 (using `pg` driver)
- **Cache & Rate Limiting:** Redis 7
- **Security:** AES-256-GCM (Crypto), SHA-256, JWT (RS256)
- **Scheduling:** `node-cron`

## Complete Feature Set

### 1. Secure Authentication & Compliance
- **UIDAI Aadhaar OKYC Integration:** Handles OTP generation/validation. Never stores the raw Aadhaar (SHA-256 salted hashing).
- **Session Management:** Stateful session control using Redis and short-lived JWTs (RS256) in httpOnly cookies.
- **DPDP Act Compliance:** Immutable background audit logs enforced by PostgreSQL triggers. 
- **Right to Erasure Endpoint:** Completely purges all PII and decrypts user data upon request (`/auth/user/delete`).

### 2. Financial & Physical Asset Aggregation
- **Setu Account Aggregator FIU:** Generates AA consent links, handles Setu webhooks, and securely stores multi-bank FI data (Deposits, Equities, MF, NPS, Insurance).
- **Surepass Land Records:** Automated API integration to fetch, normalize, and store official real estate records and coordinates based on user ID.
- **Automated Data Refresh:** Endpoints to seamlessly trigger background re-fetches from FIUs and Land registries.

### 3. Data Privacy & Encryption Engine (CRITICAL)
- **Column-Level PII Encryption:** AES-256-GCM encryption natively handled in `services/encryption.ts`. All names, balances, and raw JSONs are physically encrypted before reaching the database.
- **Decryption-on-the-fly:** Safely decrypts requested data only when transmitting to authorized authenticated frontend requests.

### 4. Background Workers & Engagement Automation
- **Net Worth Rollup Worker (6:00 AM IST):** Securely decrypts all user balances in Node.js memory, calculates the total sum, and stores an aggregated daily/monthly Net Worth snapshot.
- **Asset Change Monitoring Worker (8:00 AM IST):** Compares today's snapshot against yesterday's. Automatically triggers alerts if there is a >20% balance drop, newly opened Aadhaar-linked accounts, or modified land records.
- **Land Sync Worker:** Periodically checks for background updates to property coordinates.

### 5. Automated Alerting & Notification Dispatcher
- **Dormant Account Analysis Engine:** Calculates account inactivity strictly using 6+ months of transaction history. Flags >12mo inactivity and calculates exact IEPF 7-year transfer risk dates.
- **Nominee Validation Engine:** Parses complex JSON financial schemas to verify if nominees are actively registered across all banks.
- **MSG91 SMS Gateway Integration:** Dispatches critical SMS alerts. Rate-limited by Redis to max 3 messages per day/user to prevent spam.
- **Firebase Push Notifications:** Directly pushes alerts to the user's mobile device via `fcm_token`.

### 6. PDF Generation (Python Microservice Hook)
- Provides internal hooks to trigger a FastAPI Python microservice to generate and serve downloadable PDF Asset Reports.

## File Structure
```text
src/
├── db/                  # PostgreSQL connection and SQL Migrations
├── middleware/          # JWT Auth validation and Error Handlers
├── models/              # DB query wrappers (AssetSnapshot, User, Consent)
├── routes/              # Fastify API route controllers
│   ├── alerts.ts        # Engagement APIs (Nominees, Dormant, Net Worth)
│   ├── assets.ts        # Financial Data APIs
│   ├── auth.ts          # OKYC and session APIs
│   └── land.ts          # Real estate APIs
├── services/            # Business Logic & 3rd Party Integrations
│   ├── accountAggregator.ts
│   ├── alertService.ts
│   └── encryption.ts    # AES-256 logic for PII masking
└── workers/             # Background CRON Jobs
```

## How It Works (The Developer Workflow)

### 1. Data Encryption (CRITICAL)
- **Never store plaintext PII or balances.** 
- Before inserting into PostgreSQL, you MUST pass sensitive fields (Name, Phone, Balance, Raw JSON) through `encryptPII()` from `services/encryption.ts`.
- Before sending data to the frontend via API routes, use `decryptPII()`.
- The database schema strictly uses `TEXT` for encrypted fields (e.g., `balance_encrypted`).

### 2. Background Workers
- The application relies heavily on `node-cron` to process data asynchronously.
- Workers live in `src/workers` and are registered in `src/index.ts` *after* the server listens.
- If a worker needs to do math on encrypted fields (like the Net Worth worker), it must fetch the rows, decrypt them in Node.js, compute the aggregate, and then insert the result back.

### 3. Alerting System (MSG91 + Firebase)
- Alerts are generated via `alertService.ts`.
- The system prevents spam by using Redis limits (`sms:count:{userId}:{date}`).
- Before sending an SMS, verify the limit is not breached.

## Running Locally
```bash
npm install
npm run dev
```
Runs on `http://localhost:3000`. Ensure PostgreSQL and Redis are running locally or via Docker.
Make sure you have run the database migrations in `src/db/migrations` using `psql` or a runner script.
