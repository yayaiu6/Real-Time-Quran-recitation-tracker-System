from pathlib import Path
from tempfile import TemporaryDirectory
import os

from app.env import load_env_file


def test_env_file_is_loaded_without_overriding(monkeypatch):
    with TemporaryDirectory() as folder:
        path = Path(folder) / ".env"
        path.write_text(
            "# comment\n\nQURANLAB_WEB_KEY=from-file\nIGNORED LINE\n", encoding="utf-8")
        monkeypatch.delenv("QURANLAB_WEB_KEY", raising=False)
        load_env_file(path)
        assert os.environ["QURANLAB_WEB_KEY"] == "from-file"
        monkeypatch.setenv("QURANLAB_WEB_KEY", "from-process")
        load_env_file(path)
        assert os.environ["QURANLAB_WEB_KEY"] == "from-process"


def test_missing_env_file_is_not_an_error():
    with TemporaryDirectory() as folder:
        load_env_file(Path(folder) / "absent.env")
