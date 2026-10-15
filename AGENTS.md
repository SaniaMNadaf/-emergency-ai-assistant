# Project: Healthcare AI Assistant

## Build Commands
- `npm run lint` — oxlint (no errors, only warnings)
- `npm run build` — Vite production build with PWA
- `npm run dev` — Vite dev server (port 5173)
- `npm run dev:all` — Run both Vite dev server and API server concurrently

## API Routes
API handlers live in `api/` and are served by the standalone dev server (`server/dev-api.mjs`, port 8787).
- `/api/health` — Health check endpoint
- `/api/match-responders` — Find nearby responders by incident type
- `/api/incident-graph` — Fetch protocol tree by incident type from Neo4j
- `/api/incident-report` — Create an incident in Neo4j
- `/api/protocol-guard` — AI guardrail check for protocol steps

## Scripts
- `npm run sync:graph` — Sync Supabase data into Neo4j graph
- `npm run test:graph` — Verify Neo4j graph data integrity

## Environment
- `.env.local` contains secrets — never commit
- Required env vars: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `NEO4J_URI`, `NEO4J_USERNAME`, `NEO4J_PASSWORD`, `GEMINI_API_KEY`
