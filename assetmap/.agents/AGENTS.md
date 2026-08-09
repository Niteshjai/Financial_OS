# AssetMap Project Context (Financial OS)

This file serves as the definitive reference guide for Antigravity (and other AI agents) working on the `assetmap` codebase. Read this to understand the project structure, architecture, and conventions without having to manually crawl the file tree.

## Architecture Overview

AssetMap is a full-stack financial application designed to help users track, update, and secure their financial assets (Bank Accounts, Mutual Funds, NPS, EPF, Insurance, Demat, etc.) and nominees.

The repository is split into three main services:

### 1. Frontend (`/frontend`)
- **Framework:** React 19 + Vite (TypeScript)
- **Styling:** Tailwind CSS v4, Lucide React (icons), Radix UI (primitives)
- **State Management:** Zustand (see `src/store/assetStore.ts`)
- **Key Directories:**
  - `src/components/`: Reusable UI components and feature-specific modules (e.g., `nominee/`, `recovery/`).
  - `src/pages/`: Top-level route components (e.g., `Dashboard.tsx`, `Login.tsx`).
  - `src/services/`: API client wrappers (e.g., `api.ts`, `auth.ts`, `nominee.ts`).
  - `src/store/`: Global Zustand stores.
- **Routing:** React Router DOM.
- **Conventions:** 
  - Use `api.get()`/`api.post()` from `src/services/api.ts` for all backend calls.
  - Rely on `useAssetStore` for global application state (like user data, tokens, and fetched assets).

### 2. Backend (`/backend`)
- **Framework:** Node.js with Fastify (TypeScript)
- **Database:** PostgreSQL (accessed via `pg` library)
- **Caching/Queue:** Redis
- **Key Directories:**
  - `src/db/`: Database connection (`connection.ts`), raw schema (`schema.sql`), and migrations (`migrations/`).
  - `src/routes/`: Fastify route handlers (e.g., `auth.ts`, `nominee.ts`, `alerts.ts`).
  - `src/services/`: Business logic and external service integrations.
  - `src/nominee/`: Complex orchestration logic for nominee updates (`nomineeOrchestrator.ts`).
  - `src/models/`: TypeScript interfaces and type definitions.
  - `src/middleware/`: Express/Fastify middlewares (e.g., `auth.ts` for JWT validation).
- **Conventions:**
  - Database queries are written in raw SQL using the `pg` pool (no heavy ORM).
  - PII (Personally Identifiable Information) must be encrypted using `encryptPII` before storing and decrypted using `decrypt` when retrieving.
  - Aadhaar numbers are only stored as hashes (`aadhaar_hash`).
  - Audit logs must be created for sensitive actions using valid `audit_action` enums.

### 3. Python Service (`/python-service`)
- Contains Python microservices and routers (likely for specialized data processing, scraping, or ML tasks).

## Database Schema Highlights

- `users`: Core user accounts.
- `canonical_assets`: The central truth for a user's financial assets. Stores `asset_class`, `institution_name`, `current_value`, and `has_nominee`.
- `nominee_status`: A tracking table used by the UI to display the current state of a user's nominee completeness.
- `nominee_profiles`: Stores the actual details of a nominee provided by a user.
- `nominee_update_batches` & `nominee_update_tasks`: Tracks the background processing of nominee updates (e.g., guided OTP, auto-submitted).
- `audit_logs`: Tracks critical user actions for security and compliance.

## Agent Guidelines for this Codebase

1. **Avoid Duplicating State:** When working on the frontend, check if the data should be stored globally in `useAssetStore` rather than local React state.
2. **Database Migrations:** If you need to alter the database schema, always create a new `.sql` migration file in `backend/src/db/migrations/` rather than modifying existing applied migrations (unless specifically debugging a failed migration).
3. **Task Synchronization:** Nominee updates heavily rely on tracking tasks in `nominee_update_tasks`. When modifying UI status, ensure you join or query this table to accurately reflect in-progress tasks, not just static completed states.
4. **Tool Specificity:** Always prioritize using specific tools over broad terminal commands. Use `view_file`, `replace_file_content`, and `grep_search`.

---
*Created by Antigravity.*
