# FixFlow — AI Business Operations Agent

FixFlow is a small-business operations control room for database-backed order processing, invoice preparation, stock reconciliation, workflow execution history, audit events, and transactional email notifications.

## Architecture
- Frontend: static HTML, CSS, and JavaScript in `public/index.html`.
- Backend: Hatchable API handlers in `api/*.js` using the Hatchable SDK.
- Database: managed PostgreSQL with migrations in `migrations/`.
- Transactional email: Hatchable's server-side `email.send`; messages use saved customer records and delivery status is tracked.
- Hosting: Hatchable production app. `vercel.json` proxies API routes to Hatchable when the static frontend is deployed on Vercel.

## Workflows
- **Order Processing** validates a customer, checks product stock, creates an order, decrements stock, writes a stock movement, verifies saved state, and attempts an order confirmation email.
- **Invoice Preparation** locates an order, creates or reuses its invoice, verifies totals, and attempts an invoice email.
- **Stock Reconciliation** compares a physical count with persisted inventory, records the adjustment, and verifies the saved stock value.
- Workflow step status, attempts, results, and failures are persisted. Each run requires an idempotency key to prevent accidental duplicate execution.

## Email delivery
Emails use the saved customer's email address. Invalid/sample domains such as `.example`, `.test`, and `.invalid` are skipped to avoid emailing placeholders. Delivery can be restricted by Hatchable recipient allowlists, daily caps, or sender-domain verification. A request or draft is not proof of successful delivery; check the saved email status.

## Database
Migration `007_reliable_operations.sql` adds workflow idempotency, `stock_movements` for traceable inventory changes, and `email_outbox` for email attempts, statuses, provider message IDs, and errors. Replace synthetic starter customer details with authorized real records before production use.

## Development and deployment
The Hatchable backend imports `hatchable` and is not a standalone Vercel Node function. Deploy the backend to Hatchable first; Vercel routes `/api/*` to the Hatchable URL through `vercel.json`. Configure Vercel to build the static frontend from the repository root and ensure API routing points to the active Hatchable deployment.

## Security and next steps
- Do not commit secrets or provider credentials.
- Never send transactional email without a valid address and appropriate permission.
- Verify order/inventory results and audit logs after changes.
- For production commerce, add authenticated staff identities, role-based authorization, database transactions around inventory/order writes, invoice PDF generation, and automated integration tests.
