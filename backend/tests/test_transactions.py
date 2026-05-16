"""Unit tests for /api/transactions endpoints."""
import pytest
from datetime import date

TODAY = date.today().isoformat()

# ── helpers ───────────────────────────────────────────────────────────────────

def _create(client, **overrides):
    payload = {
        "date": TODAY, "desc": "Test tx", "category": "Misc",
        "amount": 100.0, "type": "expense",
    }
    payload.update(overrides)
    return client.post("/api/transactions/", json=payload)


def _create_investment(client, name="Test Fund"):
    r = client.post("/api/investments/", json={
        "name": name, "type": "MF", "platform": "Zerodha",
        "invested": 10000.0, "current": 11000.0,
    })
    return r.json()["id"]


# ── POST /api/transactions/ ───────────────────────────────────────────────────

class TestCreateTransaction:
    def test_creates_expense_returns_201(self, client):
        r = _create(client, desc="Coffee", amount=150.0, type="expense")
        assert r.status_code == 201
        d = r.json()
        assert d["desc"] == "Coffee"
        assert d["amount"] == 150.0
        assert d["type"] == "expense"
        assert isinstance(d["id"], int)

    def test_creates_income_returns_201(self, client):
        r = _create(client, desc="Salary", amount=80000.0, type="income",
                    category="Salary")
        assert r.status_code == 201
        assert r.json()["type"] == "income"

    def test_created_at_present_in_response(self, client):
        r = _create(client)
        assert r.json()["created_at"] is not None

    def test_investment_id_null_by_default(self, client):
        r = _create(client)
        assert r.json()["investment_id"] is None
        assert r.json()["investment_name"] is None

    def test_links_valid_investment(self, client):
        inv_id = _create_investment(client, "HDFC MF")
        r = _create(client, desc="SIP", investment_id=inv_id)
        assert r.status_code == 201
        assert r.json()["investment_id"] == inv_id
        assert r.json()["investment_name"] == "HDFC MF"

    def test_invalid_investment_id_returns_404(self, client):
        r = _create(client, investment_id=9999)
        assert r.status_code == 404

    def test_invalid_type_returns_422(self, client):
        r = _create(client, type="transfer")
        assert r.status_code == 422

    def test_missing_amount_returns_422(self, client):
        r = client.post("/api/transactions/", json={
            "date": TODAY, "desc": "Bad", "category": "Misc", "type": "expense",
        })
        assert r.status_code == 422

    def test_negative_amount_stored(self, client):
        r = _create(client, amount=-500.0)
        assert r.status_code == 201
        assert r.json()["amount"] == -500.0

    def test_zero_amount_returns_422(self, client):
        r = _create(client, amount=0.0)
        assert r.status_code == 422

    def test_amount_above_limit_returns_422(self, client):
        r = _create(client, amount=200_000_000.0)
        assert r.status_code == 422


# ── GET /api/transactions/ ────────────────────────────────────────────────────

class TestListTransactions:
    def test_empty_db_returns_empty_list(self, client):
        assert client.get("/api/transactions/").json() == []

    def test_returns_all_created(self, client):
        _create(client, desc="A")
        _create(client, desc="B")
        assert len(client.get("/api/transactions/").json()) == 2

    def test_filter_type_expense(self, client):
        _create(client, desc="Expense", type="expense")
        _create(client, desc="Income", type="income", category="Sal")
        r = client.get("/api/transactions/?type=expense")
        assert r.status_code == 200
        assert all(t["type"] == "expense" for t in r.json())
        assert len(r.json()) == 1

    def test_filter_type_income(self, client):
        _create(client, desc="Expense", type="expense")
        _create(client, desc="Income", type="income", category="Sal")
        r = client.get("/api/transactions/?type=income")
        assert len(r.json()) == 1
        assert r.json()[0]["type"] == "income"

    def test_unknown_type_filter_ignored(self, client):
        _create(client, desc="A")
        r = client.get("/api/transactions/?type=transfer")
        assert len(r.json()) == 1

    def test_search_matches_desc_case_insensitive(self, client):
        _create(client, desc="Starbucks Coffee")
        _create(client, desc="Gym membership")
        r = client.get("/api/transactions/?search=starbucks")
        assert len(r.json()) == 1
        assert r.json()[0]["desc"] == "Starbucks Coffee"

    def test_search_matches_category(self, client):
        _create(client, desc="Netflix", category="Entertainment")
        _create(client, desc="Salary", category="Income")
        r = client.get("/api/transactions/?search=entertainment")
        assert len(r.json()) == 1

    def test_limit_restricts_results(self, client):
        for i in range(5):
            _create(client, desc=f"Tx{i}")
        r = client.get("/api/transactions/?limit=3")
        assert len(r.json()) == 3

    def test_limit_above_500_returns_422(self, client):
        assert client.get("/api/transactions/?limit=501").status_code == 422

    def test_limit_zero_returns_422(self, client):
        assert client.get("/api/transactions/?limit=0").status_code == 422


# ── DELETE /api/transactions/{id} ────────────────────────────────────────────

class TestDeleteTransaction:
    def test_delete_existing_returns_204(self, client):
        tx_id = _create(client).json()["id"]
        assert client.delete(f"/api/transactions/{tx_id}").status_code == 204

    def test_deleted_transaction_not_listed(self, client):
        tx_id = _create(client).json()["id"]
        client.delete(f"/api/transactions/{tx_id}")
        assert client.get("/api/transactions/").json() == []

    def test_delete_nonexistent_returns_404(self, client):
        assert client.delete("/api/transactions/9999").status_code == 404

    def test_delete_only_removes_target(self, client):
        id1 = _create(client, desc="Keep").json()["id"]
        id2 = _create(client, desc="Remove").json()["id"]
        client.delete(f"/api/transactions/{id2}")
        ids = [t["id"] for t in client.get("/api/transactions/").json()]
        assert id1 in ids
        assert id2 not in ids


# ── PUT /api/transactions/{id} ───────────────────────────────────────────────

class TestUpdateTransaction:
    def _payload(self, **overrides):
        p = {"date": TODAY, "desc": "Updated", "category": "Food & Dining",
             "amount": 250.0, "type": "expense"}
        p.update(overrides)
        return p

    def test_update_returns_200(self, client):
        tx_id = _create(client, desc="Old").json()["id"]
        r = client.put(f"/api/transactions/{tx_id}", json=self._payload())
        assert r.status_code == 200

    def test_update_changes_fields(self, client):
        tx_id = _create(client, desc="Old", amount=100.0).json()["id"]
        r = client.put(f"/api/transactions/{tx_id}", json=self._payload(
            desc="Dinner", amount=450.0, category="Food & Dining"))
        d = r.json()
        assert d["desc"] == "Dinner"
        assert d["amount"] == 450.0
        assert d["category"] == "Food & Dining"

    def test_update_returns_updated_resource(self, client):
        tx_id = _create(client).json()["id"]
        r = client.put(f"/api/transactions/{tx_id}", json=self._payload(desc="Rent", type="expense"))
        assert r.json()["id"] == tx_id
        assert r.json()["desc"] == "Rent"

    def test_update_nonexistent_returns_404(self, client):
        r = client.put("/api/transactions/9999", json=self._payload())
        assert r.status_code == 404

    def test_update_type_from_income_to_expense(self, client):
        tx_id = _create(client, type="income", amount=5000.0, category="Salary").json()["id"]
        r = client.put(f"/api/transactions/{tx_id}",
                       json=self._payload(desc="Salary", type="expense", amount=-5000.0))
        assert r.status_code == 200
        assert r.json()["type"] == "expense"

    def test_update_invalid_investment_returns_404(self, client):
        tx_id = _create(client).json()["id"]
        r = client.put(f"/api/transactions/{tx_id}",
                       json=self._payload(investment_id=9999))
        assert r.status_code == 404

    def test_update_zero_amount_returns_422(self, client):
        tx_id = _create(client).json()["id"]
        r = client.put(f"/api/transactions/{tx_id}", json=self._payload(amount=0.0))
        assert r.status_code == 422

    def test_update_links_valid_investment(self, client):
        inv_id = _create_investment(client)
        tx_id = _create(client, category="Investment", amount=-1000.0).json()["id"]
        r = client.put(f"/api/transactions/{tx_id}",
                       json=self._payload(category="Investment", amount=-1000.0,
                                          investment_id=inv_id))
        assert r.status_code == 200
        assert r.json()["investment_id"] == inv_id

    def test_update_investment_sync_adjusts_invested(self, client):
        inv_id = _create_investment(client)
        # Link on create — adds abs(-1000) = 1000 to invested
        tx_id = _create(client, category="Investment", amount=-1000.0,
                        investment_id=inv_id).json()["id"]
        inv_before = next(i for i in client.get("/api/investments/").json() if i["id"] == inv_id)
        # Change amount to -2000 — undo 1000, apply 2000 → net +1000
        client.put(f"/api/transactions/{tx_id}",
                   json=self._payload(category="Investment", amount=-2000.0,
                                      investment_id=inv_id))
        inv_after = next(i for i in client.get("/api/investments/").json() if i["id"] == inv_id)
        assert inv_after["invested"] == inv_before["invested"] + 1000.0


# ── DELETE /api/transactions/bulk ─────────────────────────────────────────────

class TestBulkDeleteTransactions:
    def test_bulk_delete_returns_204(self, client):
        id1 = _create(client, desc="A").json()["id"]
        id2 = _create(client, desc="B").json()["id"]
        r = client.request("DELETE", "/api/transactions/bulk", json={"ids": [id1, id2]})
        assert r.status_code == 204

    def test_bulk_delete_removes_all_targets(self, client):
        id1 = _create(client, desc="A").json()["id"]
        id2 = _create(client, desc="B").json()["id"]
        id3 = _create(client, desc="C").json()["id"]
        client.request("DELETE", "/api/transactions/bulk", json={"ids": [id1, id2]})
        remaining = [t["id"] for t in client.get("/api/transactions/").json()]
        assert id1 not in remaining
        assert id2 not in remaining
        assert id3 in remaining

    def test_bulk_delete_nonexistent_ids_ignored(self, client):
        id1 = _create(client, desc="Keep").json()["id"]
        r = client.request("DELETE", "/api/transactions/bulk", json={"ids": [9999, 8888]})
        assert r.status_code == 204
        assert len(client.get("/api/transactions/").json()) == 1

    def test_bulk_delete_empty_ids_returns_422(self, client):
        r = client.request("DELETE", "/api/transactions/bulk", json={"ids": []})
        assert r.status_code == 422

    def test_bulk_delete_over_500_ids_returns_422(self, client):
        r = client.request("DELETE", "/api/transactions/bulk",
                           json={"ids": list(range(1, 502))})
        assert r.status_code == 422

    def test_bulk_delete_all_returns_empty_list(self, client):
        ids = [_create(client, desc=f"Tx{i}").json()["id"] for i in range(4)]
        client.request("DELETE", "/api/transactions/bulk", json={"ids": ids})
        assert client.get("/api/transactions/").json() == []


# ── GET /api/transactions/monthly-summary ────────────────────────────────────

@pytest.mark.integration  # uses MySQL DATE_FORMAT — skip in SQLite unit tests
def test_monthly_summary_aggregates_by_month(client):
    _create(client, amount=5000.0, type="income",  date="2025-01-15")
    _create(client, amount=2000.0, type="expense", date="2025-01-20")
    _create(client, amount=1000.0, type="expense", date="2025-01-25")
    r = client.get("/api/transactions/monthly-summary")
    assert r.status_code == 200
    jan = next((m for m in r.json() if m["month"] == "2025-01"), None)
    assert jan is not None
    assert jan["income"]  == 5000.0
    assert jan["expense"] == 3000.0
    assert jan["savings"] == 2000.0


@pytest.mark.integration
def test_monthly_summary_empty_db_returns_empty_list(client):
    r = client.get("/api/transactions/monthly-summary")
    assert r.status_code == 200
    assert r.json() == []
