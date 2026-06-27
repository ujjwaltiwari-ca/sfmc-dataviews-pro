# DataViews.pro

**SFMC Data View Reference & SQL Workspace** — an interactive schema browser and SQL generator for Salesforce Marketing Cloud practitioners.

Live at [dataviews.pro](https://dataviews.pro).

## What it does

- Browse **33 system Data Views** with field types, descriptions, join metadata, retention badges, and **known limitations** (⚠ on each card)
- **Search** across tables and fields (`field:JobID` syntax); hover relations to cross-highlight FK paths
- **Select cards** on the canvas and generate SQL with **BFS auto-join** pathfinding (Pathfinder)
- **SQL Sandbox** with safe-by-default utilities (30-day lookback, exclude test sends, unique events), subscriber filters, and Enterprise BU mode (`Ent.` prefix)
- **28 starter templates** across deliverability, engagement, journeys, SMS, and automation — filter by category or search
- **Saved queries** (sign-in) — store SQL, table selection, segment, and sandbox settings in Supabase (up to 10 per user)
- **Query history** and **shareable workspace URLs** — copy link to preserve selections and sandbox settings
- **AI Copilot** (sign-in required) for query design assistance
- Static **SEO reference pages** at `/views/{table}/` and **16 practitioner SQL guides** at `/guides/`

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
| `SUPABASE_SERVICE_ROLE_KEY` | Server | Usage quota tracking and saved queries API |
| `STAGING_PASSWORD` | Server / build | Optional pre-launch gate — **omit for public launch** |
| `STAGING_COOKIE_SECRET` | Server | **Required in production** when `STAGING_PASSWORD` is set |

Local API routes (`/api/chat`, `/api/usage`, `/api/staging`, `/api/saved-queries`) are proxied in dev via `vite.config.ts`.

### Supabase migrations

Apply these in the Supabase SQL editor (Dashboard → SQL Editor) before relying on the related features in production:

| Migration | Purpose |
|-----------|---------|
| `supabase/migrations/20260624000000_reserve_copilot_slot.sql` | Atomic daily Copilot quota (API falls back until applied) |
| `supabase/migrations/20260627000000_saved_queries.sql` | **Saved queries** table + RLS for authenticated users |

Saved queries require the second migration. Copilot auth uses the same Supabase project and Vercel env vars as before — no new client secrets.

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
api/              # Vercel serverless handlers (chat, usage, staging, saved-queries)
public/views/     # Generated static reference HTML (do not hand-edit)
public/guides/    # Generated practitioner SQL guides (do not hand-edit)
supabase/migrations/  # SQL to apply manually in Supabase dashboard
```

## Workspace URL sharing

Selections and sandbox preferences sync to the query string (`?seg=core&t=_Sent,_Open&sb=1`, …). Use **Copy link** in the command toolbar to share with colleagues.

## SQL Sandbox tabs

| Tab | Description |
|-----|-------------|
| **Live Query** | Card-driven SQL generation with Pathfinder joins and utility toggles |
| **Starter Templates** | 28 practitioner patterns — filter by category or search |
| **History** | Local snapshots of recent SQL (last 20, browser-only) |
| **Saved** | Cloud saved queries (sign-in, up to 10) — restore SQL, tables, and filter state |

Use **Save query** in the sandbox toolbar (sign-in required) to store your current workspace. Safe SQL defaults (30-day lookback, test-send exclusion) apply automatically when you select tracking views.

## SEO static pages

`npm run build` regenerates:

- `/views/` — index of all data views
- `/views/{slug}/` — per-table reference with example SQL
- `/guides/` — **16** practitioner SQL articles (joins, deliverability, journeys, SMS, performance)
- `/privacy/`, `/terms/`
- `public/sitemap.xml`

Guide source of truth: `src/content/seoGuides.ts`. Limitation notes: `src/data/tableMetadata.ts`.

## License

Proprietary — © Ujjwal Tiwari. All rights reserved.
