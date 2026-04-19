"""
Zenith backend API tests - covers all endpoints in /api.
"""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL")
if not BASE_URL:
    # Fallback to read the public URL from frontend .env
    env_path = "/app/frontend/.env"
    if os.path.exists(env_path):
        with open(env_path) as f:
            for line in f:
                if line.startswith("REACT_APP_BACKEND_URL="):
                    BASE_URL = line.split("=", 1)[1].strip()
                    break

assert BASE_URL, "REACT_APP_BACKEND_URL must be set"
BASE_URL = BASE_URL.rstrip("/")
API = f"{BASE_URL}/api"


@pytest.fixture(scope="module")
def client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(autouse=True)
def cleanup_tasks(client):
    """Clean today's tasks before each test to avoid cross-test jar-capacity contamination."""
    # Get all tasks and delete the ones prefixed with TEST_
    try:
        resp = client.get(f"{API}/tasks")
        if resp.status_code == 200:
            for t in resp.json():
                if t.get("title", "").startswith("TEST_"):
                    client.delete(f"{API}/tasks/{t['id']}")
    except Exception:
        pass
    yield


# --- Root ----------------------------------------------------------
class TestRoot:
    def test_root_returns_zenith_message(self, client):
        r = client.get(f"{API}/")
        assert r.status_code == 200
        data = r.json()
        assert "message" in data
        assert "Zenith" in data["message"]


# --- Tasks CRUD ----------------------------------------------------
class TestTasksCRUD:
    def test_create_task_persists_and_returns_fields(self, client):
        payload = {"title": "TEST_create_pebble", "task_type": "pebble"}
        r = client.post(f"{API}/tasks", json=payload)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["title"] == payload["title"]
        assert data["task_type"] == "pebble"
        assert data["volume"] == 15
        assert data["shipped"] is False
        assert "id" in data
        task_id = data["id"]

        # Verify via GET
        r2 = client.get(f"{API}/tasks")
        assert r2.status_code == 200
        titles = [t["title"] for t in r2.json()]
        assert payload["title"] in titles
        # cleanup
        client.delete(f"{API}/tasks/{task_id}")

    def test_create_task_stone_volume_30(self, client):
        r = client.post(f"{API}/tasks", json={"title": "TEST_stone", "task_type": "stone"})
        assert r.status_code == 200
        assert r.json()["volume"] == 30
        client.delete(f"{API}/tasks/{r.json()['id']}")

    def test_create_task_sand_volume_5(self, client):
        r = client.post(f"{API}/tasks", json={"title": "TEST_sand", "task_type": "sand"})
        assert r.status_code == 200
        assert r.json()["volume"] == 5
        client.delete(f"{API}/tasks/{r.json()['id']}")

    def test_get_tasks_returns_list(self, client):
        r = client.get(f"{API}/tasks")
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_delete_task(self, client):
        r = client.post(f"{API}/tasks", json={"title": "TEST_delete_me", "task_type": "sand"})
        tid = r.json()["id"]
        d = client.delete(f"{API}/tasks/{tid}")
        assert d.status_code == 200
        assert d.json().get("status") == "deleted"
        # verify gone
        r2 = client.get(f"{API}/tasks")
        titles = [t["title"] for t in r2.json()]
        assert "TEST_delete_me" not in titles

    def test_delete_nonexistent_returns_404(self, client):
        r = client.delete(f"{API}/tasks/nonexistent-id-xyz")
        assert r.status_code == 404


# --- Jar capacity --------------------------------------------------
class TestJarCapacity:
    def test_jar_overflow_returns_400(self, client):
        # Clean first
        for t in client.get(f"{API}/tasks").json():
            if t.get("title", "").startswith("TEST_"):
                client.delete(f"{API}/tasks/{t['id']}")

        created = []
        # 3 stones = 90 volume
        for i in range(3):
            r = client.post(f"{API}/tasks", json={"title": f"TEST_fill_{i}", "task_type": "stone"})
            assert r.status_code == 200, r.text
            created.append(r.json()["id"])

        # Next stone (30) would overflow -> 90+30=120 > 100
        r = client.post(f"{API}/tasks", json={"title": "TEST_overflow", "task_type": "stone"})
        assert r.status_code == 400
        assert "full" in r.json().get("detail", "").lower()

        # Pebble (15) would also overflow -> 105
        r = client.post(f"{API}/tasks", json={"title": "TEST_overflow_pebble", "task_type": "pebble"})
        assert r.status_code == 400

        # Sand (5) should fit (90+5=95)
        r = client.post(f"{API}/tasks", json={"title": "TEST_sand_ok", "task_type": "sand"})
        assert r.status_code == 200
        created.append(r.json()["id"])

        # cleanup
        for tid in created:
            client.delete(f"{API}/tasks/{tid}")


# --- Ship task -----------------------------------------------------
class TestShipTask:
    def test_ship_updates_session_score_and_fuel(self, client):
        # Get baseline session
        s0 = client.get(f"{API}/session").json()
        score0 = s0["score_you"]
        fuel0 = s0["fuel_remaining"]

        # create a pebble task
        r = client.post(f"{API}/tasks", json={"title": "TEST_ship_me", "task_type": "pebble"})
        assert r.status_code == 200
        tid = r.json()["id"]
        vol = r.json()["volume"]

        ship = client.post(f"{API}/tasks/{tid}/ship", json={"description": "done"})
        assert ship.status_code == 200, ship.text
        data = ship.json()
        assert data["shipped"] is True
        assert data["ship_description"] == "done"

        # Verify session updated
        s1 = client.get(f"{API}/session").json()
        assert s1["score_you"] == score0 + 1
        assert s1["fuel_remaining"] == fuel0 - vol
        assert any(item["task_id"] == tid for item in s1["shipped_items"])

    def test_double_ship_returns_404(self, client):
        r = client.post(f"{API}/tasks", json={"title": "TEST_double", "task_type": "sand"})
        tid = r.json()["id"]
        r1 = client.post(f"{API}/tasks/{tid}/ship", json={"description": ""})
        assert r1.status_code == 200
        r2 = client.post(f"{API}/tasks/{tid}/ship", json={"description": ""})
        assert r2.status_code == 404


# --- Session -------------------------------------------------------
class TestSession:
    def test_get_session_returns_structure(self, client):
        r = client.get(f"{API}/session")
        assert r.status_code == 200
        d = r.json()
        for key in ["id", "session_date", "score_you", "fuel_remaining", "shipped_items"]:
            assert key in d
        assert "_id" not in d  # ObjectId must be excluded

    def test_save_day_creates_replay(self, client):
        r = client.post(f"{API}/session/save-day")
        assert r.status_code == 200
        data = r.json()
        assert "id" in data
        assert "saved_at" in data
        assert "session" in data
        assert "tasks" in data
        assert "_id" not in data

        # Verify via GET /replays
        r2 = client.get(f"{API}/replays")
        assert r2.status_code == 200
        replays = r2.json()
        assert isinstance(replays, list)
        assert any(rp["id"] == data["id"] for rp in replays)


# --- Replays -------------------------------------------------------
class TestReplays:
    def test_get_replays_no_objectid(self, client):
        r = client.get(f"{API}/replays")
        assert r.status_code == 200
        for rp in r.json():
            assert "_id" not in rp
