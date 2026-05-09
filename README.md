# FinTrack — Personal Finance Budgeter

A self-hosted personal finance dashboard for tracking income, expenses, investments, subscriptions, and financial goals. Built with a React frontend and a FastAPI + MySQL backend, deployable via Docker Compose.

---

## Features

| Module | What it does |
|---|---|
| **Dashboard** | Overview of monthly income, expenses, net savings, and spending by category |
| **Transactions** | Log, search, and filter all income and expense entries |
| **Budget** | Set monthly budgets per category, track progress with visual indicators |
| **Investments** | Track mutual funds, stocks, FDs, and PPF/EPF with returns and SIP details |
| **Goals & EMIs** | Monitor savings goals and active loan EMIs |
| **Subscriptions** | Manage recurring expenses, view monthly/yearly totals, track upcoming renewals |
| **CSV Import** | Import transactions from bank statements (CSV, XLSX, XLS) — supports Google Sheets two-panel layout and Indian bank formats |
| **Reports** | Monthly trends and category breakdowns |

---

## Tech Stack

**Frontend**
- React 18 (Vite)
- SheetJS (`xlsx`) for CSV/Excel parsing
- Inline styles with CSS variables for theming

**Backend**
- FastAPI (Python 3.11)
- SQLAlchemy 2.x ORM
- MySQL 8.0
- PyMySQL driver
- Pydantic v2 schemas

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
│   ├── main.py               # FastAPI app, lifespan, DB migrations
│   ├── models.py             # SQLAlchemy models
│   ├── database.py           # Engine and session setup
│   ├── seed.py               # Initial seed data
│   ├── routers/
│   │   ├── transactions.py
│   │   ├── investments.py
│   │   ├── budget.py
│   │   ├── goals.py
│   │   └── subscriptions.py
│   ├── requirements.txt
│   ├── Dockerfile
│   ├── docker-compose.yaml
│   └── .env.example
└── frontend/
    ├── src/
    │   ├── screens/          # One file per page
    │   ├── components/
    │   │   ├── ui/           # Card, StatCard, Badge, Icon, AccentButton
    │   │   ├── charts/       # AreaChart, BarChart, DonutChart
    │   │   ├── modals/       # Add/edit modals for each entity
    │   │   └── layout/       # Sidebar, Topbar, BottomNav
    │   ├── api/              # Fetch wrappers per resource
    │   ├── context/          # Theme/accent context
    │   └── utils/            # Currency formatter
    └── package.json
```

---

## API Reference

The backend exposes a REST API under `/api`. Full interactive docs are available at [http://localhost:8000/docs](http://localhost:8000/docs) when the backend is running.

| Resource | Endpoints |
|---|---|
| Transactions | `GET /api/transactions/` `POST` `DELETE /{id}` |
| Investments | `GET /api/investments/` `POST` `PUT /{id}` `DELETE /{id}` `GET /summary` `GET /{id}/transactions` |
| Budget | `GET /api/budget/` `POST` `PUT /{id}` `DELETE /{id}` `GET /summary` |
| Goals | `GET /api/goals/` `POST` `PUT /{id}` `DELETE /{id}` |
| EMIs | `GET /api/goals/emis` `POST` `PUT /emis/{id}` `DELETE /emis/{id}` |
| Subscriptions | `GET /api/subscriptions/` `POST` `PUT /{id}` `DELETE /{id}` |

---

## CSV Import

The importer supports:

- **Indian bank statements** — HDFC, SBI, ICICI, Axis, Kotak (CSV and XLS)
- **Google Sheets budget templates** — two-panel format (Expenses on the left, Income on the right) is detected and flattened automatically
- **Generic CSV** — any file with Date, Description, and Amount columns

Files are parsed entirely in the browser (no upload to server). Amounts with `₹` symbols are handled correctly. Rows with invalid dates or zero amounts are flagged and excluded from import by default.

---

## Development

### Backend (without Docker)

```bash
cd backend
python -m venv .venv
source .venv/bin/activate      # Windows: .venv\Scripts\activate
pip install -r requirements.txt

# Update .env to point at a local MySQL instance
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
