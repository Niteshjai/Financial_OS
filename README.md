# AssetMap

**Aadhaar-linked Asset Discovery & Visualisation Platform for India**

A platform where users verify identity via Aadhaar OKYC, grant consent through the Account Aggregator (AA) framework, and see a unified visual dashboard of all financial and physical assets.

```
┌─────────────────────────────────────────────────────────────────────┐
│                        ARCHITECTURE OVERVIEW                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────┐     ┌──────────────┐     ┌─────────────────────┐      │
│  │  React   │────▶│  Fastify     │────▶│  PostgreSQL 15     │      │
│  │  Frontend│◀─── │  Backend     │◀────│  (pgcrypto, UUID)  │      │
│  │  (Vite)  │     │  (TypeScript)│     └─────────────────────┘      │
│  └──────────┘     └──────┬──┬────┘     ┌─────────────────────┐      │
│       │                  │  │          │  Redis 7            │      │
│       │                  │  └────────▶ │  (Sessions, Cache) │      │
│  TailwindCSS v4          │             └─────────────────────┘      │
│  D3.js Charts            │             ┌─────────────────────┐      │
│  Zustand Store           ├────────────▶│  FastAPI (Python)  │      │
│                          │             │  (Reports, PDF)     │      │
│                          │             └─────────────────────┘      │
│                          │         External APIs                    │
│                    ┌─────┴──────────────────────┐                   │
│                    │                            │                   │
│              ┌─────▼─────┐  ┌──────────┐  ┌─────▼────┐              │
│              │ UIDAI     │  │ Setu AA  │  │ Surepass │              │
│              │ Aadhaar   │  │ Account  │  │ Land     │              │
│              │ OKYC      │  │ Aggregator│ │ Records  │              │
│              └───────────┘  └──────────┘  └──────────┘              │
│                                                                     │
│  Security: AES-256-GCM │ SHA-256 Aadhaar │ JWT RS256 │ TLS 1.3      │
│  Compliance: DPDP Act 2023 │ RBI 7-year audit │ AA ReBIT v2         │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Quick Start

### Prerequisites
- Node.js 20+
- Docker & Docker Compose
- Git

### 1. Clone & Setup

```bash
git clone <repo-url>
cd assetmap

# Copy environment file
cp backend/.env.example backend/.env
# Edit backend/.env with your credentials
```

### 2. Start with Docker

```bash
docker-compose up -d
```

This starts:
- **PostgreSQL 15** on port 5432
- **Redis 7** on port 6379
- **Backend (Fastify)** on port 3000
- **Python Microservice** on port 8001
- **Frontend** on port 5173

### 3. Start Without Docker (Development)

```bash
# Terminal 1: Backend
cd backend
npm install
npm run dev

# Terminal 2: Frontend
cd frontend
npm install
npm run dev
```

> **Note:** You need PostgreSQL and Redis running locally.

---

## Environment Variables

See [backend/.env.example](backend/.env.example) for the complete list. Key variables:

| Variable | Description |
|----------|-------------|
| `ENCRYPTION_KEY` | 32-byte hex key for AES-256-GCM |
| `AADHAAR_SALT` | Random salt for Aadhaar SHA-256 hashing |
| `JWT_PRIVATE_KEY` | RS256 private key (base64-encoded PEM) |
| `JWT_PUBLIC_KEY` | RS256 public key (base64-encoded PEM) |
| `SETU_CLIENT_ID` | Setu AA sandbox client ID |
| `SUREPASS_TOKEN` | Surepass API bearer token |

### Generating JWT Keys

```bash
# Generate RS256 key pair
openssl genrsa -out private.pem 2048
openssl rsa -in private.pem -pubout -out public.pem

# Base64 encode for .env
cat private.pem | base64 -w 0 > private_b64.txt
cat public.pem | base64 -w 0 > public_b64.txt
```

### Generating Encryption Key

```bash
# 32-byte hex key
openssl rand -hex 32
```

---

## Sandbox Credential Setup

### UIDAI (Aadhaar OKYC)
1. Register at [UIDAI Developer Portal](https://developer.uidai.gov.in)
2. Apply for AUA/KUA license (sandbox)
3. Set `UIDAI_AUA_CODE`, `UIDAI_LICENSE_KEY` in `.env`

> **Dev mode:** The app uses mock OKYC responses when `NODE_ENV=development`. Any 6-digit OTP is accepted.

### Setu Account Aggregator
1. Sign up at [Setu Bridge](https://bridge.setu.co)
2. Create an AA sandbox product
3. Set `SETU_CLIENT_ID`, `SETU_CLIENT_SECRET`, `SETU_PRODUCT_INSTANCE_ID`

> **Dev mode:** Mock financial data is generated automatically.

### Surepass (Land Records)
1. Register at [Surepass](https://surepass.io)
2. Get API token from dashboard
3. Set `SUREPASS_TOKEN` in `.env`

> **Dev mode:** Mock land records are returned for supported states.

### MSG91 (SMS Notifications)
1. Register at [MSG91](https://msg91.com/)
2. Get API Auth Key and set up templates for alerts
3. Set `MSG91_AUTH_KEY`, `MSG91_TEMPLATE_BALANCE_DROP`, `MSG91_TEMPLATE_NEW_ACCOUNT`, and `MSG91_TEMPLATE_LAND_CHANGE` in `.env`

### Firebase Admin (Push Notifications)
1. Create a Firebase project
2. Generate a new private key from Project Settings > Service Accounts
3. Set `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, and `FIREBASE_PRIVATE_KEY` in `.env`

---

## Consumer Engagement Features

AssetMap goes beyond simple data aggregation by actively protecting users and their families through five core engagement features:

1. **Asset Change Alerts:** Daily snapshot comparisons detect significant balance drops (>20% and >₹500,000), new Aadhaar-linked accounts, or changes to land ownership records. Alerts are sent via Push Notifications and SMS (via MSG91, limited to 3 per day/user).
2. **Nominee Checker:** Analyzes Account Aggregator data to identify financial accounts lacking registered nominees, promoting compliance with RBI mandates (Dec 2025).
3. **Unified Nominee Update Platform:** Allows users to fill out a single form to instantly update missing nominees across all assets at once, queuing and fanning out requests securely to Mutual Funds, KRA, and Banks.
4. **Dormant Account Finder:** Scans transaction histories to find accounts with no activity for >12 months. Calculates the risk of balances being transferred to the IEPF (Investor Education and Protection Fund) if inactive for 7+ years.
5. **Net Worth Tracker:** Automatically decrypts and rolls up all daily asset snapshots into a unified monthly net worth history visualized with dynamic D3.js area charts.

---

## API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/aadhaar/initiate` | No | Generate Aadhaar OTP |
| POST | `/api/auth/aadhaar/verify` | No | Verify OTP, get JWT |
| POST | `/api/auth/refresh` | No | Refresh access token |
| DELETE | `/api/auth/logout` | Yes | Logout, revoke tokens |
| POST | `/api/consent/create` | Yes | Create AA consent |
| GET | `/api/consent/status/:id` | Yes | Check consent status |
| POST | `/api/consent/callback` | No | Setu webhook |
| DELETE | `/api/consent/:id` | Yes | Revoke consent |
| GET | `/api/assets/summary` | Yes | Net worth + breakdown |
| GET | `/api/assets/financial` | Yes | All financial assets |
| POST | `/api/assets/refresh` | Yes | Re-fetch AA data |
| GET | `/api/assets/land` | Yes | Land records |
| POST | `/api/assets/land/search` | Yes | Manual land search |
| POST | `/api/estate/file` | Yes | File estate case |
| GET | `/api/estate/:id` | Yes | Case status |
| GET | `/api/estate/:id/assets` | Yes | Discovered assets |
| GET | `/api/reports/generate` | Yes | Generate PDF report |
| GET | `/api/reports/:id/download` | Yes | Download PDF |
| GET | `/api/reports/audit-log` | Yes | User's audit trail |
| POST | `/api/auth/user/delete` | Yes | DPDP right to erasure |
| GET | `/api/health` | No | Service health check |
| GET | `/api/engagement/alerts` | Yes | Get unread alerts and feed |
| POST | `/api/engagement/alerts/read-all` | Yes | Mark all alerts as read |
| GET | `/api/engagement/alerts/preferences` | Yes | Get alert preferences |
| PATCH | `/api/engagement/alerts/preferences` | Yes | Update alert preferences |
| GET | `/api/engagement/nominee/status` | Yes | Get nominee checker status |
| POST | `/api/v1/nominate` | Yes | Submit unified nominee update request |
| GET | `/api/engagement/dormant` | Yes | Get dormant accounts list |
| POST | `/api/engagement/dormant/:accountId/acknowledge` | Yes | Acknowledge dormant alert |
| GET | `/api/engagement/networth/history` | Yes | Get net worth historical data |
| GET | `/api/engagement/networth/latest` | Yes | Get latest net worth snapshot |

All responses use envelope: `{ success: boolean, data?: any, error?: { code, message } }`

---

## Security

- **Aadhaar:** SHA-256 + salt hash only — raw number never stored
- **PII:** AES-256-GCM column-level encryption
- **JWT:** RS256 algorithm, httpOnly cookies, 15min access / 7day refresh with Redis session invalidation
- **Rate Limiting:** Fastify rate limiting + Redis OTP brute-force protection
- **Audit:** Immutable append-only PostgreSQL table (DB trigger enforced)
- **Documents:** AWS S3 SSE encryption, presigned URLs only
- **Headers:** Helmet (HSTS, CSP, XSS protection)
- **Logging:** Winston with PII masking (Aadhaar, PAN, mobile redacted)

---

## Compliance

| Regulation | Implementation |
|-----------|---------------|
| DPDP Act 2023 | Plain-language consent, right to erasure, audit trail |
| RBI Guidelines | 7-year immutable audit log retention |
| AA Framework | ReBIT v2 standard consent artefacts |
| UIDAI Guidelines | Never store raw Aadhaar, salted hash only |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Node.js, Fastify, TypeScript |
| Microservice | Python, FastAPI, ReportLab (PDFs) |
| Frontend | React 18, Vite, TailwindCSS v4, D3.js |
| Database | PostgreSQL 15 (pgcrypto) |
| Cache & Sessions | Redis 7 |
| Auth | JWT RS256 + Redis Sessions + Aadhaar OKYC |
| AA | Setu Account Aggregator SDK |
| Land | Surepass Land Record API |
| Storage | AWS S3 (SSE, ap-south-1) |
| Logging | Winston (structured JSON, PII masked) |
| Validation | Fastify native JSON Schemas |

---

## License

Proprietary. All rights reserved.
