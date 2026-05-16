# FinTrack — Personal Finance Budgeter

A self-hosted personal finance dashboard for tracking income, expenses, investments, subscriptions, and financial goals. Built with a React frontend and a FastAPI + MySQL backend, deployable via Docker Compose.

---

## Features

| Module | What it does |
|---|---|
| **Dashboard** | Monthly income/expense overview, net savings, spending-by-category donut chart, recent transactions — all filterable by month |
| **Transactions** | Log, search, filter, edit, and bulk-delete income/expense entries; export to CSV |
| **Accounts** | Track bank accounts, wallets, and credit cards with balance and liability totals |
| **Budget** | Set monthly budgets per category, track spending progress with visual progress bars |
| **Investments** | Track mutual funds, stocks, FDs, and PPF/EPF; view returns, SIP details, and linked transactions |
| **Goals & EMIs** | Monitor savings goals with progress bars and active loan EMIs |
| **Subscriptions** | Manage recurring expenses, view monthly/yearly totals, track upcoming renewals |
| **Reports** | Interactive monthly trends, category breakdowns with drill-down transaction list |
| **CSV Import** | Import transactions from bank statements (CSV, XLSX, XLS) — supports Google Sheets two-panel layout and Indian bank formats |
| **Settings** | User preferences, financial year mode (calendar vs fiscal), and theme customisation |

---

## Tech Stack

**Frontend**
- React 18 (Vite)
- Custom SVG charts — no chart library
- Native `<dialog>` element for all modals
- SheetJS (`xlsx`) for CSV/Excel parsing
- Inline styles with CSS variables for theming

**Backend**
- FastAPI (Python 3.11)
- SQLAlchemy 2.x ORM
- Pydantic v2 schemas with `Field` constraints and `field_validator`
- MySQL 8.0 (PyMySQL driver)
- Security: `SecurityHeadersMiddleware`, `GZipMiddleware`, global 500 handler

**Infrastructure**
- Docker + Docker Compose
- Uvicorn ASGI server (2 workers)

---

## Getting Started

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and Docker Compose
- [Node.js](https://nodejs.org/) 18+ (for frontend development)

### 1. Clone and configure

```bash
git clone <repo-url>
cd "Finance Budgeter"
```

Copy the backend environment file:

```bash
cp backend/.env.example backend/.env
```

The default `.env` is pre-configured for Docker Compose and works out of the box.

### 2. Start the backend

```bash
cd backend
docker compose up -d --build
```

This starts:
- `finance_db` — MySQL 8.0 on port `3306`
- `finance_app` — FastAPI on port `8000`

The database schema is created automatically on first startup. Seed data is inserted if the database is empty.

### 3. Start the frontend

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## Project Structure

```
Finance Budgeter/
├── backend/
│   ├── main.py               # FastAPI app, security middleware, lifespan, DB migrations
│   ├── models.py             # SQLAlchemy models (Transaction, Investment, BudgetCategory,
│   │                         #   Goal, EMI, Subscription, BankAccount, RecurringTransaction,
│   │                         #   UserSettings)
│   ├── database.py           # Engine and session setup
│   ├── seed.py               # Initial seed data
│   ├── routers/
│   │   ├── transactions.py   # CRUD + bulk-delete + edit + monthly-summary
│   │   ├── investments.py    # CRUD + summary + linked transactions
│   │   ├── budget.py         # CRUD + monthly spent calculation + summary
│   │   ├── goals.py          # Goals CRUD + EMIs CRUD
│   │   ├── subscriptions.py  # CRUD, ordered by next_billing ASC NULLS LAST
│   │   ├── accounts.py       # Bank account CRUD
│   │   ├── recurring.py      # Recurring transaction templates CRUD
│   │   ├── search.py         # Global search across transactions and accounts
│   │   └── user_settings.py  # Singleton user preferences
│   ├── tests/
│   │   ├── conftest.py       # SQLite in-memory fixture, minimal FastAPI test app
│   │   ├── test_transactions.py
│   │   ├── test_investments.py
│   │   ├── test_budget.py
│   │   ├── test_goals.py
│   │   └── test_subscriptions.py
│   ├── requirements.txt
│   ├── requirements-test.txt
│   ├── Dockerfile
│   ├── docker-compose.yaml
│   └── .env.example
└── frontend/
    ├── src/
    │   ├── screens/
    │   │   ├── Dashboard.jsx       # Monthly overview with month navigator
    │   │   ├── Transactions.jsx    # Full log with search, bulk-delete, edit
    │   │   ├── Accounts.jsx        # Bank account management
    │   │   ├── Budget.jsx          # Category budgets
    │   │   ├── Investments.jsx     # Portfolio tracker
    │   │   ├── Goals.jsx           # Goals and EMIs
    │   │   ├── Subscriptions.jsx   # Recurring subscription tracker
    │   │   ├── Reports.jsx         # Trends and category drill-down
    │   │   ├── CSVImport.jsx       # Bank statement importer
    │   │   └── Settings.jsx        # Preferences and theme
    │   ├── components/
    │   │   ├── ui/
    │   │   │   ├── Card.jsx
    │   │   │   ├── StatCard.jsx
    │   │   │   ├── Badge.jsx
    │   │   │   ├── Icon.jsx
    │   │   │   ├── AccentButton.jsx
    │   │   │   └── ConfirmDialog.jsx  # Reusable delete confirmation dialog
    │   │   ├── charts/            # AreaChart, BarChart, DonutChart (custom SVG)
    │   │   ├── modals/            # Add/edit modals for each entity
    │   │   └── layout/            # Sidebar, Topbar, BottomNav
    │   ├── api/                   # Thin fetch wrappers per resource
    │   ├── context/               # TweakContext (theme), SettingsContext
    │   └── utils/                 # Currency formatter (fmt, fmtK)
    ├── src/utils/format.test.js
    ├── src/api/client.test.js
    ├── src/components/ui/ConfirmDialog.test.jsx
    └── package.json
```

---

## API Reference

Full interactive docs at [http://localhost:8000/docs](http://localhost:8000/docs) when the backend is running.

| Resource | Endpoints |
|---|---|
| Transactions | `GET /api/transactions/` `POST` `PUT /{id}` `DELETE /{id}` `DELETE /bulk` `GET /monthly-summary` |
| Investments | `GET /api/investments/` `POST` `PUT /{id}` `DELETE /{id}` `GET /summary` `GET /{id}/transactions` |
| Budget | `GET /api/budget/` `POST` `PUT /{id}` `DELETE /{id}` `GET /summary` |
| Goals | `GET /api/goals/` `POST` `PUT /{id}` `DELETE /{id}` |
| EMIs | `GET /api/goals/emis` `POST /emis` `PUT /emis/{id}` `DELETE /emis/{id}` |
| Subscriptions | `GET /api/subscriptions/` `POST` `PUT /{id}` `DELETE /{id}` |
| Accounts | `GET /api/accounts/` `POST` `PUT /{id}` `DELETE /{id}` `GET /summary` |
| Recurring | `GET /api/recurring/` `POST` `PUT /{id}` `DELETE /{id}` |
| Search | `GET /api/search/?q=` |
| Settings | `GET /api/settings/` `PUT /api/settings/` |

### Transaction amount convention

Amounts follow a sign convention: **expenses are stored as negative numbers, income as positive**. The frontend always sends `amount = -Math.abs(value)` for expenses. The API enforces `amount != 0` and `-100,000,000 ≤ amount ≤ 100,000,000`.

### Bulk delete

`DELETE /api/transactions/bulk` accepts `{ "ids": [1, 2, 3] }` (1–500 IDs). Non-existent IDs are silently ignored. Investment `invested` totals are adjusted for any linked expense transactions removed.

---

## CSV Import

The importer supports:

- **Indian bank statements** — HDFC, SBI, ICICI, Axis, Kotak (CSV and XLS)
- **Google Sheets budget templates** — two-panel format (Expenses on the left, Income on the right) is detected and flattened automatically
- **Generic CSV** — any file with Date, Description, and Amount columns

Files are parsed entirely in the browser (no upload to server). Amounts with `₹` symbols are handled correctly via `readAsText(file, 'UTF-8')` + SheetJS string mode. Rows with invalid dates or zero amounts are flagged and excluded from import by default.

---

## Testing

### Backend

```bash
cd backend
pip install -r requirements.txt -r requirements-test.txt

pytest                          # all unit tests
pytest -m "not integration"    # skip MySQL-specific tests (default for CI)
pytest --cov=. --cov-report=term-missing
```

Tests run against **SQLite in-memory** — no MySQL needed. Tests marked `@pytest.mark.integration` use MySQL-specific SQL (`DATE_FORMAT`) and are skipped by default.

### Frontend

```bash
cd frontend
npm test             # run once (Vitest)
npm run test:watch   # watch mode
npm run test:coverage
```

---

## Development

### Backend (without Docker)

```bash
cd backend
python -m venv .venv
source .venv/bin/activate      # Windows: .venv\Scripts\activate
pip install -r requirements.txt

# Update .env: change host from 'db' to 'localhost'
uvicorn main:app --reload --port 8000
```

### Rebuilding the Docker image after backend changes

```bash
cd backend
docker compose up -d --build finance_app
```

### Frontend build

```bash
cd frontend
npm run build   # outputs to frontend/dist/
```

---

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | `mysql+pymysql://finance:finance_pass@db:3306/finance_budgeter` | SQLAlchemy connection string |

---

## Database

The schema is managed by SQLAlchemy's `create_all` on startup. New columns added after initial deployment are applied via inline `ALTER TABLE` migrations in `main.py` (idempotent — safe to restart).

To reset the database entirely:

```bash
cd backend
docker compose down -v   # removes the db_data volume
docker compose up -d --build
```

The reset endpoint (`DELETE /api/reset`) requires `{ "confirm": "DELETE_ALL_DATA" }` in the request body as a safeguard.
