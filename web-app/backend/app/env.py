from pathlib import Path
import os

ROOT = Path(__file__).resolve().parents[2]


def load_env_file(path: Path = ROOT / ".env") -> None:
    """Load KEY=VALUE pairs from .env without overriding the real environment.

    Kept deliberately small: no interpolation, no multiline values. Only the
    documented keys in .env.example belong here.
    """
    if not path.is_file():
        return
    for raw in path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        if key and key not in os.environ:
            os.environ[key] = value
