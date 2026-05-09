import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text, inspect

from database import engine, SessionLocal
from models import Base
from seed import seed_if_empty
from routers import transactions, investments, budget, goals, subscriptions

logger = logging.getLogger("finance")


def _migrate(eng):
    """Add columns that were introduced after initial create_all."""
    existing = {c["name"] for c in inspect(eng).get_columns("transactions")}
    if "investment_id" not in existing:
        with eng.connect() as conn:
            conn.execute(text("ALTER TABLE transactions ADD COLUMN investment_id INT NULL"))
            conn.execute(text(
                "ALTER TABLE transactions ADD CONSTRAINT fk_tx_investment "
                "FOREIGN KEY (investment_id) REFERENCES investments(id) ON DELETE SET NULL"
            ))
            conn.commit()
        logger.info("Migration: added investment_id to transactions")


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

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(transactions.router,  prefix="/api/transactions",  tags=["transactions"])
app.include_router(investments.router,   prefix="/api/investments",   tags=["investments"])
app.include_router(budget.router,        prefix="/api/budget",        tags=["budget"])
app.include_router(goals.router,         prefix="/api/goals",         tags=["goals"])
app.include_router(subscriptions.router, prefix="/api/subscriptions", tags=["subscriptions"])


@app.get("/api/health")
def health():
    return {"status": "ok"}
