# Healthcare AI Emergency Assistant

Offline-first PWA for AI-powered emergency triage in rural clinics, with Neo4j graph matching and Gemini AI agents.

## Quick Start (Dev)

Install dependencies from the repository root:

```bash
npm install
```

Start both services together:

```bash
npm run dev:all
```

Or start them separately in two terminals:

```bash
# Terminal 1 — React/Vite frontend (http://localhost:5173)
npm run dev

# Terminal 2 — API backend (http://localhost:8787)
npm run dev:api
```

The frontend proxies `/api` requests to the backend during local development.

## Tech Stack

- **Frontend:** React 19 + Vite 8 + PWA (Vite PWA plugin / Workbox)
- **Backend:** Supabase (Postgres + PostGIS + Realtime)
- **Speech:** Web Speech API (browser native)
- **Graph:** Neo4j Aura (HTTPS Query API)
- **AI:** Gemini Flash (server-side, never exposed to the browser)
- **Deploy:** Vercel

## Demo Accounts

All passwords are `demo1234`:

| Role       | Email                | Description          |
|------------|----------------------|----------------------|
| Bystander  | bystander@demo.com   | Reports emergencies  |
| Doctor     | doctor@demo.com      | Responds to alerts   |
| Family     | family@demo.com      | Read-only dashboard  |
| Patient    | patient@demo.com     | Patient record       |

## Environment

Copy `.env.example` to `.env.local` and add your credentials:

```bash
# Supabase (prefixed VITE_ because Vite injects them into the client bundle)
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-anon-key

# Server-side only — never use VITE_ prefix, never commit .env.local
NEO4J_URI=neo4j+s://your-neo4j-host
NEO4J_USER=your-neo4j-user
NEO4J_PASSWORD=your-neo4j-password
NEO4J_DATABASE=neo4j          # optional, defaults to neo4j

GEMINI_API_KEY=your-gemini-key  # optional, enables AI agent features
```

## SQL Files (run in order)

1. `backend/supabase/schema.sql` (if not already created) — tables, RPC, extensions
2. `backend/supabase/demo-extras.sql` — demo functions, policies, storage bucket

## Commands

| Command | Description |
|---------|-------------|
| `npm run dev:all` | Start frontend + backend together |
| `npm run dev` | Start the frontend only |
| `npm run dev:api` | Start the backend API only |
| `npm run build` | Build the frontend for production |
| `npm run lint` | Lint check |
| `npm run validate:protocols` | Validate protocol JSON trees |
| `npm run sync:graph` | Sync Supabase data to Neo4j |
| `npm run test:graph` | Run Cypher verification queries |

## Run Locally Checklist

- [x] Vite PWA project created
- [x] Online/offline banner working (via service worker)
- [x] Auth page with 4 demo accounts (password `demo1234`)
- [x] Location permission requested
- [x] Camera + microphone permission tested
- [x] Speech recognition (English) tested
- [x] Text-to-speech tested
- [x] Local API server (port 8787) running
- [x] Vite dev proxy configured for `/api`
- [ ] Deployed to Vercel (see end of project)

## 3-Minute Demo Script

See `DEMO.md` for the full rehearsal script.

## Architecture

```
frontend/               # React 19 + Vite PWA
  src/                  # UI, components, and browser-side clients
  public/protocols/     # Offline first-aid decision trees (JSON)
  vite.config.js        # Frontend build and local API proxy
backend/                # API and server-side tools
  api/                  # Vercel serverless functions (Node.js)
    _lib/neo4j.js       # Neo4j Aura HTTPS helper
    _lib/llm.js         # Gemini REST helper
  server/dev-api.mjs    # Local API server (port 8787)
  scripts/              # Protocol and graph scripts
  supabase/             # SQL migrations, seeds, and extras
  graph/                # Graph data model
package.json            # Root commands for frontend and backend
.env.local              # Shared local configuration (never committed)
```

### Safety Model

- First-aid instructions come **only** from pre-written JSON trees (`cpr.json`, `bleeding.json`, `choking.json`). No LLM ever writes medical advice.
- Models only classify input ("yes"/"no" intent) or summarize logged data for incident reports.
- Offline-first: protocols work with no internet. If `/api` is unreachable, the app falls back to existing Supabase logic or deterministic templates.
- Secrets stay on the server. LLM/Neo4j keys are never exposed with a `VITE_` prefix.
