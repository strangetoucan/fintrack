"""Unit tests for /api/search endpoint."""
from datetime import date

TODAY = date.today().isoformat()


def _tx(client, desc="Test", category="Misc", amount=100.0, tx_type="expense"):
    return client.post("/api/transactions/", json={
        "date": TODAY, "desc": desc, "category": category,
        "amount": amount, "type": tx_type,
    }).json()


def _investment(client, name="Test Fund", platform="Zerodha"):
    return client.post("/api/investments/", json={
        "name": name, "type": "MF", "platform": platform,
        "invested": 10000.0, "current": 11000.0,
    }).json()


def _goal(client, name="Emergency Fund"):
    return client.post("/api/goals/", json={
        "name": name, "target": 100000.0, "current": 0.0,
        "deadline": "2026-12-31", "color": "#3B82F6", "icon": "🎯",
    }).json()


def _subscription(client, name="Netflix"):
    return client.post("/api/subscriptions/", json={
        "name": name, "amount": 799.0, "billing_cycle": "monthly",
        "category": "Entertainment",
    }).json()


def _account(client, name="My Savings", bank_name="HDFC Bank"):
    return client.post("/api/accounts/", json={
        "name": name, "bank_name": bank_name,
        "account_type": "savings", "balance": 50000.0,
    }).json()


# ── GET /api/search/ ──────────────────────────────────────────────────────────

class TestGlobalSearch:
    def test_empty_q_returns_422(self, client):
        r = client.get("/api/search/?q=")
        assert r.status_code == 422

    def test_missing_q_param_returns_422(self, client):
        r = client.get("/api/search/")
        assert r.status_code == 422

    def test_no_results_for_unmatched_query(self, client):
        r = client.get("/api/search/?q=xyznotfound123")
        assert r.status_code == 200
        assert r.json() == []

    def test_q_too_long_returns_422(self, client):
        r = client.get(f"/api/search/?q={'a' * 201}")
        assert r.status_code == 422

    def test_finds_transaction_by_desc(self, client):
        _tx(client, desc="Starbucks Coffee")
        r = client.get("/api/search/?q=starbucks").json()
        assert any(x["type"] == "transaction" and "Starbucks" in x["title"] for x in r)

    def test_finds_transaction_by_category(self, client):
        _tx(client, desc="Dinner Out", category="Food & Dining")
        r = client.get("/api/search/?q=food").json()
        assert any(x["type"] == "transaction" for x in r)

    def test_transaction_result_structure(self, client):
        _tx(client, desc="Groceries", category="Food")
        r = client.get("/api/search/?q=groceries").json()
        tx = next(x for x in r if x["type"] == "transaction")
        assert tx["id"] is not None
        assert tx["title"] == "Groceries"
        assert tx["sub"] == "Food"
        assert isinstance(tx["amount"], float)
        assert tx["screen"] == "transactions"
        assert "tx_type" in tx

    def test_finds_investment_by_name(self, client):
        _investment(client, name="HDFC Midcap Fund")
        r = client.get("/api/search/?q=hdfc").json()
        assert any(x["type"] == "investment" for x in r)

    def test_finds_investment_by_platform(self, client):
        _investment(client, platform="Groww")
        r = client.get("/api/search/?q=groww").json()
        assert any(x["type"] == "investment" for x in r)

    def test_investment_result_structure(self, client):
        _investment(client, name="Axis ELSS", platform="Zerodha")
        r = client.get("/api/search/?q=axis").json()
        inv = next(x for x in r if x["type"] == "investment")
        assert inv["id"] is not None
        assert inv["title"] == "Axis ELSS"
        assert "Zerodha" in inv["sub"]
        assert isinstance(inv["amount"], float)
        assert inv["screen"] == "investments"

    def test_finds_goal_by_name(self, client):
        _goal(client, name="Emergency Fund")
        r = client.get("/api/search/?q=emergency").json()
        assert any(x["type"] == "goal" for x in r)

    def test_goal_result_structure(self, client):
        _goal(client, name="Vacation Fund")
        r = client.get("/api/search/?q=vacation").json()
        g = next(x for x in r if x["type"] == "goal")
        assert g["id"] is not None
        assert g["title"] == "Vacation Fund"
        assert g["screen"] == "goals"

    def test_finds_subscription_by_name(self, client):
        _subscription(client, name="Spotify")
        r = client.get("/api/search/?q=spotify").json()
        assert any(x["type"] == "subscription" for x in r)

    def test_subscription_result_structure(self, client):
        _subscription(client, name="Netflix")
        r = client.get("/api/search/?q=netflix").json()
        s = next(x for x in r if x["type"] == "subscription")
        assert s["id"] is not None
        assert s["title"] == "Netflix"
        assert s["screen"] == "subscriptions"
        assert isinstance(s["amount"], float)

    def test_finds_account_by_name(self, client):
        _account(client, name="Joint Savings")
        r = client.get("/api/search/?q=joint").json()
        assert any(x["type"] == "account" for x in r)

    def test_finds_account_by_bank_name(self, client):
        _account(client, bank_name="ICICI Bank")
        r = client.get("/api/search/?q=icici").json()
        assert any(x["type"] == "account" for x in r)

    def test_account_result_structure(self, client):
        _account(client, name="Main Account", bank_name="SBI")
        r = client.get("/api/search/?q=main").json()
        a = next(x for x in r if x["type"] == "account")
        assert a["id"] is not None
        assert a["title"] == "Main Account"
        assert a["sub"] == "SBI"
        assert isinstance(a["amount"], float)
        assert a["screen"] == "accounts"

    def test_returns_multiple_entity_types(self, client):
        _tx(client, desc="HDFC Transfer")
        _account(client, name="HDFC Account", bank_name="HDFC Bank")
        r = client.get("/api/search/?q=hdfc").json()
        types = {x["type"] for x in r}
        assert "transaction" in types
        assert "account" in types

    def test_case_insensitive_match(self, client):
        _tx(client, desc="STARBUCKS")
        r = client.get("/api/search/?q=starbucks").json()
        assert len(r) > 0

    def test_partial_match(self, client):
        _tx(client, desc="Amazon Prime Subscription")
        r = client.get("/api/search/?q=prime").json()
        assert any(x["type"] == "transaction" for x in r)
