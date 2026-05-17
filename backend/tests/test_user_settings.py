"""Unit tests for /api/settings endpoints."""


# ── GET /api/settings/ ────────────────────────────────────────────────────────

class TestGetSettings:
    def test_returns_200_with_defaults(self, client):
        r = client.get("/api/settings/")
        assert r.status_code == 200

    def test_response_has_required_fields(self, client):
        d = client.get("/api/settings/").json()
        assert "user_name" in d
        assert "palette" in d
        assert "surface" in d
        assert "density" in d
        assert "financial_year" in d

    def test_get_is_idempotent(self, client):
        r1 = client.get("/api/settings/").json()
        r2 = client.get("/api/settings/").json()
        assert r1 == r2

    def test_creates_row_on_first_call(self, client):
        r = client.get("/api/settings/")
        assert r.status_code == 200
        assert r.json()["user_name"] is not None


# ── PUT /api/settings/ ────────────────────────────────────────────────────────

class TestUpdateSettings:
    def test_update_user_name(self, client):
        r = client.put("/api/settings/", json={"user_name": "Tushar"})
        assert r.status_code == 200
        assert r.json()["user_name"] == "Tushar"

    def test_update_palette_indigo(self, client):
        r = client.put("/api/settings/", json={"palette": "indigo"})
        assert r.json()["palette"] == "indigo"

    def test_update_palette_emerald(self, client):
        r = client.put("/api/settings/", json={"palette": "emerald"})
        assert r.json()["palette"] == "emerald"

    def test_update_palette_rose(self, client):
        r = client.put("/api/settings/", json={"palette": "rose"})
        assert r.json()["palette"] == "rose"

    def test_update_palette_amber(self, client):
        r = client.put("/api/settings/", json={"palette": "amber"})
        assert r.json()["palette"] == "amber"

    def test_update_palette_cyan(self, client):
        r = client.put("/api/settings/", json={"palette": "cyan"})
        assert r.json()["palette"] == "cyan"

    def test_update_palette_violet(self, client):
        r = client.put("/api/settings/", json={"palette": "violet"})
        assert r.json()["palette"] == "violet"

    def test_update_surface_frosted(self, client):
        r = client.put("/api/settings/", json={"surface": "frosted"})
        assert r.json()["surface"] == "frosted"

    def test_update_surface_flat(self, client):
        r = client.put("/api/settings/", json={"surface": "flat"})
        assert r.json()["surface"] == "flat"

    def test_update_surface_elevated(self, client):
        r = client.put("/api/settings/", json={"surface": "elevated"})
        assert r.json()["surface"] == "elevated"

    def test_update_density_compact(self, client):
        r = client.put("/api/settings/", json={"density": "compact"})
        assert r.json()["density"] == "compact"

    def test_update_density_balanced(self, client):
        r = client.put("/api/settings/", json={"density": "balanced"})
        assert r.json()["density"] == "balanced"

    def test_update_density_analyst(self, client):
        r = client.put("/api/settings/", json={"density": "analyst"})
        assert r.json()["density"] == "analyst"

    def test_update_financial_year_calendar(self, client):
        r = client.put("/api/settings/", json={"financial_year": "calendar"})
        assert r.json()["financial_year"] == "calendar"

    def test_update_financial_year_fiscal(self, client):
        r = client.put("/api/settings/", json={"financial_year": "fiscal"})
        assert r.json()["financial_year"] == "fiscal"

    def test_update_multiple_fields(self, client):
        r = client.put("/api/settings/", json={
            "user_name": "Tushar", "palette": "rose", "surface": "elevated",
        })
        d = r.json()
        assert d["user_name"] == "Tushar"
        assert d["palette"] == "rose"
        assert d["surface"] == "elevated"

    def test_update_invalid_palette_returns_422(self, client):
        r = client.put("/api/settings/", json={"palette": "neon"})
        assert r.status_code == 422

    def test_update_invalid_density_returns_422(self, client):
        r = client.put("/api/settings/", json={"density": "ultra"})
        assert r.status_code == 422

    def test_update_invalid_surface_returns_422(self, client):
        r = client.put("/api/settings/", json={"surface": "glass"})
        assert r.status_code == 422

    def test_update_invalid_financial_year_returns_422(self, client):
        r = client.put("/api/settings/", json={"financial_year": "quarterly"})
        assert r.status_code == 422

    def test_changes_persist_across_get(self, client):
        client.put("/api/settings/", json={"user_name": "Alice", "palette": "cyan"})
        d = client.get("/api/settings/").json()
        assert d["user_name"] == "Alice"
        assert d["palette"] == "cyan"

    def test_partial_update_preserves_other_fields(self, client):
        client.put("/api/settings/", json={"user_name": "Bob", "palette": "violet"})
        client.put("/api/settings/", json={"surface": "frosted"})
        d = client.get("/api/settings/").json()
        assert d["user_name"] == "Bob"
        assert d["palette"] == "violet"
        assert d["surface"] == "frosted"

    def test_update_creates_row_if_not_exists(self, client):
        r = client.put("/api/settings/", json={"user_name": "New User"})
        assert r.status_code == 200
        assert r.json()["user_name"] == "New User"
