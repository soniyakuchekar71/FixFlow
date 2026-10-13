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

## GitHub and Vercel setup

The source is tracked in GitHub at [soniyakuchekar71/FixFlow](https://github.com/soniyakuchekar71/FixFlow).

- `public/index.html` is the existing self-contained frontend.
- `vercel.json` configures Vercel to serve the static page and forward `/api/*` requests to the existing Hatchable API origin.
- The API handlers in `api/*.js` and SQL files in `migrations/` remain in this repository as the original Hatchable backend source. They import the Hatchable SDK and are not standalone Vercel functions.
- The database remains managed by Hatchable. This setup does not migrate data or replace the backend.
- `.gitignore` excludes local environment files, dependencies, and generated deployment files.

## Deployment and verification

1. Import this repository into Vercel at [vercel.com/new](https://vercel.com/new) and deploy with the repository's `vercel.json` configuration.
2. After deployment, test the root page and each proxied API route. Verify that the Vercel project accepts the static build and external rewrite configuration; adjust the routing config if Vercel reports a configuration/build error.
3. Verify overview metrics, products, customers, workflow runs, approvals, audit history, and persistence against the existing Hatchable database.
4. Do not treat a successful static page deploy as proof of backend health. The API proxy requires the existing Hatchable app and its API endpoints to remain available.
5. Before production use, add automated tests for API validation, duplicate submissions, approval decisions, inventory consistency, workflow failure recovery, and audit event creation.

No Vercel production URL is recorded here until a deployment has been completed and verified.

## Current deployment status

The working app is hosted on Hatchable. This README is preparation documentation, not proof of a GitHub push or Vercel deployment. No repository, commit, Vercel project, or Vercel production URL exists until those operations are performed and verified.