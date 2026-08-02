# AssetMap Architecture

This document provides a visual overview of the AssetMap system architecture.

## System Architecture Diagram

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                          ASSETMAP ARCHITECTURE OVERVIEW                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────┐      ┌─────────────────┐      ┌────────────────────────┐  │
│  │ React Client │◀────▶│ Fastify Backend │◀────▶│ PostgreSQL 15 (DB)     │  │
│  │ (Vite/D3.js) │      │ (TypeScript)    │      │ (pgcrypto, AES-256-GCM)│  │
│  └──────────────┘      └──────┬───┬───┬──┘      └────────────────────────┘  │
│                               │   │   │                                     │
│                               │   │   │         ┌────────────────────────┐  │
│                               │   │   └────────▶│ Redis 7 (Cache, Queue) │  │
│                               │   │             └──────────┬─────────────┘  │
│                               │   │                        │                │
│                               │   │             ┌──────────▼─────────────┐  │
│                               │   └────────────▶│ BullMQ Workers         │  │
│                               │                 │ - Net Worth Rollup     │  │
│                               │                 │ - Asset Change Monitor │  │
│                               │                 │ - Nominee Updater      │  │
│                               │                 └────────────────────────┘  │
│                               │                                             │
│                               │                 ┌────────────────────────┐  │
│                               └────────────────▶│ FastAPI (Python)       │  │
│                                                 │ (PDF Generation)       │  │
│                                                 └────────────────────────┘  │
│                                                                             │
│                     Third-Party Integrations & External APIs                │
│             ┌─────────────────┴───────────────────┴────────────────┐        │
│             │                                                      │        │
│  ┌──────────▼────────┐ ┌──────────▼──────────┐ ┌───────────────────▼─────┐  │
│  │ Identity & Data   │ │ Engagement & Alerts │ │ Registrar & Transfer    │  │
│  │ - UIDAI (OKYC)    │ │ - MSG91 (SMS)       │ │ - MFCentral (Mutual F.) │  │
│  │ - Setu (AA)       │ │ - Firebase (Push)   │ │ - KRA (Equities)        │  │
│  │ - Surepass (Land) │ │                     │ │ - Bank APIs             │  │
│  └───────────────────┘ └─────────────────────┘ └─────────────────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Key Components

### 1. Frontend (React / Vite)
- Built with React 18, utilizing Vite for fast builds.
- State is managed via **Zustand**.
- Uses **TailwindCSS** for styling and **D3.js** for rendering interactive financial charts.

### 2. Backend (Fastify / Node.js)
- High-performance API built on **Fastify** and **TypeScript**.
- Enforces strict security standards including **AES-256-GCM** encryption for all PII before storing in PostgreSQL.
- Implements stateful session management with **RS256 JWTs** validated against Redis.

### 3. Data Persistence
- **PostgreSQL 15:** The primary datastore. All sensitive user data (balances, names, raw JSONs) is encrypted on the application layer before reaching the DB.
- **Redis 7:** Used for short-lived session caching, rate limiting, and as the backing datastore for BullMQ.

### 4. Background Workers & Queues (BullMQ)
- **Net Worth Rollup:** Decrypts daily balances, aggregates total net worth, and snapshots it.
- **Asset Change Monitor:** Compares daily snapshots to generate alerts for massive drops or newly linked unauthorized accounts.
- **Unified Nominee Updater:** Queues nominee update requests and fans them out to mock Registrar & Transfer Agents (RTAs) asynchronously.

### 5. Third-Party Integrations
- **UIDAI:** Handles Aadhaar OKYC and OTP generation for passwordless login.
- **Setu AA:** Account Aggregator for fetching secured financial data (Deposits, Equities, Mutual Funds, NPS, Insurance).
- **Surepass:** Fetches registered land records.
- **MSG91 & Firebase:** Dispatches SMS and Push Notification alerts to the user.
