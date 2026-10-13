# FixFlow — Business Operations Agent

FixFlow is a shared operations workspace for order processing, invoice preparation, stock reconciliation, persisted workflow runs, audit history, and transactional email.

## Stack
- Static frontend: HTML, CSS, JavaScript (`public/index.html`)
- API handlers: Hatchable server-side functions in `api/`
- Data: managed PostgreSQL and SQL migrations
- Email: Hatchable server-side transactional email using saved customer addresses
- Hosting: Hatchable backend; Vercel static frontend with `/api/*` routed to the Hatchable backend

## Workflows
- **Order Processing:** requires a saved customer email and product SKU; validates stock, creates an order, updates inventory, writes stock movement history, verifies the result, and attempts an order confirmation.
- **Invoice Preparation:** finds an existing order, creates/reuses its invoice, and attempts to send an invoice email to the saved customer's address.
- **Stock Reconciliation:** compares the entered physical count against stored stock and records the adjustment.
- Workflow runs, steps, audit events, email status, and inventory movement history are persisted.

## Setup
1. Deploy the backend and migrations through Hatchable.
2. Deploy the static frontend to Vercel with `vercel.json` routing `/api/*` to the live Hatchable backend.
3. Add real product and customer records under Business Data.
4. For order processing, enter the email address matching a saved customer. The application will not choose an arbitrary first customer.
5. Verify email provider policies, recipient allowlists, and sender-domain configuration before expecting external delivery.

## Email and production notes
- Placeholder domains such as `.example`, `.test`, `.invalid`, and `.localhost` are rejected for delivery.
- A successful workflow does not guarantee email delivery; inspect the email status and provider response.
- The UI and API currently form a shared workspace. Before using it with sensitive or real customer data on a public internet URL, add authenticated user accounts, role-based permissions, rate limiting, and stronger transactional locking around concurrent inventory operations.
- Never commit email credentials or other secrets.
