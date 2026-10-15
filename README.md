# Healthcare AI Emergency Assistant

Offline-first PWA for AI-powered emergency triage in rural clinics, with Neo4j graph matching and Gemini AI agents.

## Quick Start (Dev)

```bash
# Terminal 1 — API server (Neo4j agents, LLM calls, all server-side)
npm run dev:api

# Terminal 2 — Vite frontend (UI + PWA)
npm run dev            # proxy passes /api to localhost:8787

# OR — run both at once
npm run dev:all
```

Or, alternatively:

```bash
npm install
npm run dev:all
```

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

1. `supabase/schema.sql` (if not already created) — tables, RPC, extensions
2. `supabase/demo-extras.sql` — demo functions, policies, storage bucket

## Commands

| Command | Description |
|---------|-------------|
| `npm run dev:all` | Start Vite + API server together |
| `npm run dev` | Start Vite only (API server must run separately) |
| `npm run dev:api` | Start API server only |
| `npm run build` | Production build |
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
src/                    # React 19 frontend (PWA, offline-first)
src/lib/                # Clients: supabase, speech, permissions
src/components/         # State-based screens (no router)
public/protocols/       # Offline first-aid decision trees (JSON)
api/                    # Vercel serverless functions (Node.js)
  _lib/neo4j.js         # Neo4j Aura HTTPS helper
  _lib/llm.js           # Gemini REST helper (returns null if key missing)
server/dev-api.mjs      # Local dev API server (port 8787)
supabase/               # SQL files to run in Supabase SQL Editor
scripts/                # Seed & sync scripts
```

### Safety Model

- First-aid instructions come **only** from pre-written JSON trees (`cpr.json`, `bleeding.json`, `choking.json`). No LLM ever writes medical advice.
- Models only classify input ("yes"/"no" intent) or summarize logged data for incident reports.
- Offline-first: protocols work with no internet. If `/api` is unreachable, the app falls back to existing Supabase logic or deterministic templates.
- Secrets stay on the server. LLM/Neo4j keys are never exposed with a `VITE_` prefix.
