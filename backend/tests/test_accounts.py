"""Unit tests for /api/accounts endpoints."""


def _create(client, **overrides):
    payload = {
        "name": "Main Savings",
        "bank_name": "HDFC Bank",
        "account_type": "savings",
        "balance": 50000.0,
    }
    payload.update(overrides)
    return client.post("/api/accounts/", json=payload)


# ── POST /api/accounts/ ───────────────────────────────────────────────────────

class TestCreateAccount:
    def test_creates_returns_201(self, client):
        r = _create(client)
        assert r.status_code == 201
        d = r.json()
        assert d["name"] == "Main Savings"
        assert d["bank_name"] == "HDFC Bank"
        assert d["account_type"] == "savings"
        assert d["balance"] == 50000.0
        assert isinstance(d["id"], int)

    def test_default_color(self, client):
        r = _create(client)
        assert r.json()["color"] == "#3B82F6"

    def test_custom_color_stored(self, client):
        r = _create(client, color="#FF5733")
        assert r.json()["color"] == "#FF5733"

    def test_notes_optional(self, client):
        r = _create(client)
        assert r.json()["notes"] is None

    def test_notes_stored_when_provided(self, client):
        r = _create(client, notes="Emergency fund")
        assert r.json()["notes"] == "Emergency fund"

    def test_credit_card_type(self, client):
        r = _create(client, account_type="credit_card", balance=-15000.0)
        assert r.status_code == 201
        assert r.json()["account_type"] == "credit_card"

    def test_fixed_deposit_type(self, client):
        r = _create(client, account_type="fixed_deposit", balance=200000.0)
        assert r.status_code == 201
        assert r.json()["account_type"] == "fixed_deposit"

    def test_invalid_account_type_returns_422(self, client):
        r = _create(client, account_type="wallet")
        assert r.status_code == 422

    def test_missing_name_returns_422(self, client):
        r = client.post("/api/accounts/", json={"bank_name": "HDFC", "balance": 0.0})
        assert r.status_code == 422

    def test_missing_bank_name_returns_422(self, client):
        r = client.post("/api/accounts/", json={"name": "My Account", "balance": 0.0})
        assert r.status_code == 422

    def test_invalid_color_pattern_returns_422(self, client):
        r = _create(client, color="not-a-color")
        assert r.status_code == 422

    def test_balance_above_limit_returns_422(self, client):
        r = _create(client, balance=200_000_000.0)
        assert r.status_code == 422

    def test_balance_below_limit_returns_422(self, client):
        r = _create(client, balance=-200_000_000.0)
        assert r.status_code == 422

    def test_whitespace_name_stripped(self, client):
        r = _create(client, name="  My Account  ")
        assert r.json()["name"] == "My Account"

    def test_whitespace_bank_name_stripped(self, client):
        r = _create(client, bank_name="  HDFC Bank  ")
        assert r.json()["bank_name"] == "HDFC Bank"

    def test_zero_balance_allowed(self, client):
        r = _create(client, balance=0.0)
        assert r.status_code == 201
        assert r.json()["balance"] == 0.0


# ── GET /api/accounts/ ────────────────────────────────────────────────────────

class TestListAccounts:
    def test_empty_db_returns_empty_list(self, client):
        assert client.get("/api/accounts/").json() == []

    def test_returns_all_created(self, client):
        _create(client, name="Savings")
        _create(client, name="Current")
        r = client.get("/api/accounts/")
        assert r.status_code == 200
        assert len(r.json()) == 2

    def test_ordered_by_name_ascending(self, client):
        _create(client, name="Zebra Bank")
        _create(client, name="Apple Bank")
        items = client.get("/api/accounts/").json()
        assert items[0]["name"] == "Apple Bank"
        assert items[1]["name"] == "Zebra Bank"


# ── GET /api/accounts/summary ─────────────────────────────────────────────────

class TestGetSummary:
    def test_empty_db_summary_zeros(self, client):
        r = client.get("/api/accounts/summary")
        assert r.status_code == 200
        d = r.json()
        assert d["total_balance"] == 0.0
        assert d["liquid_balance"] == 0.0
        assert d["credit_owed"] == 0.0
        assert d["account_count"] == 0

    def test_liquid_balance_excludes_credit_card(self, client):
        _create(client, name="Savings", account_type="savings", balance=100000.0)
        _create(client, name="CC", account_type="credit_card", balance=-20000.0)
        d = client.get("/api/accounts/summary").json()
        assert d["liquid_balance"] == 100000.0
        assert d["credit_owed"] == 20000.0
        assert d["total_balance"] == 80000.0

    def test_total_balance_is_liquid_minus_credit(self, client):
        _create(client, name="Savings", account_type="savings", balance=50000.0)
        _create(client, name="CC", account_type="credit_card", balance=-10000.0)
        d = client.get("/api/accounts/summary").json()
        assert d["total_balance"] == 40000.0

    def test_account_count(self, client):
        _create(client, name="A")
        _create(client, name="B")
        assert client.get("/api/accounts/summary").json()["account_count"] == 2

    def test_only_savings_accounts(self, client):
        _create(client, name="A", account_type="savings", balance=10000.0)
        _create(client, name="B", account_type="current", balance=5000.0)
        d = client.get("/api/accounts/summary").json()
        assert d["liquid_balance"] == 15000.0
        assert d["credit_owed"] == 0.0


# ── PUT /api/accounts/{id} ────────────────────────────────────────────────────

class TestUpdateAccount:
    def test_update_balance_returns_200(self, client):
        acct_id = _create(client).json()["id"]
        r = client.put(f"/api/accounts/{acct_id}", json={"balance": 75000.0})
        assert r.status_code == 200
        assert r.json()["balance"] == 75000.0

    def test_update_name(self, client):
        acct_id = _create(client).json()["id"]
        r = client.put(f"/api/accounts/{acct_id}", json={"name": "Emergency Fund"})
        assert r.json()["name"] == "Emergency Fund"

    def test_update_notes(self, client):
        acct_id = _create(client).json()["id"]
        r = client.put(f"/api/accounts/{acct_id}", json={"notes": "6 months expenses"})
        assert r.json()["notes"] == "6 months expenses"

    def test_update_multiple_fields(self, client):
        acct_id = _create(client).json()["id"]
        r = client.put(f"/api/accounts/{acct_id}", json={
            "name": "Emergency", "balance": 120000.0, "notes": "Rainy day"
        })
        d = r.json()
        assert d["name"] == "Emergency"
        assert d["balance"] == 120000.0
        assert d["notes"] == "Rainy day"

    def test_update_returns_updated_resource(self, client):
        acct_id = _create(client).json()["id"]
        r = client.put(f"/api/accounts/{acct_id}", json={"balance": 99999.0})
        assert r.json()["id"] == acct_id

    def test_update_nonexistent_returns_404(self, client):
        r = client.put("/api/accounts/9999", json={"balance": 1000.0})
        assert r.status_code == 404

    def test_update_invalid_account_type_returns_422(self, client):
        acct_id = _create(client).json()["id"]
        r = client.put(f"/api/accounts/{acct_id}", json={"account_type": "piggy_bank"})
        assert r.status_code == 422

    def test_update_invalid_color_returns_422(self, client):
        acct_id = _create(client).json()["id"]
        r = client.put(f"/api/accounts/{acct_id}", json={"color": "blue"})
        assert r.status_code == 422


# ── DELETE /api/accounts/{id} ─────────────────────────────────────────────────

class TestDeleteAccount:
    def test_delete_existing_returns_204(self, client):
        acct_id = _create(client).json()["id"]
        assert client.delete(f"/api/accounts/{acct_id}").status_code == 204

    def test_deleted_not_listed(self, client):
        acct_id = _create(client).json()["id"]
        client.delete(f"/api/accounts/{acct_id}")
        assert client.get("/api/accounts/").json() == []

    def test_delete_nonexistent_returns_404(self, client):
        assert client.delete("/api/accounts/9999").status_code == 404

    def test_delete_only_removes_target(self, client):
        id1 = _create(client, name="Keep").json()["id"]
        id2 = _create(client, name="Remove").json()["id"]
        client.delete(f"/api/accounts/{id2}")
        ids = [a["id"] for a in client.get("/api/accounts/").json()]
        assert id1 in ids
        assert id2 not in ids
