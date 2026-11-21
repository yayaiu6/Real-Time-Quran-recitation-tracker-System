"""Prepare and run the application from backend/ without Docker."""

import argparse
import hashlib
import os
from pathlib import Path
import shutil
import socket
import subprocess
import sys
import venv


ROOT = Path(__file__).resolve().parents[1]
FRONTEND = ROOT / "frontend"
ENV = ROOT / ".venv"
INTERPRETER = ENV / ("Scripts/python.exe" if os.name == "nt" else "bin/python")
LOCK = ROOT / "backend/requirements.lock"


def run(*args, cwd=ROOT):
    subprocess.run(args, cwd=cwd, check=True)


def fingerprint(root, paths):
    digest = hashlib.sha256()
    for path in sorted(paths):
        info = path.stat()
        digest.update(f"{path.relative_to(root)}\0{info.st_size}\0{info.st_mtime_ns}\n".encode())
    return digest.hexdigest()


def current(stamp, key):
    return stamp.is_file() and stamp.read_text(encoding="utf-8") == key


def prepare_backend():
    interpreter = INTERPRETER
    if not interpreter.is_file():
        print("Creating the Python environment...", flush=True)
        venv.create(ENV, with_pip=True)
    key = hashlib.sha256(LOCK.read_bytes() + (ROOT / "backend/pyproject.toml").read_bytes()).hexdigest()
    stamp = ENV / "recitation-backend.stamp"
    if not current(stamp, key):
        print("Installing backend dependencies...", flush=True)
        if subprocess.run(
            [interpreter, "-m", "pip", "--version"], cwd=ROOT,
            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
        ).returncode:
            run(interpreter, "-m", "ensurepip", "--upgrade")
        run(interpreter, "-m", "pip", "install", "-c", LOCK, ROOT / "backend")
        stamp.write_text(key, encoding="utf-8")
    return interpreter


def prepare_frontend():
    manifests = [FRONTEND / "package.json", FRONTEND / "package-lock.json"]
    inputs = manifests + [FRONTEND / "index.html", FRONTEND / "vite.config.js"]
    for directory in ("src", "public"):
        inputs.extend(path for path in (FRONTEND / directory).rglob("*") if path.is_file())
    key = fingerprint(FRONTEND, inputs)
    build = FRONTEND / "build"
    stamp = build / ".recitation-build"
    if (build / "index.html").is_file() and current(stamp, key):
        return

    npm = shutil.which("npm.cmd" if os.name == "nt" else "npm")
    if not npm:
        raise RuntimeError("Install Node.js with npm and run python main.py again, or use Docker.")
    dependency_key = fingerprint(FRONTEND, manifests)
    dependency_stamp = FRONTEND / "node_modules/.recitation-dependencies"
    if not current(dependency_stamp, dependency_key):
        print("Installing frontend dependencies...", flush=True)
        run(npm, "ci", cwd=FRONTEND)
        dependency_stamp.write_text(dependency_key, encoding="utf-8")
    print("Building the frontend...", flush=True)
    stamp.unlink(missing_ok=True)
    run(npm, "run", "build", cwd=FRONTEND)
    stamp.write_text(key, encoding="utf-8")


def main():
    if sys.version_info < (3, 12):
        if INTERPRETER.is_file() and Path(sys.executable).resolve() != INTERPRETER.resolve():
            sys.exit(subprocess.call([INTERPRETER, __file__, *sys.argv[1:]], cwd=ROOT))
        raise RuntimeError("Python 3.12 or newer is required. On Windows, try py -3.12 main.py.")
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--port", type=int, default=8000)
    port = parser.parse_args().port
    if not 1 <= port <= 65535:
        parser.error("--port must be between 1 and 65535")
    with socket.socket() as probe:
        if probe.connect_ex(("127.0.0.1", port)) == 0:
            raise RuntimeError(f"Port {port} is already in use. Stop the existing server or try --port 8001.")
    interpreter = prepare_backend()
    prepare_frontend()
    print(f"Open http://127.0.0.1:{port}/ in your browser. Press Ctrl+C to stop.", flush=True)
    run(interpreter, "-m", "uvicorn", "app.main:app", "--app-dir", "backend",
        "--host", "127.0.0.1", "--port", str(port))


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        sys.exit(130)
    except (OSError, RuntimeError, subprocess.CalledProcessError) as error:
        sys.exit(f"Could not start Recitation Tracker: {error}")
