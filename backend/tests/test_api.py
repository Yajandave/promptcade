from fastapi.testclient import TestClient

from app.main import app


def test_health():
    client = TestClient(app)
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_generate_game_falls_back_without_key(monkeypatch):
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    client = TestClient(app)

    response = client.post(
        "/api/generate-game",
        json={"prompt": "the printer is judging my lunch", "mode": "normal"},
    )

    body = response.json()
    assert response.status_code == 200
    assert body["source"] == "fallback"
    assert body["gameSpec"]["template"] in {"dodger", "collector", "runner", "shooter", "boss_fight"}
