# Copilot Instructions for AssetMap

## Build, test, and lint commands

Run commands from each service directory.

### Frontend (`frontend/`)

```bash
npm run dev
npm run build
npm run lint
```

- There is no configured test runner in `frontend/package.json` right now, so no single-test command exists yet.

### Backend (`backend/`)

```bash
npm run dev
npm run build
npm run typecheck
npm run security:check
```

- There is no configured test runner in `backend/package.json` right now, so no single-test command exists yet.

### Python service (`python-service/`)

```bash
uvicorn main:app --reload --port 8000
```

- Dependencies are managed with:

```bash
pip install -r requirements.txt
```

- There is no configured test runner in `python-service/` right now, so no single-test command exists yet.

## High-level architecture

AssetMap is a 3-service system:

1. **Frontend SPA (React + Vite + Zustand)** in `frontend/` handles login, consent flow, dashboard, recovery/unclaimed flows, and plan/billing UI.
2. **Backend API (Fastify + TypeScript)** in `backend/` exposes `/api/*` endpoints, enforces auth/session controls, orchestrates external integrations, and runs scheduled workers.
3. **Python microservice (FastAPI)** in `python-service/` provides internal report/analytics endpoints; currently includes PDF report generation under `/internal/reports/generate`.

Core request/data flow:

1. Frontend calls `${VITE_API_URL}/api/*` with `credentials: include` (cookie-based auth).
2. Backend verifies JWT from `access_token` cookie and validates session state (Redis-backed session checks).
3. Backend routes aggregate financial/land/recovery/plan data, and invokes workers for periodic sync/snapshot/alert jobs.
4. For reporting, backend calls the Python service internal endpoints.

## Key conventions in this repository

### Auth/session handling is cookie-first and refresh-aware

- Frontend API wrapper (`frontend/src/services/api.ts`) centralizes fetch behavior:
  - always sends cookies (`credentials: include`)
  - auto-retries once after `/auth/refresh` on 401
  - queues concurrent failed requests during token refresh (`failedQueue`)
  - emits `upgrade-required` browser event on HTTP 402 for plan-gated UX

### Backend routes are modular and mounted under explicit prefixes

- Route modules live in `backend/src/routes/` and are mounted in `backend/src/index.ts` (mostly under `/api/*`).
- Add new APIs by creating route modules and registering them in `registerRoutes()`, keeping prefix ownership explicit.

### Environment validation is strict (fail fast)

- Backend env is validated with Zod in `backend/src/config/env.ts`.
- Invalid/missing critical configuration exits startup (`process.exit(1)`), so new config must be added to schema + environment values together.

### Sensitive-data handling conventions

- Backend has explicit crypto utilities in `backend/src/utils/encryption.ts`:
  - AES-256-GCM helpers (`encryptPII` / `decryptPII`)
  - salted SHA-256 hashing for Aadhaar/mobile/email lookup material
- Security-sensitive features should reuse these helpers instead of introducing alternate crypto patterns.

### MOCK_MODE behavior is intentional and wired into auth middleware

- In `backend/src/middleware/auth.ts`, `MOCK_MODE=true` bypasses JWT verification and injects a fixed mock user.
- Any auth-sensitive changes should preserve this dev/testing path.

### State management pattern on frontend

- Global app state uses Zustand stores in `frontend/src/store/`.
- `assetStore` persists to `sessionStorage` via `persist(createJSONStorage(...))`, and also stores auth user under `authUser`.
- Session bootstrap in `frontend/src/App.tsx` calls `getSession()` once and gates protected routes via `authChecked`.
