from contextlib import asynccontextmanager
from pathlib import Path
import os
import re

import httpx
from fastapi import FastAPI, HTTPException, Query
from fastapi.responses import Response
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, TypeAdapter, ValidationError

from .env import ROOT, load_env_file

load_env_file()
FRONTEND_BUILD = ROOT / "frontend/build"
WEB_KEY = re.compile(r"qlk_v1_[\w-]+", re.ASCII)
EVALUATION_FILES = (
    "index.html",
    "assets/worker-DN3ZN5z2.js",
    "assets/tajweedformer-2YZDQmxP.js",
    "assets/tajweedformer-BydJeWk1.wasm",
    "data/quran.json",
    "data/engine.wasm.gz",
    "data/engine-words.jsonl.gz",
)


class Health(BaseModel):
    status: str = "ok"


class Configuration(BaseModel):
    name: str = "Recitation Tracker"
    web_key: str | None
    evaluation_available: bool = False


class VerseHit(BaseModel):
    surah: int
    ayah: int
    text: str


class SourceVerse(BaseModel):
    id: int
    text: str


class SourceChapter(BaseModel):
    id: int
    name: str = ""
    transliteration: str = ""
    verses: list[SourceVerse]


class ChapterDisplay(BaseModel):
    number: int
    arabic: str
    latin: str
    ayah_count: int


@asynccontextmanager
async def lifetime(app: FastAPI):
    async with httpx.AsyncClient(timeout=30, follow_redirects=True) as client:
        app.state.http = client
        app.state.quran = None
        yield


app = FastAPI(title="Recitation Tracker", lifespan=lifetime)


@app.middleware("http")
async def headers(request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["Permissions-Policy"] = "microphone=(self)"
    if request.url.path == "/api/config":
        response.headers["Cache-Control"] = "no-store"
    return response


@app.get("/api/health", response_model=Health)
def health():
    return Health()


@app.get("/api/config", response_model=Configuration)
def configuration():
    # Origin-restricted browser key, NOT a server secret. Never put admin keys here.
    value = os.getenv("QURANLAB_WEB_KEY", "").strip()
    key = value if WEB_KEY.fullmatch(value) else None
    packaged_evaluation = all((FRONTEND_BUILD / asset).is_file() for asset in EVALUATION_FILES)
    return Configuration(web_key=key, evaluation_available=bool(key and packaged_evaluation))


async def download(url: str) -> bytes:
    try:
        result = await app.state.http.get(url)
        result.raise_for_status()
        return result.content
    except httpx.HTTPError as error:
        raise HTTPException(502, "Quran data provider unavailable; retry.") from error


@app.get("/api/quran/atlas", response_class=Response)
async def atlas():
    return Response(await download("https://cdn.quran.ws/qvp/v0.5.0/atlas.qva"),
                    media_type="application/octet-stream",
                    headers={"Cache-Control": "public, max-age=86400"})


@app.get("/api/quran/pages/{page}", response_class=Response)
async def page_asset(page: int):
    if not 1 <= page <= 604:
        raise HTTPException(422, "Page must be between 1 and 604")
    return Response(await download(f"https://cdn.quran.ws/qvp/v0.5.0/{page:03}.qvp"),
                    media_type="application/octet-stream",
                    headers={"Cache-Control": "public, max-age=86400"})


def arabic_key(value: str) -> str:
    import unicodedata
    return "".join(c for c in unicodedata.normalize("NFD", value)
                   if not unicodedata.combining(c)).translate(str.maketrans("ٱأإآى", "ااااي"))


async def text_chapters():
    if app.state.quran is None:
        data = await download("https://cdn.jsdelivr.net/npm/quran-json@3.1.2/dist/quran.json")
        try:
            chapters = TypeAdapter(list[SourceChapter]).validate_json(data)
            app.state.quran = [chapter.model_dump() for chapter in chapters]
        except ValidationError as error:
            raise HTTPException(502, "Quran text provider returned invalid data") from error
    return app.state.quran


@app.get("/api/chapters", response_model=list[ChapterDisplay])
async def chapter_metadata():
    return [ChapterDisplay(number=chapter["id"], arabic=chapter.get("name", ""),
                           latin=chapter.get("transliteration", ""),
                           ayah_count=len(chapter["verses"]))
            for chapter in await text_chapters()]


@app.get("/api/search", response_model=list[VerseHit])
async def search(response: Response, q: str = Query(min_length=2, max_length=150),
                 limit: int = 30):
    # Two published page sizes: the first screen and the explicit full-result expansion.
    if limit not in (30, 400):
        raise HTTPException(422, "limit must be 30 or 400")
    chapters = await text_chapters()
    key = arabic_key(q)
    hits = []
    for surah in chapters:
        for verse in surah["verses"]:
            if key in arabic_key(verse["text"]):
                hits.append(VerseHit(surah=surah["id"], ayah=verse["id"], text=verse["text"]))
    response.headers["X-Total-Count"] = str(len(hits))
    return hits[:limit]


if FRONTEND_BUILD.is_dir():
    app.mount("/", StaticFiles(directory=FRONTEND_BUILD, html=True), name="frontend")
