import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from starlette.middleware.base import BaseHTTPMiddleware
from sqlalchemy import text, inspect

from database import engine, SessionLocal
from models import Base
from seed import seed_if_empty
from routers import transactions, investments, budget, goals, subscriptions, accounts, recurring, search, user_settings

logger = logging.getLogger("finance")


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "geolocation=(), camera=(), microphone=()"
        return response

# Comma-separated list of allowed origins injected via env var.
# Dev default keeps the Vite dev server working without a .env change.
_raw_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173")
ALLOWED_ORIGINS = [o.strip() for o in _raw_origins.split(",") if o.strip()]


def _migrate(eng):
    """Add columns that were introduced after initial create_all."""
    existing = {c["name"] for c in inspect(eng).get_columns("transactions")}
    if "tags" not in existing:
        with eng.connect() as conn:
            conn.execute(text("ALTER TABLE transactions ADD COLUMN tags VARCHAR(500) NULL"))
            conn.commit()
        logger.info("Migration: added tags to transactions")
    if "investment_id" not in existing:
        with eng.connect() as conn:
            conn.execute(text("ALTER TABLE transactions ADD COLUMN investment_id INT NULL"))
            conn.execute(text(
                "ALTER TABLE transactions ADD CONSTRAINT fk_tx_investment "
                "FOREIGN KEY (investment_id) REFERENCES investments(id) ON DELETE SET NULL"
            ))
            conn.commit()
        logger.info("Migration: added investment_id to transactions")
    if "created_at" not in existing:
        with eng.connect() as conn:
            conn.execute(text(
                "ALTER TABLE transactions ADD COLUMN created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP"
            ))
            conn.commit()
        logger.info("Migration: added created_at to transactions")


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        Base.metadata.create_all(bind=engine)
        _migrate(engine)
        db = SessionLocal()
        try:
            seed_if_empty(db)
        finally:
            db.close()
        logger.info("Database ready.")
    except Exception as exc:
        logger.warning("DB unavailable at startup (%s). Endpoints will fail until connected.", exc)
    yield


app = FastAPI(title="Finance Budgeter API", version="0.1.0", lifespan=lifespan)

# Middleware — order matters: outermost added last
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(GZipMiddleware, minimum_size=1000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    logger.exception("Unhandled error on %s %s: %s", request.method, request.url.path, exc)
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})


app.include_router(transactions.router,  prefix="/api/transactions",  tags=["transactions"])
app.include_router(investments.router,   prefix="/api/investments",   tags=["investments"])
app.include_router(budget.router,        prefix="/api/budget",        tags=["budget"])
app.include_router(goals.router,         prefix="/api/goals",         tags=["goals"])
app.include_router(subscriptions.router, prefix="/api/subscriptions", tags=["subscriptions"])
app.include_router(accounts.router,      prefix="/api/accounts",      tags=["accounts"])
app.include_router(recurring.router,     prefix="/api/recurring",     tags=["recurring"])
app.include_router(search.router,        prefix="/api/search",        tags=["search"])
app.include_router(user_settings.router, prefix="/api/settings",      tags=["settings"])


@app.get("/api/health")
def health():
    return {"status": "ok"}


class ResetConfirm(BaseModel):
    confirm: str


@app.delete("/api/reset", status_code=204)
def reset_all_data(body: ResetConfirm):
    if body.confirm != "DELETE_ALL_DATA":
        raise HTTPException(status_code=400, detail="confirmation must be 'DELETE_ALL_DATA'")
    db = SessionLocal()
    try:
        db.execute(text("SET FOREIGN_KEY_CHECKS=0"))
        for table in ["recurring_transactions", "transactions", "investments",
                      "budget_categories", "goals", "emis", "subscriptions", "bank_accounts"]:
            db.execute(text(f"TRUNCATE TABLE `{table}`"))
        db.execute(text("SET FOREIGN_KEY_CHECKS=1"))
        db.commit()
    finally:
        db.close()
