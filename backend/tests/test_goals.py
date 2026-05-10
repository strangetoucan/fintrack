"""Unit tests for /api/goals (goals + EMIs) endpoints."""

# ── helpers ───────────────────────────────────────────────────────────────────

def _create_goal(client, **overrides):
    payload = {
        "name": "Emergency Fund", "target": 100000.0, "current": 40000.0,
        "deadline": "2025-12-31", "color": "#22c55e", "icon": "🛡️",
    }
    payload.update(overrides)
    return client.post("/api/goals/", json=payload)


def _create_emi(client, **overrides):
    payload = {
        "name": "Home Loan", "bank": "HDFC", "emi": 25000.0,
        "outstanding": 3000000.0, "total_loan": 4000000.0, "end_date": "2032-06-01",
    }
    payload.update(overrides)
    return client.post("/api/goals/emis", json=payload)


# ── Goals: POST /api/goals/ ───────────────────────────────────────────────────

class TestCreateGoal:
    def test_creates_returns_201(self, client):
        r = _create_goal(client)
        assert r.status_code == 201
        d = r.json()
        assert d["name"] == "Emergency Fund"
        assert d["target"] == 100000.0
        assert d["current"] == 40000.0
        assert d["deadline"] == "2025-12-31"
        assert isinstance(d["id"], int)

    def test_icon_and_color_stored(self, client):
        r = _create_goal(client, icon="🏠", color="#f97316")
        assert r.json()["icon"] == "🏠"
        assert r.json()["color"] == "#f97316"

    def test_missing_required_field_returns_422(self, client):
        r = client.post("/api/goals/", json={"name": "Incomplete Goal"})
        assert r.status_code == 422


# ── Goals: GET /api/goals/ ────────────────────────────────────────────────────

class TestListGoals:
    def test_empty_db_returns_empty_list(self, client):
        assert client.get("/api/goals/").json() == []

    def test_returns_all_goals(self, client):
        _create_goal(client, name="Goal A")
        _create_goal(client, name="Goal B")
        assert len(client.get("/api/goals/").json()) == 2


# ── Goals: PUT /api/goals/{id} ────────────────────────────────────────────────

class TestUpdateGoal:
    def test_partial_update_current(self, client):
        goal_id = _create_goal(client, current=40000.0).json()["id"]
        r = client.put(f"/api/goals/{goal_id}", json={"current": 60000.0})
        assert r.status_code == 200
        assert r.json()["current"] == 60000.0

    def test_partial_update_name(self, client):
        goal_id = _create_goal(client, name="Old Name").json()["id"]
        r = client.put(f"/api/goals/{goal_id}", json={"name": "New Name"})
        assert r.json()["name"] == "New Name"

    def test_update_multiple_fields(self, client):
        goal_id = _create_goal(client).json()["id"]
        r = client.put(f"/api/goals/{goal_id}", json={
            "current": 75000.0, "deadline": "2026-06-30", "color": "#ef4444",
        })
        d = r.json()
        assert d["current"] == 75000.0
        assert d["deadline"] == "2026-06-30"
        assert d["color"] == "#ef4444"

    def test_update_nonexistent_returns_404(self, client):
        assert client.put("/api/goals/9999", json={"current": 1000.0}).status_code == 404


# ── Goals: DELETE /api/goals/{id} ────────────────────────────────────────────

class TestDeleteGoal:
    def test_delete_existing_returns_204(self, client):
        goal_id = _create_goal(client).json()["id"]
        assert client.delete(f"/api/goals/{goal_id}").status_code == 204

    def test_deleted_not_listed(self, client):
        goal_id = _create_goal(client).json()["id"]
        client.delete(f"/api/goals/{goal_id}")
        assert client.get("/api/goals/").json() == []

    def test_delete_nonexistent_returns_404(self, client):
        assert client.delete("/api/goals/9999").status_code == 404


# ── EMIs: POST /api/goals/emis ───────────────────────────────────────────────

class TestCreateEMI:
    def test_creates_returns_201(self, client):
        r = _create_emi(client)
        assert r.status_code == 201
        d = r.json()
        assert d["name"] == "Home Loan"
        assert d["bank"] == "HDFC"
        assert d["emi"] == 25000.0
        assert d["outstanding"] == 3000000.0
        assert d["total_loan"] == 4000000.0
        assert isinstance(d["id"], int)

    def test_missing_field_returns_422(self, client):
        r = client.post("/api/goals/emis", json={"name": "Loan"})
        assert r.status_code == 422


# ── EMIs: GET /api/goals/emis ────────────────────────────────────────────────

class TestListEMIs:
    def test_empty_db_returns_empty_list(self, client):
        assert client.get("/api/goals/emis").json() == []

    def test_returns_all_emis(self, client):
        _create_emi(client, name="Car Loan")
        _create_emi(client, name="Home Loan")
        assert len(client.get("/api/goals/emis").json()) == 2


# ── EMIs: PUT /api/goals/emis/{id} ───────────────────────────────────────────

class TestUpdateEMI:
    def test_update_outstanding(self, client):
        emi_id = _create_emi(client, outstanding=3000000.0).json()["id"]
        r = client.put(f"/api/goals/emis/{emi_id}", json={"outstanding": 2900000.0})
        assert r.status_code == 200
        assert r.json()["outstanding"] == 2900000.0

    def test_update_nonexistent_returns_404(self, client):
        assert client.put("/api/goals/emis/9999", json={"emi": 1000.0}).status_code == 404


# ── EMIs: DELETE /api/goals/emis/{id} ────────────────────────────────────────

class TestDeleteEMI:
    def test_delete_existing_returns_204(self, client):
        emi_id = _create_emi(client).json()["id"]
        assert client.delete(f"/api/goals/emis/{emi_id}").status_code == 204

    def test_deleted_not_listed(self, client):
        emi_id = _create_emi(client).json()["id"]
        client.delete(f"/api/goals/emis/{emi_id}")
        assert client.get("/api/goals/emis").json() == []

    def test_delete_nonexistent_returns_404(self, client):
        assert client.delete("/api/goals/emis/9999").status_code == 404
