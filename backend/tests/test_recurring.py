"""Unit tests for /api/recurring endpoints."""


def _create(client, **overrides):
    payload = {
        "desc": "Netflix Subscription",
        "category": "Entertainment",
        "amount": 799.0,
        "type": "expense",
        "day_of_month": 5,
    }
    payload.update(overrides)
    return client.post("/api/recurring/", json=payload)


# ── POST /api/recurring/ ──────────────────────────────────────────────────────

class TestCreateRecurring:
    def test_creates_returns_201(self, client):
        r = _create(client)
        assert r.status_code == 201
        d = r.json()
        assert d["desc"] == "Netflix Subscription"
        assert d["amount"] == 799.0
        assert d["type"] == "expense"
        assert d["day_of_month"] == 5
        assert d["active"] is True
        assert isinstance(d["id"], int)

    def test_default_active_is_true(self, client):
        r = _create(client)
        assert r.json()["active"] is True

    def test_inactive_can_be_created(self, client):
        r = _create(client, active=False)
        assert r.status_code == 201
        assert r.json()["active"] is False

    def test_tags_null_by_default(self, client):
        r = _create(client)
        assert r.json()["tags"] is None

    def test_tags_stored_when_provided(self, client):
        r = _create(client, tags="streaming,entertainment")
        assert r.json()["tags"] == "streaming,entertainment"

    def test_income_type_allowed(self, client):
        r = _create(client, desc="Salary", type="income", amount=80000.0)
        assert r.status_code == 201
        assert r.json()["type"] == "income"

    def test_invalid_type_returns_422(self, client):
        r = _create(client, type="transfer")
        assert r.status_code == 422

    def test_zero_amount_returns_422(self, client):
        r = _create(client, amount=0.0)
        assert r.status_code == 422

    def test_negative_amount_returns_422(self, client):
        r = _create(client, amount=-100.0)
        assert r.status_code == 422

    def test_day_of_month_28_is_valid(self, client):
        r = _create(client, day_of_month=28)
        assert r.status_code == 201
        assert r.json()["day_of_month"] == 28

    def test_day_of_month_29_returns_422(self, client):
        r = _create(client, day_of_month=29)
        assert r.status_code == 422

    def test_day_of_month_zero_returns_422(self, client):
        r = _create(client, day_of_month=0)
        assert r.status_code == 422

    def test_missing_desc_returns_422(self, client):
        r = client.post("/api/recurring/", json={
            "category": "Food", "amount": 500.0, "type": "expense",
        })
        assert r.status_code == 422

    def test_whitespace_desc_stripped(self, client):
        r = _create(client, desc="  House Rent  ")
        assert r.json()["desc"] == "House Rent"

    def test_whitespace_category_stripped(self, client):
        r = _create(client, category="  Housing  ")
        assert r.json()["category"] == "Housing"

    def test_investment_id_null_by_default(self, client):
        r = _create(client)
        assert r.json()["investment_id"] is None


# ── GET /api/recurring/ ───────────────────────────────────────────────────────

class TestListRecurring:
    def test_empty_db_returns_empty_list(self, client):
        assert client.get("/api/recurring/").json() == []

    def test_returns_all_created(self, client):
        _create(client, desc="Netflix", day_of_month=5)
        _create(client, desc="Rent", day_of_month=1)
        r = client.get("/api/recurring/")
        assert r.status_code == 200
        assert len(r.json()) == 2

    def test_ordered_by_day_of_month_ascending(self, client):
        _create(client, desc="Late",  day_of_month=25)
        _create(client, desc="Early", day_of_month=1)
        _create(client, desc="Mid",   day_of_month=15)
        items = client.get("/api/recurring/").json()
        days = [i["day_of_month"] for i in items]
        assert days == sorted(days)


# ── PUT /api/recurring/{id} ───────────────────────────────────────────────────

class TestUpdateRecurring:
    def test_update_amount_returns_200(self, client):
        rec_id = _create(client).json()["id"]
        r = client.put(f"/api/recurring/{rec_id}", json={"amount": 999.0})
        assert r.status_code == 200
        assert r.json()["amount"] == 999.0

    def test_update_active_to_false(self, client):
        rec_id = _create(client, active=True).json()["id"]
        r = client.put(f"/api/recurring/{rec_id}", json={"active": False})
        assert r.json()["active"] is False

    def test_update_active_to_true(self, client):
        rec_id = _create(client, active=False).json()["id"]
        r = client.put(f"/api/recurring/{rec_id}", json={"active": True})
        assert r.json()["active"] is True

    def test_update_day_of_month(self, client):
        rec_id = _create(client, day_of_month=5).json()["id"]
        r = client.put(f"/api/recurring/{rec_id}", json={"day_of_month": 20})
        assert r.json()["day_of_month"] == 20

    def test_update_type_expense_to_income(self, client):
        rec_id = _create(client, type="expense").json()["id"]
        r = client.put(f"/api/recurring/{rec_id}", json={"type": "income"})
        assert r.json()["type"] == "income"

    def test_update_desc_and_category(self, client):
        rec_id = _create(client).json()["id"]
        r = client.put(f"/api/recurring/{rec_id}", json={"desc": "Spotify", "category": "Music"})
        d = r.json()
        assert d["desc"] == "Spotify"
        assert d["category"] == "Music"

    def test_update_nonexistent_returns_404(self, client):
        r = client.put("/api/recurring/9999", json={"amount": 100.0})
        assert r.status_code == 404

    def test_update_invalid_day_returns_422(self, client):
        rec_id = _create(client).json()["id"]
        r = client.put(f"/api/recurring/{rec_id}", json={"day_of_month": 30})
        assert r.status_code == 422

    def test_update_zero_amount_returns_422(self, client):
        rec_id = _create(client).json()["id"]
        r = client.put(f"/api/recurring/{rec_id}", json={"amount": 0.0})
        assert r.status_code == 422


# ── DELETE /api/recurring/{id} ────────────────────────────────────────────────

class TestDeleteRecurring:
    def test_delete_existing_returns_204(self, client):
        rec_id = _create(client).json()["id"]
        assert client.delete(f"/api/recurring/{rec_id}").status_code == 204

    def test_deleted_not_listed(self, client):
        rec_id = _create(client).json()["id"]
        client.delete(f"/api/recurring/{rec_id}")
        assert client.get("/api/recurring/").json() == []

    def test_delete_nonexistent_returns_404(self, client):
        assert client.delete("/api/recurring/9999").status_code == 404

    def test_delete_only_removes_target(self, client):
        id1 = _create(client, desc="Keep").json()["id"]
        id2 = _create(client, desc="Remove").json()["id"]
        client.delete(f"/api/recurring/{id2}")
        ids = [r["id"] for r in client.get("/api/recurring/").json()]
        assert id1 in ids
        assert id2 not in ids
