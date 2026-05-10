"""Unit tests for /api/investments endpoints."""
from datetime import date

TODAY = date.today().isoformat()

# ── helpers ───────────────────────────────────────────────────────────────────

def _create(client, **overrides):
    payload = {
        "name": "Test Fund", "type": "MF", "platform": "Zerodha",
        "invested": 10000.0, "current": 12000.0,
    }
    payload.update(overrides)
    return client.post("/api/investments/", json=payload)


# ── POST /api/investments/ ────────────────────────────────────────────────────

class TestCreateInvestment:
    def test_creates_returns_201(self, client):
        r = _create(client)
        assert r.status_code == 201
        d = r.json()
        assert d["name"] == "Test Fund"
        assert d["type"] == "MF"
        assert d["platform"] == "Zerodha"
        assert d["invested"] == 10000.0
        assert d["current"] == 12000.0
        assert isinstance(d["id"], int)

    def test_returns_calculated(self, client):
        r = _create(client, invested=10000.0, current=11000.0)
        assert r.json()["returns"] == 10.0

    def test_negative_returns_when_loss(self, client):
        r = _create(client, invested=10000.0, current=8000.0)
        assert r.json()["returns"] == -20.0

    def test_sip_optional_defaults_null(self, client):
        r = _create(client)
        assert r.json()["sip"] is None

    def test_sip_stored_when_provided(self, client):
        r = _create(client, sip=5000.0)
        assert r.json()["sip"] == 5000.0

    def test_missing_required_field_returns_422(self, client):
        r = client.post("/api/investments/", json={
            "name": "Incomplete", "type": "Stock",
        })
        assert r.status_code == 422


# ── GET /api/investments/ ─────────────────────────────────────────────────────

class TestListInvestments:
    def test_empty_db_returns_empty_list(self, client):
        assert client.get("/api/investments/").json() == []

    def test_returns_all(self, client):
        _create(client, name="A", type="MF")
        _create(client, name="B", type="Stock")
        assert len(client.get("/api/investments/").json()) == 2

    def test_filter_by_type(self, client):
        _create(client, name="Fund", type="MF")
        _create(client, name="Stock", type="Stock")
        r = client.get("/api/investments/?type=MF")
        assert len(r.json()) == 1
        assert r.json()[0]["type"] == "MF"

    def test_filter_no_match_returns_empty(self, client):
        _create(client, type="MF")
        r = client.get("/api/investments/?type=FD")
        assert r.json() == []

    def test_returns_include_returns_field(self, client):
        _create(client, invested=5000.0, current=6000.0)
        items = client.get("/api/investments/").json()
        assert "returns" in items[0]
        assert items[0]["returns"] == 20.0


# ── PUT /api/investments/{id} ─────────────────────────────────────────────────

class TestUpdateInvestment:
    def test_partial_update_current_value(self, client):
        inv_id = _create(client, invested=10000.0, current=12000.0).json()["id"]
        r = client.put(f"/api/investments/{inv_id}", json={"current": 15000.0})
        assert r.status_code == 200
        assert r.json()["current"] == 15000.0
        assert r.json()["returns"] == 50.0

    def test_update_name(self, client):
        inv_id = _create(client, name="Old Name").json()["id"]
        r = client.put(f"/api/investments/{inv_id}", json={"name": "New Name"})
        assert r.json()["name"] == "New Name"

    def test_update_sip(self, client):
        inv_id = _create(client).json()["id"]
        r = client.put(f"/api/investments/{inv_id}", json={"sip": 3000.0})
        assert r.json()["sip"] == 3000.0

    def test_update_nonexistent_returns_404(self, client):
        r = client.put("/api/investments/9999", json={"current": 1000.0})
        assert r.status_code == 404


# ── DELETE /api/investments/{id} ──────────────────────────────────────────────

class TestDeleteInvestment:
    def test_delete_existing_returns_204(self, client):
        inv_id = _create(client).json()["id"]
        assert client.delete(f"/api/investments/{inv_id}").status_code == 204

    def test_deleted_not_listed(self, client):
        inv_id = _create(client).json()["id"]
        client.delete(f"/api/investments/{inv_id}")
        assert client.get("/api/investments/").json() == []

    def test_delete_nonexistent_returns_404(self, client):
        assert client.delete("/api/investments/9999").status_code == 404


# ── GET /api/investments/summary ──────────────────────────────────────────────

class TestInvestmentSummary:
    def test_empty_returns_zeroes(self, client):
        r = client.get("/api/investments/summary")
        assert r.status_code == 200
        d = r.json()
        assert d["total_invested"] == 0.0
        assert d["total_current"] == 0.0
        assert d["total_returns"] == 0.0
        assert d["monthly_sips"] == 0.0
        assert d["active_sips"] == 0

    def test_aggregates_multiple_investments(self, client):
        _create(client, name="A", invested=10000.0, current=11000.0, sip=1000.0)
        _create(client, name="B", invested=20000.0, current=22000.0, sip=2000.0)
        r = client.get("/api/investments/summary").json()
        assert r["total_invested"] == 30000.0
        assert r["total_current"] == 33000.0
        assert r["total_returns"] == 3000.0
        assert r["monthly_sips"] == 3000.0
        assert r["active_sips"] == 2

    def test_no_sip_excluded_from_sip_totals(self, client):
        _create(client, invested=5000.0, current=6000.0)  # no sip
        r = client.get("/api/investments/summary").json()
        assert r["monthly_sips"] == 0.0
        assert r["active_sips"] == 0


# ── GET /api/investments/{id}/transactions ────────────────────────────────────

class TestInvestmentTransactions:
    def test_nonexistent_investment_returns_404(self, client):
        r = client.get("/api/investments/9999/transactions")
        assert r.status_code == 404

    def test_returns_linked_transactions(self, client):
        inv_id = _create(client).json()["id"]
        client.post("/api/transactions/", json={
            "date": TODAY, "desc": "SIP Buy", "category": "Investment",
            "amount": 5000.0, "type": "expense", "investment_id": inv_id,
        })
        r = client.get(f"/api/investments/{inv_id}/transactions")
        assert r.status_code == 200
        assert len(r.json()) == 1
        assert r.json()[0]["desc"] == "SIP Buy"

    def test_returns_empty_for_investment_with_no_transactions(self, client):
        inv_id = _create(client).json()["id"]
        r = client.get(f"/api/investments/{inv_id}/transactions")
        assert r.status_code == 200
        assert r.json() == []
