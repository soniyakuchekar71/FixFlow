# FixFlow — AI Business Operations Agent

FixFlow is a web-based business operations platform designed to simplify routine workflows such as order processing, invoice preparation, inventory reconciliation, and workflow monitoring.

It combines a centralized operations dashboard, persistent business data, authenticated user access, workflow execution, audit tracking, and transactional email integration to help businesses manage day-to-day operations more efficiently.

## Key Features

- **Operations Dashboard** — Monitor workflow activity, orders, inventory, and operational status.
- **Order Processing** — Process orders using saved customer and product records, with inventory validation.
- **Invoice Preparation** — Generate or reuse invoices associated with existing orders.
- **Stock Reconciliation** — Compare physical stock counts with recorded inventory and track adjustments.
- **Workflow Management** — Execute workflows and maintain workflow history.
- **Audit Trail** — Record operational events for traceability.
- **User Authentication** — Email-based, one-time-code sign-in and automatic customer profile creation.
- **Transactional Email Integration** — Send workflow-related emails and test email delivery.
- **Persistent Storage** — Store customers, products, orders, invoices, workflow runs, and inventory records in PostgreSQL.

## Technology Stack

| Component | Technology |
|---|---|
| Frontend | HTML, CSS, JavaScript |
| Backend | Server-side API functions |
| Database | PostgreSQL |
| Authentication | Hatchable email-code authentication |
| Email | Hatchable transactional email service |
| Hosting | Vercel and Hatchable |
| Version Control | Git and GitHub |

## System Architecture

```text
                  User
                   |
                   v
          FixFlow Web Interface
             (Vercel)
                   |
                   v
          Authenticated API
             (Hatchable)
                   |
          +--------+--------+
          |        |        |
          v        v        v
      PostgreSQL  Workflows  Email Service
          |        |        |
          v        v        v
      Business   Audit &   Customer
       Records   History   Notifications
```

## Core Workflows

### 1. Order Processing
- Identify the signed-in customer.
- Validate the selected product and available stock.
- Create the order and update inventory.
- Record workflow activity and attempt an order confirmation email.

### 2. Invoice Preparation
- Locate an existing order.
- Create or reuse its invoice.
- Attempt to send the invoice notification to the associated customer.

### 3. Stock Reconciliation
- Compare recorded inventory with the physical stock count.
- Calculate the required adjustment.
- Update inventory and record the change for auditing.

### 4. User Registration and Authentication
- Allow users to sign in using their email address.
- Verify the one-time code.
- Create a customer profile when one does not exist.
- Require authentication for protected business APIs.

## Project Structure

```text
FixFlow/
├── api/
│   ├── approvals.js
│   ├── audit.js
│   ├── customers.js
│   ├── email-test.js
│   ├── overview.js
│   ├── products.js
│   ├── profile.js
│   └── runs.js
├── migrations/
│   ├── 001_core.sql
│   ├── 002_*.sql
│   └── ...
├── public/
│   ├── index.html
│   └── login.html
├── seed.sql
├── hatchable.toml
├── vercel.json
└── README.md
```

*The migration filenames shown with `*` are abbreviated for readability.*

## Getting Started

### Prerequisites
- A GitHub account
- A Vercel account
- A Hatchable project with backend and database access
- A verified email sender domain for unrestricted external email delivery

### Deployment
1. Clone the repository.
2. Configure the Hatchable backend and PostgreSQL database.
3. Apply the required database migrations and populate valid product and customer records.
4. Configure authentication and transactional email settings in Hatchable.
5. Import the GitHub repository into Vercel.
6. Verify that `vercel.json` routes API and authentication requests to the correct backend.
7. Test registration, protected API access, each workflow, and email delivery.

## Email Delivery Status

FixFlow includes a transactional email endpoint for testing outbound email. However, external email delivery depends on the provider's account restrictions and verified sender configuration.

The current Hatchable Free plan has restricted external-recipient delivery. Upgrade eligibility, sender-domain verification, and a successful real-inbox test must be confirmed before claiming unrestricted email delivery is operational.

## Security and Production Readiness

Before using FixFlow for real business operations, the following should be completed and tested:

- Organization-based access controls and tenant isolation
- Role-based permissions for customers and staff
- Database transactions and concurrency protection for inventory updates
- Email delivery monitoring and retry handling
- API rate limiting and input validation
- Automated tests for workflow failures and recovery
- Verified sender domain and successful external inbox delivery

Authentication alone does not guarantee that users can access only their own organization's data. Tenant isolation is essential before storing confidential business information.

## Future Enhancements

- AI-assisted workflow recommendations
- Intelligent inventory forecasting
- Automated exception detection
- Workflow retry and recovery orchestration
- Multi-organization workspaces
- Email delivery status tracking
- Advanced operational analytics

## Live Project

- **GitHub:** https://github.com/soniyakuchekar71/FixFlow
- **Vercel:** https://fixflow-olive.vercel.app

## Author

**Soniya Kuchekar**  
B.Tech Computer Science and Engineering — Health Informatics  
Vellore Institute of Technology, Class of 2027

GitHub: https://github.com/soniyakuchekar71

---

FixFlow aims to make everyday business operations more traceable, reliable, and easier to manage through a unified operations workspace.
