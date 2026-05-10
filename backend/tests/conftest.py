"""
Shared pytest fixtures.

Uses an in-memory SQLite database so tests run without a real MySQL instance.
The minimal FastAPI app is built here (no lifespan / migrations / seed) so that
MySQL-specific startup code in main.py never runs during unit tests.

MySQL-specific SQL (DATE_FORMAT, information_schema) is isolated to the
`@pytest.mark.integration` tests that are intentionally skipped in the
standard unit-test run.
"""
import os
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from fastapi import FastAPI
from fastapi.testclient import TestClient

# Must be set before any app module is imported so database.py picks it up
os.environ.setdefault("DATABASE_URL", "sqlite:///./test_finance.db")

import database as _db_module  # noqa: E402  (import after env-var set)
from database import Base, get_db  # noqa: E402

_TEST_URL = "sqlite:///./test_finance.db"
_engine = create_engine(_TEST_URL, connect_args={"check_same_thread": False})
_Session = sessionmaker(autocommit=False, autoflush=False, bind=_engine)

# Redirect the module-level engine/session so every router uses SQLite
_db_module.engine = _engine
_db_module.SessionLocal = _Session

from routers import transactions, investments, budget, goals, subscriptions  # noqa: E402

# Minimal app — no lifespan, no migrations, no seed
_app = FastAPI()
_app.include_router(transactions.router,  prefix="/api/transactions")
_app.include_router(investments.router,   prefix="/api/investments")
_app.include_router(budget.router,        prefix="/api/budget")
_app.include_router(goals.router,         prefix="/api/goals")
_app.include_router(subscriptions.router, prefix="/api/subscriptions")


@pytest.fixture(autouse=True)
def _reset_db():
    """Recreate all tables before each test, drop after."""
    Base.metadata.create_all(bind=_engine)
    yield
    Base.metadata.drop_all(bind=_engine)


@pytest.fixture()
def client():
    """TestClient with DB dependency overridden to use the test SQLite session."""
    def _override():
        db = _Session()
        try:
            yield db
        finally:
            db.close()

    _app.dependency_overrides[get_db] = _override
    with TestClient(_app) as c:
        yield c
    _app.dependency_overrides.clear()
