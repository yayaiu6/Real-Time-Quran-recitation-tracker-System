from fastapi.testclient import TestClient
import httpx
from app.main import EVALUATION_FILES, app, arabic_key


def test_health_and_configuration(monkeypatch):
    monkeypatch.delenv("QURANLAB_WEB_KEY", raising=False)
    with TestClient(app) as client:
        assert client.get("/api/health").json() == {"status": "ok"}
        config = client.get("/api/config")
        assert config.json()["name"] == "Recitation Tracker"
        assert config.json()["web_key"] is None
        assert config.headers["cache-control"] == "no-store"
        assert config.json()["evaluation_available"] is False


def test_evaluation_is_advertised_only_when_the_reader_is_packaged(monkeypatch, tmp_path):
    monkeypatch.setenv("QURANLAB_WEB_KEY", "qlk_v1_test")
    monkeypatch.setattr("app.main.FRONTEND_BUILD", tmp_path)
    with TestClient(app) as client:
        assert client.get("/api/config").json()["evaluation_available"] is False
        for filename in EVALUATION_FILES:
            asset = tmp_path / filename
            asset.parent.mkdir(parents=True, exist_ok=True)
            asset.touch()
        assert client.get("/api/config").json()["evaluation_available"] is True
        monkeypatch.setenv("QURANLAB_WEB_KEY", "not-a-browser-key")
        assert client.get("/api/config").json()["web_key"] is None


def test_pages_and_failures(monkeypatch):
    with TestClient(app) as client:
        async def upstream(url):
            return httpx.Response(200, content=b"page", request=httpx.Request("GET", url))
        monkeypatch.setattr(app.state.http, "get", upstream)
        assert client.get("/api/quran/pages/1").content == b"page"
        assert client.get("/api/quran/pages/0").status_code == 422
        assert client.get("/api/quran/pages/605").status_code == 422


def test_search():
    with TestClient(app) as client:
        app.state.quran = [{"id": 1, "verses": [{"id": 1, "text": "بِسْمِ ٱللَّهِ"}]}]
        assert client.get("/api/search", params={"q": "بسم"}).json()[0]["ayah"] == 1
        assert client.get("/api/search", params={"q": "x"}).status_code == 422
        assert client.get("/api/search", params={"q": "not-found"}).json() == []
    assert arabic_key("أَإِآٱى") == "ااااي"


def test_upstream_failure_is_not_a_success(monkeypatch):
    with TestClient(app) as client:
        async def unavailable(url):
            raise httpx.ConnectError("offline")
        monkeypatch.setattr(app.state.http, "get", unavailable)
        assert client.get("/api/quran/pages/1").status_code == 502
        assert client.get("/api/quran/atlas").status_code == 502
        assert client.get("/api/search", params={"q": "test"}).status_code == 502


def test_invalid_provider_data_and_private_paths(monkeypatch):
    with TestClient(app) as client:
        async def invalid(url):
            return httpx.Response(200, content=b"{}", request=httpx.Request("GET", url))
        monkeypatch.setattr(app.state.http, "get", invalid)
        assert client.get("/api/search", params={"q": "test"}).status_code == 502
        assert client.get("/.env").status_code == 404
        assert client.get("/backend/app/main.py").status_code == 404


def test_chapter_display_metadata():
    with TestClient(app) as client:
        app.state.quran = [{"id": 18, "name": "الكهف", "transliteration": "Al-Kahf",
                            "verses": [{"id": 1, "text": "الحمد"}]}]
        assert client.get("/api/chapters").json() == [
            {"number": 18, "arabic": "الكهف", "latin": "Al-Kahf", "ayah_count": 1}]


def test_search_expansion_preserves_order_and_reports_total():
    with TestClient(app) as client:
        app.state.quran = [{"id": 1, "verses": [{"id": n, "text": "كلمة"} for n in range(1, 402)]}]
        first = client.get("/api/search", params={"q": "كلمة"})
        assert len(first.json()) == 30
        assert first.headers["x-total-count"] == "401"
        expanded = client.get("/api/search", params={"q": "كلمة", "limit": 400}).json()
        assert len(expanded) == 400
        assert expanded[-1]["ayah"] == 400
        assert client.get("/api/search", params={"q": "كلمة", "limit": 1000}).status_code == 422
