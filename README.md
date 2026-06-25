# DataViews.pro

**SFMC Data View Reference & SQL Workspace** — an interactive schema browser and SQL generator for Salesforce Marketing Cloud practitioners.

Live at [dataviews.pro](https://dataviews.pro).

## What it does

- Browse **29+ system Data Views** with field types, descriptions, and join metadata
- **Search** across tables and fields; hover relations to cross-highlight FK paths
- **Select cards** on the canvas and generate SQL with **BFS auto-join** pathfinding
- **SQL Sandbox** with utilities (date filters, subscriber status, unique events, target DE scaffolding)
- **SQL Templates** for common practitioner queries (bounces, ghost subscribers, automation failures)
- **Shareable workspace URLs** — copy link to preserve selections and sandbox settings
- **AI Copilot** (sign-in required) for query design assistance
- Static **SEO reference pages** at `/views/{table}/` for every data view

## Tech stack

| Layer | Choice |
|-------|--------|
| UI | Vite + React 19 + TypeScript |
| Styling | Tailwind CSS |
| SQL editor | CodeMirror 6 (`@uiw/react-codemirror`) |
| Auth | Supabase |
| AI | OpenAI via Vercel serverless (`/api/chat`) |
| Hosting | Vercel |

## Local development

```bash
npm install
cp .env.example .env.local
# Fill VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY for Copilot auth (optional for schema/SQL)
npm run dev
```

Open `http://localhost:5173`.

### Environment variables

See `.env.example`. Summary:

| Variable | Scope | Purpose |
|----------|-------|---------|
| `VITE_SUPABASE_URL` | Client | Auth for AI Copilot |
| `VITE_SUPABASE_ANON_KEY` | Client | Auth for AI Copilot |
| `VITE_GA_MEASUREMENT_ID` | Client | Google Analytics (production) |
| `OPENAI_API_KEY` | Server | AI Copilot responses |
| `SUPABASE_SERVICE_ROLE_KEY` | Server | Usage quota tracking |
| `STAGING_PASSWORD` | Server / build | Optional pre-launch gate — **omit for public launch** |
| `STAGING_COOKIE_SECRET` | Server | **Required in production** when `STAGING_PASSWORD` is set |

Local API routes (`/api/chat`, `/api/usage`, `/api/staging`) are proxied in dev via `vite.config.ts`.

### Supabase migration (AI quota)

Apply `supabase/migrations/20260624000000_reserve_copilot_slot.sql` in the Supabase SQL editor so daily Copilot limits are enforced atomically. The API falls back to the legacy path until this migration is applied.

## Scripts

```bash
npm run dev      # Start dev server
npm run build    # Typecheck + production build (regenerates SEO/legal static pages)
npm run preview  # Preview production build
npm test         # Vitest unit tests
npm run lint     # ESLint
```

## Project structure

```
src/
  components/     # UI (Header, DataViewCard, SqlGenerator, AiCopilot, …)
  constants/      # Brand, canvas density, sandbox layout
  data/schemas/   # SFMC Data View field definitions (source of truth)
  build/          # SEO + legal static page generators
  utils/          # SQL generator, workspace URL persistence, schema explorer
api/              # Vercel serverless handlers (chat, usage, staging)
public/views/     # Generated static reference HTML (do not hand-edit)
```

## Workspace URL sharing

Selections and sandbox preferences sync to the query string (`?seg=core&t=_Sent,_Open&sb=1`, …). Use **Copy link** in the command toolbar to share with colleagues.

## SEO static pages

`npm run build` regenerates:

- `/views/` — index of all data views
- `/views/{slug}/` — per-table reference with example SQL
- `/guides/` — practitioner SQL articles (joins, journeys, performance)
- `/privacy/`, `/terms/`
- `public/sitemap.xml`

## License

Proprietary — © Ujjwal Tiwari. All rights reserved.
