# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Backend (Docker Compose)
```bash
cd backend
cp .env.example .env          # first time only
docker compose up -d --build  # start MySQL + FastAPI

# After backend code changes:
docker compose up -d --build finance_app

# Reset database entirely:
docker compose down -v && docker compose up -d --build
```

### Backend (local, without Docker)
```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
# Edit .env: change host from 'db' to 'localhost'
uvicorn main:app --reload --port 8000
```

### Frontend
```bash
cd frontend
npm install
npm run dev      # dev server at localhost:5173
npm run build    # output to frontend/dist/
```

### Testing (Backend)
```bash
cd backend
pip install -r requirements.txt -r requirements-test.txt

pytest                              # all unit tests
pytest -m "not integration"        # skip MySQL-specific tests (default for CI)
pytest tests/test_transactions.py  # single file
pytest -k "TestCreateTransaction"  # single class

# With coverage
pytest --cov=. --cov-report=term-missing
```

Tests run against **SQLite in-memory** — no MySQL needed. Tests marked `@pytest.mark.integration` use MySQL-specific SQL (`DATE_FORMAT`) and are skipped by default.

### Testing (Frontend)
```bash
cd frontend
npm test             # run once (Vitest)
npm run test:watch   # watch mode
npm run test:coverage
```

API docs available at `http://localhost:8000/docs` when backend is running.

## Architecture

### Request Flow
Vite proxies `/api/*` from `localhost:5173` → `localhost:8000` (configured in `vite.config.js`). The frontend never hardcodes the backend URL; all fetches go through `frontend/src/api/client.js` → `apiFetch()`.

### Backend Structure
- **`main.py`** — FastAPI app setup, CORS, lifespan handler that runs `create_all` + inline migrations + seed on startup
- **`models.py`** — All SQLAlchemy models in one file: `Transaction`, `Investment`, `BudgetCategory`, `Goal`, `EMI`, `Subscription`
- **`database.py`** — Engine/session setup; reads `DATABASE_URL` from `.env`
- **`seed.py`** — Inserts sample data if all tables are empty
- **`routers/`** — One file per resource; each exports a single `router = APIRouter()`

**Adding a new resource:** create `backend/routers/<name>.py`, then add to `main.py`:
```python
from routers import <name>
app.include_router(<name>.router, prefix="/api/<name>", tags=["<name>"])
```

**Schema migrations:** new tables are created by `create_all` automatically. New *columns* on existing tables require an explicit `ALTER TABLE` inside `_migrate()` in `main.py` (idempotent — check column existence with `inspect` first, see existing pattern).

### Frontend Structure
- **`src/App.jsx`** — Root: holds active screen state, theme state (`TweakCtx`), and renders `Sidebar` + `Topbar` + current `Screen`
- **`src/screens/`** — One file per page; each screen manages its own data fetching and modal state
- **`src/api/`** — Thin fetch wrappers per resource; import from here in screens
- **`src/components/ui/`** — `Card`, `StatCard`, `Badge`, `Icon`, `AccentButton`
- **`src/components/charts/`** — `AreaChart`, `BarChart`, `DonutChart` (custom SVG, no chart library)
- **`src/components/modals/`** — Add/edit modals for each entity; receive `onSave`/`onClose` props
- **`src/components/layout/`** — `Sidebar` (desktop nav), `Topbar`, `BottomNav` (mobile)

**Navigation:** `App.jsx` maintains `active` string → `SCREENS[active]` renders the component. Add a new screen by adding to both the `SCREENS` map and the `NAV` array in `Sidebar.jsx`.

### Theming System
`TweakCtx` (in `src/context/TweakContext.jsx`) provides `palette`, `surface`, and `density` values app-wide. CSS variables (`--card-bg`, `--card-border`, `--card-radius`, `--card-pad`, `--content-pad`, `--content-gap`) are set on the main scroll container in `App.jsx` and consumed by all screens. Use `useTweakCtx()` to read palette/surface for color values.

## Test Architecture

### Backend (`backend/tests/`)
`conftest.py` patches `database.engine` and `database.SessionLocal` to SQLite before any router imports, then builds a minimal FastAPI app (no lifespan, no migrations, no seed). This avoids MySQL-specific startup code entirely. Each test function gets a fresh schema via the `_reset_db` autouse fixture (`create_all` / `drop_all`).

**Do not import from `main.py` in tests** — its lifespan runs MySQL `ALTER TABLE` statements that fail on SQLite. Import routers directly.

Coverage omit patterns live in `backend/.coveragerc`, not on the CLI.

### Frontend (`frontend/src/`)
Vitest is configured in `vitest.config.js` with jsdom. Test files sit next to the source they test (`format.test.js` beside `format.js`). Global test setup is in `src/test/setup.js` (imports `@testing-library/jest-dom`).

**`apiFetch` header merging:** options are destructured as `{ headers: callerHeaders, ...rest }` before the fetch call so that `...rest` does not overwrite the merged `headers` object.

## CI / Jenkins

The `Jenkinsfile` runs on a **Kubernetes Cloud** (K3s). Each build gets a pod with two containers (`python:3.13-slim`, `node:20-alpine`) that share the workspace volume. Stages target containers with `container('python')` / `container('node')`.

- JNLP tunnel must point to the **node internal IP**, not `localhost` or the public domain, or the agent handshake will fail.
- Images use `imagePullPolicy: IfNotPresent` — pre-pull with `sudo k3s ctr images pull` to avoid cold-start delays.
- Integration tests (`-m "not integration"`) are skipped in CI since there is no MySQL pod.

## Known Constraints

**MySQL `NULLS LAST`:** MySQL 8.0 does not support `ORDER BY col ASC NULLS LAST`. Use a CASE workaround:
```python
order_by(case((Model.col == None, 1), else_=0), Model.col.asc())
```

**SheetJS CSV encoding:** SheetJS reads CSV as raw bytes (Latin-1), garbling UTF-8 characters like ₹. For CSV files, use `readAsText(file, 'UTF-8')` + `XLSX.read(text, { type: 'string' })`. See `parseAmount()` in `CSVImport.jsx` which also strips non-numeric chars with `[^\d.+\-]` as a second defence.

**Table layout in CSVImport:** The review table uses `tableLayout: 'fixed'` + `<colgroup>` to prevent `<select>` elements from expanding column widths beyond their `<th>` hints.

**CORS:** The backend only allows `http://localhost:5173`. If the frontend port changes, update `allow_origins` in `main.py`.
