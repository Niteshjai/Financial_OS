# AssetMap Architecture

This document provides a visual overview of the AssetMap system architecture.

## System Architecture Diagram

`mermaid
flowchart TD
    %% Define Styles
    classDef frontend fill:#3b82f6,stroke:#1d4ed8,stroke-width:2px,color:#ffffff
    classDef backend fill:#10b981,stroke:#047857,stroke-width:2px,color:#ffffff
    classDef database fill:#f59e0b,stroke:#b45309,stroke-width:2px,color:#ffffff
    classDef cache fill:#ef4444,stroke:#b91c1c,stroke-width:2px,color:#ffffff
    classDef external fill:#8b5cf6,stroke:#6d28d9,stroke-width:2px,color:#ffffff
    classDef queue fill:#f97316,stroke:#c2410c,stroke-width:2px,color:#ffffff

    %% User Layer
    User((User / Browser)):::frontend

    %% Frontend
    subgraph Client [Client Side]
        React[React Frontend<br/>Vite + TailwindCSS + Zustand]:::frontend
    end

    %% API Layer
    subgraph Server [Backend Infrastructure]
        Fastify[Fastify Node.js API<br/>TypeScript]:::backend
        Auth[Auth & JWT<br/>RS256]:::backend
        Crypto[Encryption Engine<br/>AES-256-GCM]:::backend
        
        FastAPI[Python Microservice<br/>PDF Generation]:::backend
    end

    %% Queues and Workers
    subgraph Workers [Background Jobs & Queues]
        BullMQ[BullMQ Queue Manager]:::queue
        NetWorthWorker[Net Worth Rollup Worker]:::queue
        AlertWorker[Asset Change Monitor]:::queue
        NomineeWorker[Unified Nominee Adapter]:::queue
    end

    %% Data Layer
    subgraph Data [Data Persistence]
        Postgres[(PostgreSQL 15<br/>Encrypted PII)]:::database
        Redis[(Redis 7<br/>Sessions, Caching, BullMQ)]:::cache
    end

    %% External Services
    subgraph ExternalServices [Third-Party Integrations]
        UIDAI[UIDAI<br/>Aadhaar OKYC]:::external
        SetuAA[Setu<br/>Account Aggregator]:::external
        Surepass[Surepass<br/>Land Records]:::external
        MSG91[MSG91<br/>SMS Gateway]:::external
        Firebase[Firebase<br/>Push Notifications]:::external
        RTAs[RTAs / Banks<br/>MFCentral, KRA]:::external
    end

    %% Connections
    User <-->|HTTPS/JWT| React
    React <-->|REST API| Fastify
    
    Fastify --> Auth
    Fastify --> Crypto
    
    %% DB Connections
    Crypto <-->|Encrypted Read/Write| Postgres
    Fastify <-->|Cache/Sessions| Redis
    
    %% Workers & Queues
    Fastify -->|Enqueue Jobs| BullMQ
    BullMQ <--> Redis
    BullMQ --> NetWorthWorker
    BullMQ --> AlertWorker
    BullMQ --> NomineeWorker
    
    %% Worker DB Access
    NetWorthWorker <--> Postgres
    AlertWorker <--> Postgres
    NomineeWorker <--> Postgres
    
    %% Microservice
    Fastify <-->|Trigger PDF| FastAPI
    
    %% External API Connections
    Fastify <-->|Verify OTP| UIDAI
    Fastify <-->|Consent/Data| SetuAA
    Fastify <-->|Property Data| Surepass
    AlertWorker -->|Send Alerts| MSG91
    AlertWorker -->|Push Notifications| Firebase
    NomineeWorker -->|Update Nominee| RTAs

`

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
