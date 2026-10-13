# FixFlow — AI Business Operations Agent

FixFlow is a web-based operations workspace for order processing, invoice preparation, inventory reconciliation, workflow history, and transactional email.

## Live app
- Vercel: https://fixflow-olive.vercel.app
- Hatchable backend: https://fixflow-ai-s9qr.hatchable.site

## Stack
- Frontend: static HTML/CSS/JavaScript in `public/`
- Backend: Hatchable API functions in `api/`
- Database: managed PostgreSQL and SQL migrations
- Authentication: Hatchable end-user email-code sign-in
- Email: Hatchable transactional email provider

## User access
New visitors can open `/login`, enter their email, and verify a one-time code. A customer profile is created automatically from the verified account email. Business API routes require a signed-in end user. The Vercel routing configuration proxies `/__hatchable/auth.js` and `/api/*` through the Vercel hostname so auth cookies and API calls share the same origin.

## Workflows
- Order Processing validates the signed-in customer's saved email, checks stock, creates an order, updates inventory, and attempts an order confirmation.
- Invoice Preparation finds an existing order, creates/reuses its invoice, and attempts an invoice email.
- Stock Reconciliation updates inventory from a physical count and writes movement history.
- Workflow steps, audit events, email attempts, and inventory movements are persisted.

## Email delivery
The app includes a **Send test email** action that sends only to the currently signed-in user's own email address. Check inbox and spam to confirm actual arrival. A provider-accepted response is not proof of inbox delivery. Hatchable's free tier can restrict recipients to an allowlist and has daily send limits; unrestricted external delivery may require the appropriate plan and verified sender domain in the Hatchable console. No email credentials are committed to this repository.

## Important production limitation
Authentication is enabled, but this version is a shared business workspace: authenticated users can access shared business records. Do not use it for confidential customer/business data with unrestricted public sign-up until organization membership/roles and tenant-scoped data access are implemented. Inventory operations also need database transactions/locking and automated integration tests before high-volume production use.
