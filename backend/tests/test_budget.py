"""Unit tests for /api/budget endpoints."""
from datetime import date

TODAY = date.today().isoformat()

# ── helpers ───────────────────────────────────────────────────────────────────

def _create_cat(client, name="Food", budget=5000.0, color="#22c55e"):
    return client.post("/api/budget/", json={"name": name, "budget": budget, "color": color})


def _create_expense(client, category, amount):
    client.post("/api/transactions/", json={
        "date": TODAY, "desc": "Test", "category": category,
        "amount": amount, "type": "expense",
    })


# ── POST /api/budget/ ─────────────────────────────────────────────────────────

class TestCreateBudgetCategory:
    def test_creates_returns_201(self, client):
        r = _create_cat(client)
        assert r.status_code == 201
        d = r.json()
        assert d["name"] == "Food"
        assert d["budget"] == 5000.0
        assert d["color"] == "#22c55e"
        assert d["spent"] == 0.0
        assert isinstance(d["id"], int)

    def test_duplicate_name_returns_400(self, client):
        _create_cat(client, name="Food")
        r = _create_cat(client, name="Food")
        assert r.status_code == 400

    def test_different_names_allowed(self, client):
        _create_cat(client, name="Food")
        r = _create_cat(client, name="Transport")
        assert r.status_code == 201

    def test_missing_name_returns_422(self, client):
        r = client.post("/api/budget/", json={"budget": 1000.0, "color": "#fff"})
        assert r.status_code == 422

    def test_spent_reflects_current_month_expenses(self, client):
        _create_cat(client, name="Groceries", budget=8000.0)
        _create_expense(client, category="Groceries", amount=1500.0)
        _create_expense(client, category="Groceries", amount=800.0)
        cats = client.get("/api/budget/").json()
        groceries = next(c for c in cats if c["name"] == "Groceries")
        assert groceries["spent"] == 2300.0


# ── GET /api/budget/ ──────────────────────────────────────────────────────────

class TestListBudgetCategories:
    def test_empty_db_returns_empty_list(self, client):
        assert client.get("/api/budget/").json() == []

    def test_returns_all_categories(self, client):
        _create_cat(client, name="Food")
        _create_cat(client, name="Rent")
        assert len(client.get("/api/budget/").json()) == 2

    def test_spent_zero_when_no_transactions(self, client):
        _create_cat(client, name="Entertainment")
        cats = client.get("/api/budget/").json()
        assert cats[0]["spent"] == 0.0

    def test_income_transactions_not_counted_as_spent(self, client):
        _create_cat(client, name="Salary")
        client.post("/api/transactions/", json={
            "date": TODAY, "desc": "Monthly salary", "category": "Salary",
            "amount": 80000.0, "type": "income",
        })
        cats = client.get("/api/budget/").json()
        assert cats[0]["spent"] == 0.0


# ── PUT /api/budget/{id} ──────────────────────────────────────────────────────

class TestUpdateBudgetCategory:
    def test_update_budget_amount(self, client):
        cat_id = _create_cat(client, budget=5000.0).json()["id"]
        r = client.put(f"/api/budget/{cat_id}", json={"budget": 8000.0})
        assert r.status_code == 200
        assert r.json()["budget"] == 8000.0

    def test_update_color(self, client):
        cat_id = _create_cat(client, color="#111111").json()["id"]
        r = client.put(f"/api/budget/{cat_id}", json={"budget": 5000.0, "color": "#aabbcc"})
        assert r.json()["color"] == "#aabbcc"

    def test_update_nonexistent_returns_404(self, client):
        r = client.put("/api/budget/9999", json={"budget": 1000.0})
        assert r.status_code == 404


# ── DELETE /api/budget/{id} ───────────────────────────────────────────────────

class TestDeleteBudgetCategory:
    def test_delete_existing_returns_204(self, client):
        cat_id = _create_cat(client).json()["id"]
        assert client.delete(f"/api/budget/{cat_id}").status_code == 204

    def test_deleted_not_in_list(self, client):
        cat_id = _create_cat(client).json()["id"]
        client.delete(f"/api/budget/{cat_id}")
        assert client.get("/api/budget/").json() == []

    def test_delete_nonexistent_returns_404(self, client):
        assert client.delete("/api/budget/9999").status_code == 404


# ── GET /api/budget/summary ───────────────────────────────────────────────────

class TestBudgetSummary:
    def test_empty_db_returns_zeroes(self, client):
        r = client.get("/api/budget/summary").json()
        assert r["total_budget"] == 0.0
        assert r["total_spent"] == 0.0
        assert r["total_remaining"] == 0.0
        assert r["utilization_pct"] == 0

    def test_aggregates_budget_across_categories(self, client):
        _create_cat(client, name="Food",  budget=5000.0)
        _create_cat(client, name="Rent",  budget=15000.0)
        r = client.get("/api/budget/summary").json()
        assert r["total_budget"] == 20000.0

    def test_spent_and_utilization(self, client):
        _create_cat(client, name="Groceries", budget=10000.0)
        _create_expense(client, category="Groceries", amount=4000.0)
        r = client.get("/api/budget/summary").json()
        assert r["total_spent"] == 4000.0
        assert r["total_remaining"] == 6000.0
        assert r["utilization_pct"] == 40.0

    def test_remaining_goes_negative_when_overspent(self, client):
        _create_cat(client, name="Food", budget=1000.0)
        _create_expense(client, category="Food", amount=1500.0)
        r = client.get("/api/budget/summary").json()
        assert r["total_remaining"] == -500.0
        assert r["utilization_pct"] == 150.0
