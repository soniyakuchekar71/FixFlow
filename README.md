# FixFlow — AI Operations Agent

FixFlow is a small-business operations control room for starting predefined workflows, inspecting run history, reviewing approvals, and auditing business activity. The current hosted MVP uses Hatchable's JavaScript API runtime and managed PostgreSQL.

## Current architecture

- Frontend: static HTML, CSS, and browser JavaScript in `public/index.html`.
- Backend: Hatchable API functions in `api/*.js` using the platform SDK (`hatchable`).
- Database: Hatchable-managed PostgreSQL; SQL migrations live in `migrations/`.
- Seed data: `seed.sql` (synthetic demo records; inspect before applying to another database).
- Hosting: currently Hatchable. The API handlers are not standalone Node/Express functions and cannot be assumed to work on Vercel unchanged.

## Features in the current MVP

- Operations dashboard with database-backed run metrics.
- Workflow entry points for Order Processing, Invoice Preparation, and Stock Reconciliation.
- Execution run records and step inspection.
- Customer and product endpoints.
- Approval and audit endpoints.
- Responsive FixFlow Control Room styling.
- Deterministic demo workflow behavior. This is not yet a full transactional job engine with durable worker queues, complete idempotent recovery, or production email delivery.

## Repository layout

```text
public/index.html       Static frontend and styles
api/                    Hatchable API handlers
migrations/             Forward-only SQL migrations
seed.sql                Synthetic demo seed data
README.md               Project overview
```

## Local development

The project currently depends on Hatchable-specific runtime APIs and a platform-managed database. There is no conventional package manifest or standalone local server configured yet. Do not run `npm install` or deploy the `api/` handlers to a generic Node runtime and assume they work. To run independently, first adapt each handler's database and request/response interfaces to a supported runtime, configure PostgreSQL, and add a local development/test harness.

## Configuration and secrets

The current source does not declare a standalone production environment contract. Do not commit real credentials, database URLs, API keys, or exported production data. Keep server secrets in the hosting provider's server-side environment settings, never in browser JavaScript. Create `.env.example` only for variables confirmed to be read by the standalone runtime.

## Tests

No automated test suite or package scripts are currently included. Before calling a Vercel migration production-ready, add tests for API validation, duplicate submissions, approval decisions, inventory consistency, workflow failure recovery, and audit event creation.

## Deployment plan: GitHub + Vercel

1. Export/download the complete project from the Hatchable project console. Verify that the archive contains `public/`, `api/`, `migrations/`, `seed.sql`, and this README. Do not include real customer data or secrets.
2. Create an empty GitHub repository named `fixflow` (or another name you choose). Extract the source, inspect the file list and diff, scan for credentials, then commit and push only after reviewing staged files. If importing into a non-empty repository, preserve its history.
3. Choose a backend strategy before production. Low-risk interim option: host the static frontend on Vercel and retain the Hatchable backend, after configuring the frontend to call the intended API origin and verifying cross-origin requests. Alternative: port the API handlers to a supported runtime and migrate the database to hosted PostgreSQL with schema/data migration and tests.
4. The existing handlers import `hatchable` and use its database SDK. They are not conventional Express/Fastify handlers. A successful static frontend deployment does not prove that the APIs or database work on Vercel.
5. Once the frontend API base URL is configurable, import the repository in Vercel. Select the appropriate static/other preset and set the output directory based on the exported layout. Do not route `/api/*` to static HTML.
6. Configure only environment variables actually used by the selected runtime. Keep database and LLM keys server-side; a public frontend variable may contain only a non-secret API base URL. Use separate Preview and Production values.
7. Verify the root page, direct route refresh, API connectivity, database health, a complete demo workflow, run persistence after refresh, approval/rejection, audit history, and absence of secrets in public assets.

## Current deployment status

The working app is hosted on Hatchable. This README is preparation documentation, not proof of a GitHub push or Vercel deployment. No repository, commit, Vercel project, or Vercel production URL exists until those operations are performed and verified.