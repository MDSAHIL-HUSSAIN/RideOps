# RideOps Resolution OS

An evidence-led support investigation workspace built for the RideOps case study. It helps L1 agents complete category-specific diagnostics, prevent premature Engineering handoffs, reuse known issues, prepare structured escalation packets, and document human-approved routing decisions.

The application uses a conventional **React frontend** and **Node.js/Express backend**. There is no Next.js, login, database, or hidden framework-specific server behavior.

See [EVALUATOR_TEST_GUIDE.md](./EVALUATOR_TEST_GUIDE.md) for the complete product walkthrough.

## Technology

- `src/features/` — product screens grouped by investigation, tickets, knowledge, and operations
- `src/hooks/` — workspace state and user actions
- `src/services/` — typed client-to-API calls
- `src/domain/` — UI domain models and diagnostic plans
- `api/` — Node.js/Express request handlers; Vercel deploys these as serverless functions
- `server/` — local Express server used during development
- `shared/support/` — deterministic analysis engine, historical data, and contracts shared by React and Node

## Run locally

Requirements: Node.js 20 or newer.

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The command starts:

- React/Vite on port `3000`
- Node/Express on port `3001`

Vite automatically forwards `/api/*` requests to Express. No account or login is required.

Create `.env.local` in the project root and add:

```text
GEMINI_API_KEY=your_key_here
GEMINI_MODEL=gemini-3-flash-preview
```

The file is ignored by Git and must never be committed.

## Deploy on Vercel

1. Push this directory to a Git repository.
2. Import the repository in Vercel.
3. Keep the detected framework as **Vite**.
4. Add `GEMINI_API_KEY` in **Project Settings → Environment Variables**.
5. Add `GEMINI_MODEL=gemini-3-flash-preview`.
6. Deploy.

Vercel will run `npm run build`, publish the React output from `dist/`, and deploy each file in `api/` as a Node.js function. No custom build command, authentication provider, or database is required.

## Data behaviour

- `shared/support/historical-ticket-data.ts` contains the fixed 1,444-ticket case-study baseline through 30 September 2026.
- Evaluators can import new tickets from the Ticket Queue using the original RideOps CSV schema or the downloadable template.
- Imported tickets, evaluator activity, and custom known issues are stored in browser storage for the demo. They do not alter the baseline dataset.
- `data/` contains the original ticket export and data dictionary used for the diagnosis.
- `scripts/prepare-historical.mjs` rebuilds the generated historical ticket module from the source CSV:

```bash
node scripts/prepare-historical.mjs data/rideops_support_tickets.csv shared/support/historical-ticket-data.ts
```

## Useful commands

```bash
npm run dev       # React + Express development servers
npm run lint      # code quality checks
npm run build     # type-check and create the production React build
npm run start     # serve an existing production build with Express
python analysis/rideops_diagnosis.py
```

## Project structure

```text
src/                  React application, features, hooks, services, and UI components
api/                  Node/Express API handlers and Vercel functions
server/               local Node/Express server
shared/support/        support analysis engine, historical data, and shared contracts
data/                 original case-study CSV and data dictionary
analysis/             reproducible diagnosis and generated evidence tables
public/               favicon
scripts/              baseline CSV preparation script
test-fixtures/        evaluator CSV example
EVALUATOR_TEST_GUIDE.md
```
