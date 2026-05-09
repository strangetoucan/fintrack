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

## Known Constraints

**MySQL `NULLS LAST`:** MySQL 8.0 does not support `ORDER BY col ASC NULLS LAST`. Use a CASE workaround:
```python
order_by(case((Model.col == None, 1), else_=0), Model.col.asc())
```

**SheetJS CSV encoding:** SheetJS reads CSV as raw bytes (Latin-1), garbling UTF-8 characters like ₹. For CSV files, use `readAsText(file, 'UTF-8')` + `XLSX.read(text, { type: 'string' })`. See `parseAmount()` in `CSVImport.jsx` which also strips non-numeric chars with `[^\d.+\-]` as a second defence.

**Table layout in CSVImport:** The review table uses `tableLayout: 'fixed'` + `<colgroup>` to prevent `<select>` elements from expanding column widths beyond their `<th>` hints.

**CORS:** The backend only allows `http://localhost:5173`. If the frontend port changes, update `allow_origins` in `main.py`.
