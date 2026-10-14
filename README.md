# FixFlow — AI Business Operations Agent

FixFlow is a small-business operations workspace for order processing, invoice preparation, inventory reconciliation, and workflow monitoring. The latest hosted Hatchable build adds an AI Operations Copilot that can review current inventory and recent workflow outcomes to recommend next steps in natural language.

## Key Features

- **Operations Dashboard** — Monitor workflow activity and operational status.
- **Order Processing** — Validate customer records and inventory, create orders, and verify stock updates.
- **Invoice Preparation** — Create or reuse invoices associated with existing orders.
- **Stock Reconciliation** — Compare physical counts with recorded inventory and log adjustments.
- **Workflow History** — Inspect step-level outcomes, verification states, and errors.
- **Audit Trail** — Track operational events for traceability.
- **Email-Code Authentication** — Passwordless sign-in with protected end-user API routes.
- **AI Operations Copilot (hosted Hatchable build)** — An authenticated LLM endpoint reviews inventory and recent workflow outcomes, then recommends safe next steps. It does not execute business actions automatically.
- **Email Outbox Tracking** — Record send attempts and failures for workflow notifications.
- **Persistent Storage** — PostgreSQL records for products, customers, orders, invoices, runs, and inventory movements.

## Technology Stack

| Component | Technology |
|---|---|
| Frontend | HTML, CSS, JavaScript |
| Backend | Hatchable server-side API functions |
| Database | PostgreSQL |
| Authentication | Hatchable email-code authentication |
| AI | Hatchable AI SDK / configurable LLM provider |
| Email | Hatchable transactional email service |
| Hosting | Hatchable hosted app; Vercel URL maintained separately |
| Version Control | Git and GitHub |

## Architecture

```text
User
 |
 v
FixFlow Web Interface
 |
 v
Authenticated API routes
 |----------|------------|
 v          v            v
PostgreSQL  AI Copilot   Email provider
 |          |            |
 v          v            v
Business    Suggested    Delivery may be
records     next steps   provider-restricted
```

## Core Workflows

### Order Processing
1. Validate the saved customer and product.
2. Check available stock and quantity.
3. Create an order and reserve inventory.
4. Verify persisted order and stock values.
5. Attempt an order-confirmation email and record the result.

### Invoice Preparation
1. Locate an existing order.
2. Create or reuse the invoice record.
3. Attempt invoice notification.
4. Verify the saved invoice.

### Stock Reconciliation
1. Validate the SKU and physical stock count.
2. Calculate the adjustment.
3. Persist the adjustment and inventory movement.
4. Verify the resulting stock.

### AI Operations Copilot
1. Accept a short natural-language operations question.
2. Read a bounded snapshot of current products and recent workflow runs.
3. Ask the configured LLM to produce a grounded recommendation.
4. Display the answer and context counts in the dashboard.
5. Keep execution under existing deterministic workflows and validation; the Copilot itself makes no database changes.

## Project Structure

```text
FixFlow/
├── api/                    # API handlers in the repository/runtime
├── migrations/             # SQL migrations
├── public/
│   ├── index.html
│   └── login.html
├── seed.sql                # Synthetic demo data
├── hatchable.toml          # Hosted app/auth/AI configuration
├── vercel.json
└── README.md
```

## Setup and Deployment

The hosted backend uses Hatchable-specific APIs and a managed PostgreSQL database. These handlers are not generic Express functions and should not be assumed to run unchanged in a standalone Node.js runtime.

1. Review the project source and migrations before deploying.
2. Configure Hatchable authentication and database.
3. Configure an AI provider in Hatchable Settings to enable Copilot model responses.
4. Configure a verified sender domain or provider access for unrestricted external email.
5. Verify sign-in, protected API access, each workflow, run persistence, and email behavior in a real browser.

## Known Limitations

- **AI provider setup:** the Copilot UI and authenticated endpoint are deployed, but a live model response is not yet verified. The current account needs an AI provider/API key configured in Hatchable Settings.
- **External email:** provider testing returned a 403 on the free plan for an unapproved external recipient. Upgrade/verified sender setup and a real inbox test are still required; do not claim unrestricted email delivery yet.
- **Multi-user isolation:** authentication is not the same as tenant isolation. Some business records are currently shared across signed-in accounts. Do not use the current MVP for confidential business data until workspace-level data isolation and role checks are implemented and tested.
- **Production hardening:** add automated tests, role permissions, transactional/concurrency tests, rate limits, monitoring, and reliable retry/recovery before production use.

## Live Project

- **GitHub:** https://github.com/soniyakuchekar71/FixFlow
- **Hatchable hosted build (latest):** https://fixflow-ai-s9qr.hatchable.site
- **Vercel deployment (separate deployment):** https://fixflow-olive.vercel.app

## Author

**Soniya Kuchekar**  
B.Tech Computer Science and Engineering — Health Informatics  
Vellore Institute of Technology, Class of 2027

GitHub: https://github.com/soniyakuchekar71

---

FixFlow aims to make business operations more traceable and reliable by combining deterministic workflows, verified data changes, audit history, and AI-assisted recommendations.
