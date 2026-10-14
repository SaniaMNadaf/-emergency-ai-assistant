# Healthcare AI Emergency Assistant

Offline-first PWA for AI-powered emergency triage in rural clinics.

## Quick Start (Dev)

```bash
npm install
npm run dev
```

## Tech Stack

- **Frontend:** React 19 + Vite 8 + PWA (Vite PWA plugin / Workbox)
- **Backend:** Supabase (Postgres + PostGIS + Realtime)
- **Speech:** Web Speech API (browser native)
- **Deploy:** Vercel

## Demo Accounts

All passwords are `demo`:

| Role       | Email                | Description          |
|------------|----------------------|----------------------|
| Bystander  | bystander@demo.com   | Reports emergencies  |
| Doctor     | doctor@demo.com      | Responds to alerts   |
| Family     | family@demo.com      | Read-only dashboard  |

## Environment

Copy `.env.example` to `.env.local` and add your Supabase credentials:

```bash
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-anon-key
```

## Block 0 Checklist

- [ ] Vite PWA project created
- [ ] Online/offline banner working
- [ ] Auth page with 3 demo accounts
- [ ] Location permission requested
- [ ] Camera + microphone permission tested
- [ ] Speech recognition (English) tested
- [ ] Text-to-speech tested
- [ ] Deployed to Vercel, loads on phone

## Build Script (3-minute demo)

See Block 5 for the demo run script.
