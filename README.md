# Recitation Tracker

Recitation Tracker is a browser-based Quran reader with verse search, live recitation preview, and optional word tracking and correction. Automated feedback is not an authoritative assessment of pronunciation or Tajweed.

The frontend uses JavaScript modules, Vite, Web Audio, the QVP WebAssembly renderer, and the vendored TajweedFormer 3.1.3 browser client. Python 3.12+ and FastAPI provide configuration and Quran data endpoints and serve the production build. Recognition runs in the browser; no database is required.

| Path | Purpose |
| --- | --- |
| `frontend/src/` | Reader UI, audio capture, recognition, Quran preview, and optional tracking |
| `frontend/public/` | Quran data, renderer and recognition assets, fonts, and audio |
| `backend/app/` | FastAPI application and environment loading |
| `backend/tests/` | Backend API and environment tests |

## Quick start

From the repository root, with Docker running and Docker Compose v2.24+ installed:

```bash
docker compose up --build
```

Open **http://localhost:8000**. One container builds and serves the reader and API. No local Python or Node.js installation is required.

Reading and search work without `.env`. For recitation, copy `.env.example` to `.env` at the repository root and set `QURANLAB_WEB_KEY` to a browser key authorized for the exact URL you use. Never use an admin key. If port 8000 is already occupied, stop the other server or set `APP_PORT=8001` in `.env` and open `http://localhost:8001`.

## Production with Docker

Build from the repository root on a Docker host (Linux containers):

```sh
docker build -t recitation-tracker .
docker run -d --name recitation-tracker --restart unless-stopped -p 127.0.0.1:8000:8000 recitation-tracker
```

For recitation, add `--env-file .env` before the image name in `docker run`. The file is excluded from the build context. Put an HTTPS reverse proxy in front of the published port on a remote server so the browser can access the microphone. Use `docker logs recitation-tracker` to inspect startup; the container checks `/api/health` automatically.

A CI runner can use the same `docker build` command. To deploy without building on the server, transfer the built image using a registry or `docker save` / `docker load`. The server does not need Python or Node.js installed.

## Development without Docker

With Python 3.12+ and Node.js 24 installed, run from the repository root:

```powershell
cd backend
python main.py
```

The launcher installs dependencies, builds the frontend, and serves it at `http://localhost:8000`. If the port is busy, use `python main.py --port 8001`.

For Vite live reload, keep the backend on its default port 8000 and open a second terminal at the repository root:

```powershell
cd frontend
npm run dev
```

Open `http://127.0.0.1:5173/` using the URL printed by Vite if it selects a different port. Vite proxies `/api` to `127.0.0.1:8000`.

To run backend tests from the repository root after the non-Docker setup (PowerShell):

```powershell
.\.venv\Scripts\python.exe -m pip install -c backend/requirements.lock "./backend[test]"
.\.venv\Scripts\python.exe -m pytest backend/tests -q
```

## Optional tracking engine

When `frontend/src/production/engine/` is present, the reader can follow recitation and provide correction feedback. To build without tracking, omit that directory from a separate source copy and run the same build command. No flag or source edit is needed. The build retains `data/quran.json` for text search and Arabic recitation preview, but omits native alignment assets. Preview text is a candidate Quran passage, not a verbatim transcript.

## Troubleshooting

- **Reader returns 404 in production:** Build before starting FastAPI, then restart it. Check `/api/health` for backend connectivity.
- **Recognition does not start:** Check that `/api/config` supplies a browser key, that the origin is authorized, and that the browser can reach the SDK services.
- **Microphone is unavailable:** Use localhost or HTTPS, allow microphone access in the browser, and verify the selected input device.
- **Tracking is unavailable:** Reading and preview can still work. In a full build, check DevTools for engine loading errors and verify that both native alignment assets are served.

See [LICENSE](LICENSE) for project license status and third-party terms.
