"""Unit tests for /api/subscriptions endpoints."""

# ── helpers ───────────────────────────────────────────────────────────────────

def _create(client, **overrides):
    payload = {
        "name": "Netflix", "amount": 799.0, "billing_cycle": "monthly",
        "category": "Entertainment", "status": "active",
    }
    payload.update(overrides)
    return client.post("/api/subscriptions/", json=payload)


# ── POST /api/subscriptions/ ──────────────────────────────────────────────────

class TestCreateSubscription:
    def test_creates_returns_201(self, client):
        r = _create(client)
        assert r.status_code == 201
        d = r.json()
        assert d["name"] == "Netflix"
        assert d["amount"] == 799.0
        assert d["billing_cycle"] == "monthly"
        assert d["category"] == "Entertainment"
        assert d["status"] == "active"
        assert isinstance(d["id"], int)

    def test_next_billing_optional(self, client):
        r = _create(client)
        assert r.json()["next_billing"] is None

    def test_next_billing_stored_when_provided(self, client):
        r = _create(client, next_billing="2025-06-01")
        assert r.json()["next_billing"] == "2025-06-01"

    def test_notes_optional(self, client):
        r = _create(client)
        assert r.json()["notes"] is None

    def test_notes_stored_when_provided(self, client):
        r = _create(client, notes="Family plan")
        assert r.json()["notes"] == "Family plan"

    def test_missing_name_returns_422(self, client):
        r = client.post("/api/subscriptions/", json={"amount": 100.0})
        assert r.status_code == 422

    def test_yearly_billing_cycle(self, client):
        r = _create(client, billing_cycle="yearly", amount=3499.0)
        assert r.status_code == 201
        assert r.json()["billing_cycle"] == "yearly"


# ── GET /api/subscriptions/ ───────────────────────────────────────────────────

class TestListSubscriptions:
    def test_empty_db_returns_empty_list(self, client):
        assert client.get("/api/subscriptions/").json() == []

    def test_returns_all(self, client):
        _create(client, name="Netflix")
        _create(client, name="Spotify")
        r = client.get("/api/subscriptions/")
        assert r.status_code == 200
        assert len(r.json()) == 2

    def test_nulls_last_ordering(self, client):
        # Subscriptions without next_billing should appear after those with dates
        _create(client, name="No Date",      next_billing=None)
        _create(client, name="Early Date",   next_billing="2025-01-01")
        _create(client, name="Late Date",    next_billing="2025-12-01")
        items = client.get("/api/subscriptions/").json()
        names = [i["name"] for i in items]
        assert names.index("No Date") > names.index("Early Date")
        assert names.index("No Date") > names.index("Late Date")

    def test_next_billing_ascending_order(self, client):
        _create(client, name="B", next_billing="2025-06-01")
        _create(client, name="A", next_billing="2025-01-01")
        items = client.get("/api/subscriptions/").json()
        assert items[0]["name"] == "A"
        assert items[1]["name"] == "B"


# ── PUT /api/subscriptions/{id} ───────────────────────────────────────────────

class TestUpdateSubscription:
    def test_update_amount(self, client):
        sub_id = _create(client, amount=799.0).json()["id"]
        r = client.put(f"/api/subscriptions/{sub_id}", json={"amount": 899.0})
        assert r.status_code == 200
        assert r.json()["amount"] == 899.0

    def test_update_status_to_paused(self, client):
        sub_id = _create(client, status="active").json()["id"]
        r = client.put(f"/api/subscriptions/{sub_id}", json={"status": "paused"})
        assert r.json()["status"] == "paused"

    def test_update_next_billing_date(self, client):
        sub_id = _create(client).json()["id"]
        r = client.put(f"/api/subscriptions/{sub_id}", json={"next_billing": "2026-01-01"})
        assert r.json()["next_billing"] == "2026-01-01"

    def test_update_multiple_fields(self, client):
        sub_id = _create(client).json()["id"]
        r = client.put(f"/api/subscriptions/{sub_id}", json={
            "amount": 1299.0, "billing_cycle": "yearly", "notes": "Upgraded plan",
        })
        assert r.status_code == 200
        d = r.json()
        assert d["amount"] == 1299.0
        assert d["billing_cycle"] == "yearly"
        assert d["notes"] == "Upgraded plan"

    def test_update_nonexistent_returns_404(self, client):
        r = client.put("/api/subscriptions/9999", json={"amount": 100.0})
        assert r.status_code == 404


# ── DELETE /api/subscriptions/{id} ────────────────────────────────────────────

class TestDeleteSubscription:
    def test_delete_existing_returns_204(self, client):
        sub_id = _create(client).json()["id"]
        assert client.delete(f"/api/subscriptions/{sub_id}").status_code == 204

    def test_deleted_not_listed(self, client):
        sub_id = _create(client).json()["id"]
        client.delete(f"/api/subscriptions/{sub_id}")
        assert client.get("/api/subscriptions/").json() == []

    def test_delete_nonexistent_returns_404(self, client):
        assert client.delete("/api/subscriptions/9999").status_code == 404

    def test_delete_only_removes_target(self, client):
        id1 = _create(client, name="Keep").json()["id"]
        id2 = _create(client, name="Remove").json()["id"]
        client.delete(f"/api/subscriptions/{id2}")
        ids = [s["id"] for s in client.get("/api/subscriptions/").json()]
        assert id1 in ids
        assert id2 not in ids
