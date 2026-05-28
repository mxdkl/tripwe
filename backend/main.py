"""TripWe backend — FastAPI + SQLite.

Auth-less: clients identify with a `user_id` cookie they get from POST /api/users.
Groups are addressable by a 6-char join code.
Voting is per-(group, user, place); a "match" is a place every member liked.
Places are fetched from OpenStreetMap's Nominatim (geocoding) and Overpass
(POI search), cached briefly in-process.
"""

from __future__ import annotations

import os
import random
import secrets
import sqlite3
import string
import time
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Iterable

import httpx
from fastapi import FastAPI, HTTPException, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

DB_PATH = Path(os.environ.get("TRIPWE_DB", Path(__file__).parent / "tripwe.db"))

# Selectors must include `["name"]`. Wherever possible we also require
# `["wikipedia"]` to filter out low-tier POIs (zoo exhibits, plant labels,
# random monuments) — these are the places that consistently have real
# photos via Wikipedia or Wikimedia Commons.
CATEGORY_FILTERS: dict[str, list[str]] = {
    "Sights": [
        'node["tourism"="attraction"]["name"]["wikipedia"]',
        'way["tourism"="attraction"]["name"]["wikipedia"]',
        'node["historic"~"monument|memorial|castle|ruins|tower"]["name"]["wikipedia"]',
        'way["historic"~"monument|memorial|castle|ruins|tower"]["name"]["wikipedia"]',
        'node["tourism"="viewpoint"]["name"]',
    ],
    "Museums": [
        'node["tourism"="museum"]["name"]',
        'way["tourism"="museum"]["name"]',
    ],
    "Food": [
        'node["amenity"="restaurant"]["name"]',
        'node["amenity"="cafe"]["name"]',
    ],
    "All": [
        'node["tourism"="attraction"]["name"]["wikipedia"]',
        'way["tourism"="attraction"]["name"]["wikipedia"]',
        'node["tourism"="museum"]["name"]',
        'way["tourism"="museum"]["name"]',
        'node["historic"~"monument|memorial|castle"]["name"]["wikipedia"]',
        'node["amenity"~"restaurant|cafe"]["name"]',
    ],
}

OVERPASS_ENDPOINTS = [
    "https://overpass-api.de/api/interpreter",
    "https://lz4.overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
]

NOMINATIM = "https://nominatim.openstreetmap.org/search"

USER_AGENT = "TripWe/0.1 (collaborative-trip-planner)"

# In-process caches (don't survive restart, which is fine for an MVP)
_geocode_cache: dict[str, dict] = {}
_places_cache: dict[tuple[str, str], tuple[float, list[dict]]] = {}
PLACES_TTL_SECONDS = 60 * 30  # 30 min


# --- DB --------------------------------------------------------------------


def _connect() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    return conn


def init_db() -> None:
    with _connect() as conn:
        conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                created_at REAL NOT NULL
            );

            CREATE TABLE IF NOT EXISTS groups (
                code TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                destination TEXT,
                country TEXT,
                lat REAL,
                lon REAL,
                start_date TEXT,
                end_date TEXT,
                setup_done INTEGER NOT NULL DEFAULT 0,
                created_at REAL NOT NULL,
                created_by TEXT NOT NULL,
                FOREIGN KEY (created_by) REFERENCES users(id)
            );

            CREATE TABLE IF NOT EXISTS memberships (
                group_code TEXT NOT NULL,
                user_id TEXT NOT NULL,
                joined_at REAL NOT NULL,
                PRIMARY KEY (group_code, user_id),
                FOREIGN KEY (group_code) REFERENCES groups(code) ON DELETE CASCADE,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS votes (
                group_code TEXT NOT NULL,
                user_id TEXT NOT NULL,
                place_id TEXT NOT NULL,
                liked INTEGER NOT NULL,
                place_json TEXT NOT NULL,
                created_at REAL NOT NULL,
                PRIMARY KEY (group_code, user_id, place_id),
                FOREIGN KEY (group_code) REFERENCES groups(code) ON DELETE CASCADE,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS itineraries (
                group_code TEXT PRIMARY KEY,
                days_json TEXT NOT NULL,
                generated_at REAL NOT NULL,
                generated_by TEXT NOT NULL,
                FOREIGN KEY (group_code) REFERENCES groups(code) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS availability (
                group_code TEXT NOT NULL,
                user_id TEXT NOT NULL,
                start_date TEXT NOT NULL,
                end_date TEXT NOT NULL,
                updated_at REAL NOT NULL,
                PRIMARY KEY (group_code, user_id),
                FOREIGN KEY (group_code) REFERENCES groups(code) ON DELETE CASCADE,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            );
            """
        )


# --- Schemas ---------------------------------------------------------------


class UserCreate(BaseModel):
    name: str = Field(min_length=1, max_length=40)


class UserOut(BaseModel):
    id: str
    name: str


class GroupCreate(BaseModel):
    name: str = Field(min_length=1, max_length=60)


class GroupSetup(BaseModel):
    destination: str | None = None
    country: str | None = None
    start_date: str | None = None
    end_date: str | None = None
    mark_done: bool = False


class GroupOut(BaseModel):
    code: str
    name: str
    destination: str | None
    country: str | None
    lat: float | None
    lon: float | None
    start_date: str | None
    end_date: str | None
    setup_done: bool
    created_by: str
    members: list[UserOut]


class VoteIn(BaseModel):
    place_id: str
    liked: bool
    place: dict  # the full place payload, so we can show matches without re-fetching


class AvailabilityIn(BaseModel):
    start_date: str  # ISO yyyy-mm-dd
    end_date: str


class MemberAvailability(BaseModel):
    user_id: str
    name: str
    start_date: str
    end_date: str
    is_default: bool  # true if member hasn't set their own (using group dates)


# --- Helpers ---------------------------------------------------------------


def _new_user_id() -> str:
    return "u_" + secrets.token_urlsafe(9)


def _new_group_code() -> str:
    # Avoid confusable chars
    alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
    return "".join(secrets.choice(alphabet) for _ in range(6))


def _get_user(request: Request) -> sqlite3.Row:
    user_id = request.cookies.get("tripwe_uid") or request.headers.get("x-tripwe-uid")
    if not user_id:
        raise HTTPException(status_code=401, detail="No user session. Create a user first.")
    with _connect() as conn:
        row = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
    if not row:
        raise HTTPException(status_code=401, detail="Unknown user.")
    return row


def _group_or_404(code: str) -> sqlite3.Row:
    with _connect() as conn:
        row = conn.execute("SELECT * FROM groups WHERE code = ?", (code.upper(),)).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Group not found.")
    return row


def _require_membership(code: str, user_id: str) -> None:
    with _connect() as conn:
        row = conn.execute(
            "SELECT 1 FROM memberships WHERE group_code = ? AND user_id = ?",
            (code.upper(), user_id),
        ).fetchone()
    if not row:
        raise HTTPException(status_code=403, detail="You are not a member of this group.")


def _group_members(code: str) -> list[UserOut]:
    with _connect() as conn:
        rows = conn.execute(
            """
            SELECT u.id, u.name FROM users u
            JOIN memberships m ON m.user_id = u.id
            WHERE m.group_code = ?
            ORDER BY m.joined_at ASC
            """,
            (code.upper(),),
        ).fetchall()
    return [UserOut(id=r["id"], name=r["name"]) for r in rows]


def _row_to_group(row: sqlite3.Row) -> GroupOut:
    return GroupOut(
        code=row["code"],
        name=row["name"],
        destination=row["destination"],
        country=row["country"],
        lat=row["lat"],
        lon=row["lon"],
        start_date=row["start_date"],
        end_date=row["end_date"],
        setup_done=bool(row["setup_done"]),
        created_by=row["created_by"],
        members=_group_members(row["code"]),
    )


# --- OSM ------------------------------------------------------------------


async def geocode(query: str) -> dict | None:
    key = query.strip().lower()
    if key in _geocode_cache:
        return _geocode_cache[key]
    headers = {"User-Agent": USER_AGENT, "Accept": "application/json"}
    params = {"q": query, "format": "json", "limit": 1}
    async with httpx.AsyncClient(timeout=20) as client:
        r = await client.get(NOMINATIM, params=params, headers=headers)
    if r.status_code != 200:
        return None
    data = r.json()
    if not data:
        return None
    item = data[0]
    result = {
        "display_name": item.get("display_name"),
        "lat": float(item["lat"]),
        "lon": float(item["lon"]),
        "bbox": [float(x) for x in item.get("boundingbox", [])] if item.get("boundingbox") else None,
    }
    _geocode_cache[key] = result
    return result


def _build_overpass_query(category: str, lat: float, lon: float, bbox: list[float] | None) -> str:
    selectors = CATEGORY_FILTERS.get(category) or CATEGORY_FILTERS["All"]
    if bbox and len(bbox) == 4:
        # Nominatim bbox is [south, north, west, east]
        south, north, west, east = bbox
        area = f"({south},{west},{north},{east})"
    else:
        delta = 0.04  # ~4.5 km
        area = f"({lat - delta},{lon - delta},{lat + delta},{lon + delta})"
    union = "".join(f"{s}{area};" for s in selectors)
    # `out center` so `way` elements come back with a center lat/lon
    return f"[out:json][timeout:25];({union});out center 60;"


def _category_for_tags(tags: dict) -> str:
    if tags.get("tourism") == "museum":
        return "Museums"
    if tags.get("amenity") in {"restaurant", "cafe"}:
        return "Food"
    return "Sights"


def _commons_url(value: str, width: int = 800) -> str | None:
    """Resolve an OSM `wikimedia_commons` tag to a Special:FilePath URL.

    OSM values that work: `File:Louvre.jpg`, `Foo.jpg`.
    OSM values we reject: `Category:Conciergerie` (a Commons category page,
    not a file).
    """
    v = value.strip()
    if v.lower().startswith("category:"):
        return None
    if v.lower().startswith("file:"):
        v = v[5:]
    v = v.replace(" ", "_")
    if not v or "/" in v or "#" in v:
        return None
    from urllib.parse import quote

    return f"https://commons.wikimedia.org/wiki/Special:FilePath/{quote(v)}?width={width}"


def _split_wikipedia(value: str) -> tuple[str, str] | None:
    """Parse an OSM `wikipedia` tag, e.g. `en:Louvre Museum` -> ('en', 'Louvre Museum')."""
    if not value:
        return None
    if ":" in value:
        lang, title = value.split(":", 1)
        lang = lang.strip().lower()
        title = title.strip()
        if 2 <= len(lang) <= 8 and title:
            return lang, title
    return "en", value.strip()


async def _wikipedia_thumb(client: httpx.AsyncClient, value: str) -> str | None:
    """Fetch the lead-image URL for a Wikipedia article from the REST summary API."""
    parsed = _split_wikipedia(value)
    if not parsed:
        return None
    lang, title = parsed
    from urllib.parse import quote

    url = f"https://{lang}.wikipedia.org/api/rest_v1/page/summary/{quote(title, safe='')}"
    try:
        r = await client.get(url, headers={"User-Agent": USER_AGENT}, timeout=5)
        if r.status_code != 200:
            return None
        data = r.json()
        img = (data.get("originalimage") or {}).get("source") or (data.get("thumbnail") or {}).get("source")
        return img
    except Exception:  # noqa: BLE001
        return None


async def _resolve_image(client: httpx.AsyncClient, place: dict) -> None:
    """Mutate `place['image']` in place. Leave as None if nothing usable found.

    Order: direct `image` tag → `wikimedia_commons` → `wikipedia` summary.
    """
    raw = place.pop("_raw_tags", {})  # set by fetch_places
    img = raw.get("image")
    # Direct image URL only — reject wikipedia article links and other HTML pages
    if (
        img
        and img.startswith(("http://", "https://"))
        and not any(host in img for host in ("wikipedia.org/wiki/", "/wiki/Category:"))
        and img.lower().endswith((".jpg", ".jpeg", ".png", ".webp", ".gif"))
    ):
        place["image"] = img
        return
    commons = raw.get("wikimedia_commons")
    if commons:
        url = _commons_url(commons)
        if url:
            place["image"] = url
            return
    wiki = raw.get("wikipedia")
    if wiki:
        url = await _wikipedia_thumb(client, wiki)
        if url:
            place["image"] = url
            return
    place["image"] = None


async def fetch_places(category: str, lat: float, lon: float, bbox: list[float] | None) -> list[dict]:
    cache_key = (category, f"{lat:.3f},{lon:.3f}")
    cached = _places_cache.get(cache_key)
    if cached and (time.time() - cached[0] < PLACES_TTL_SECONDS):
        return cached[1]

    query = _build_overpass_query(category, lat, lon, bbox)
    last_err: Exception | None = None
    headers = {"User-Agent": USER_AGENT}
    for endpoint in OVERPASS_ENDPOINTS:
        try:
            async with httpx.AsyncClient(timeout=30) as client:
                r = await client.post(endpoint, data={"data": query}, headers=headers)
            if r.status_code in (429, 504):
                continue
            r.raise_for_status()
            data = r.json()
            elements = data.get("elements", [])
            if not elements:
                continue
            results: list[dict] = []
            seen_ids: set[str] = set()
            for i, el in enumerate(elements):
                tags = el.get("tags", {})
                if not tags.get("name"):
                    continue
                # Use type+id so a node and a way with the same numeric id don't collide
                pid = f"{el.get('type','node')[0]}{el.get('id')}"
                if pid in seen_ids:
                    continue
                seen_ids.add(pid)
                # ways carry their center coords under `center`, nodes don't
                center = el.get("center") or {}
                lat_v = el.get("lat", center.get("lat"))
                lon_v = el.get("lon", center.get("lon"))
                cat = _category_for_tags(tags)
                addr_parts = [tags.get("addr:housenumber"), tags.get("addr:street")]
                addr = " ".join(p for p in addr_parts if p).strip()
                results.append(
                    {
                        "id": pid,
                        "title": tags["name"],
                        "category": cat,
                        "description": tags.get("description") or f"A {cat.lower()[:-1] if cat.endswith('s') else cat.lower()} worth exploring.",
                        "location": addr or "Nearby",
                        "lat": lat_v,
                        "lon": lon_v,
                        "image": None,  # resolved below
                        "rating": round(4 + (i % 10) / 10, 1),
                        "price": "Free" if cat == "Sights" else ("$15" if cat == "Museums" else f"${20 + (i % 40)}"),
                        "tags": {k: v for k, v in tags.items() if k in {"cuisine", "opening_hours", "website", "phone"}},
                        "_raw_tags": {k: tags.get(k) for k in ("image", "wikipedia", "wikimedia_commons")},
                    }
                )
            # Stable shuffle so the order isn't tied to Overpass response order
            random.Random(cache_key[1]).shuffle(results)
            results = results[:40]

            # Resolve real images concurrently (with bounded fan-out).
            import asyncio

            sem = asyncio.Semaphore(8)

            async def _bounded(p, client):
                async with sem:
                    await _resolve_image(client, p)

            async with httpx.AsyncClient(timeout=8) as wiki_client:
                await asyncio.gather(*[_bounded(p, wiki_client) for p in results])

            # Cap to 30 final results, preferring those that resolved a real image
            results.sort(key=lambda p: (0 if p["image"] else 1, p["title"]))
            results = results[:30]

            _places_cache[cache_key] = (time.time(), results)
            return results
        except Exception as e:  # noqa: BLE001
            last_err = e
            continue
    # All mirrors failed
    raise HTTPException(status_code=502, detail=f"Could not reach Overpass: {last_err}")


# --- App ------------------------------------------------------------------


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(title="TripWe API", lifespan=lifespan)


def _allowed_origins() -> list[str]:
    """Comma-separated list from TRIPWE_ALLOWED_ORIGINS, plus dev defaults."""
    defaults = ["http://localhost:5173", "http://127.0.0.1:5173"]
    raw = os.environ.get("TRIPWE_ALLOWED_ORIGINS", "")
    extra = [o.strip().rstrip("/") for o in raw.split(",") if o.strip()]
    # de-dupe, preserve order
    out: list[str] = []
    for o in defaults + extra:
        if o not in out:
            out.append(o)
    return out


app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    # Let CF cache vary by these so different origins don't poison each other
    expose_headers=["Cache-Control"],
)


@app.get("/api/health")
def health():
    return {"ok": True}


@app.post("/api/users", response_model=UserOut)
def create_user(payload: UserCreate):
    uid = _new_user_id()
    with _connect() as conn:
        conn.execute(
            "INSERT INTO users (id, name, created_at) VALUES (?, ?, ?)",
            (uid, payload.name.strip(), time.time()),
        )
        conn.commit()
    return UserOut(id=uid, name=payload.name.strip())


@app.get("/api/me", response_model=UserOut)
def me(request: Request):
    row = _get_user(request)
    return UserOut(id=row["id"], name=row["name"])


@app.get("/api/me/groups", response_model=list[GroupOut])
def my_groups(request: Request):
    user = _get_user(request)
    with _connect() as conn:
        rows = conn.execute(
            """
            SELECT g.* FROM groups g
            JOIN memberships m ON m.group_code = g.code
            WHERE m.user_id = ?
            ORDER BY g.created_at DESC
            """,
            (user["id"],),
        ).fetchall()
    return [_row_to_group(r) for r in rows]


@app.post("/api/groups", response_model=GroupOut)
def create_group(payload: GroupCreate, request: Request):
    user = _get_user(request)
    # Try a few times in the (very unlikely) case of code collision.
    with _connect() as conn:
        for _ in range(5):
            code = _new_group_code()
            try:
                conn.execute(
                    """
                    INSERT INTO groups (code, name, created_at, created_by, setup_done)
                    VALUES (?, ?, ?, ?, 0)
                    """,
                    (code, payload.name.strip(), time.time(), user["id"]),
                )
                conn.execute(
                    "INSERT INTO memberships (group_code, user_id, joined_at) VALUES (?, ?, ?)",
                    (code, user["id"], time.time()),
                )
                conn.commit()
                break
            except sqlite3.IntegrityError:
                continue
        else:
            raise HTTPException(status_code=500, detail="Could not allocate group code.")
        row = conn.execute("SELECT * FROM groups WHERE code = ?", (code,)).fetchone()
    return _row_to_group(row)


@app.post("/api/groups/{code}/join", response_model=GroupOut)
def join_group(code: str, request: Request):
    user = _get_user(request)
    row = _group_or_404(code)
    with _connect() as conn:
        conn.execute(
            """
            INSERT OR IGNORE INTO memberships (group_code, user_id, joined_at)
            VALUES (?, ?, ?)
            """,
            (row["code"], user["id"], time.time()),
        )
        conn.commit()
    return _row_to_group(_group_or_404(code))


@app.get("/api/groups/{code}", response_model=GroupOut)
def get_group(code: str, request: Request):
    user = _get_user(request)
    _require_membership(code, user["id"])
    return _row_to_group(_group_or_404(code))


@app.put("/api/groups/{code}/setup", response_model=GroupOut)
async def update_setup(code: str, payload: GroupSetup, request: Request):
    user = _get_user(request)
    _require_membership(code, user["id"])
    row = _group_or_404(code)

    destination = payload.destination if payload.destination is not None else row["destination"]
    country = payload.country if payload.country is not None else row["country"]
    start_date = payload.start_date if payload.start_date is not None else row["start_date"]
    end_date = payload.end_date if payload.end_date is not None else row["end_date"]

    lat = row["lat"]
    lon = row["lon"]
    if destination and destination != row["destination"]:
        geo = await geocode(destination)
        if geo:
            lat = geo["lat"]
            lon = geo["lon"]

    setup_done = 1 if payload.mark_done or row["setup_done"] else 0
    if payload.mark_done and not destination:
        raise HTTPException(status_code=400, detail="Pick a destination before finishing setup.")

    with _connect() as conn:
        conn.execute(
            """
            UPDATE groups
            SET destination = ?, country = ?, lat = ?, lon = ?,
                start_date = ?, end_date = ?, setup_done = ?
            WHERE code = ?
            """,
            (destination, country, lat, lon, start_date, end_date, setup_done, row["code"]),
        )
        conn.commit()
    return _row_to_group(_group_or_404(code))


CACHEABLE_PLACES_HEADERS = {
    # Browsers + Cloudflare both honor s-maxage; max-age covers private caches.
    "Cache-Control": "public, max-age=1800, s-maxage=1800, stale-while-revalidate=600",
}

NOSTORE_HEADERS = {"Cache-Control": "no-store"}


@app.get("/api/places")
async def public_places(lat: float, lon: float, category: str = "All", response: Response = None):  # type: ignore[assignment]
    """Public, auth-less, cacheable list of places near a coordinate.

    No user context — purely a function of (lat, lon, category). Designed so
    Cloudflare can cache the response at the edge for the whole group (and
    indeed for *every* group with the same destination). The frontend overlays
    per-user vote state separately.
    """
    if not (-90 <= lat <= 90) or not (-180 <= lon <= 180):
        raise HTTPException(status_code=400, detail="Invalid coordinates.")
    places = await fetch_places(category, lat, lon, None)
    if response is not None:
        for k, v in CACHEABLE_PLACES_HEADERS.items():
            response.headers[k] = v
    return {"category": category, "places": places}


@app.get("/api/groups/{code}/my-votes")
def my_votes(code: str, request: Request, response: Response):
    """Per-user vote map for this group — small, cheap, never cached."""
    user = _get_user(request)
    _require_membership(code, user["id"])
    row = _group_or_404(code)
    with _connect() as conn:
        rows = conn.execute(
            "SELECT place_id, liked FROM votes WHERE group_code = ? AND user_id = ?",
            (row["code"], user["id"]),
        ).fetchall()
    for k, v in NOSTORE_HEADERS.items():
        response.headers[k] = v
    return {
        "votes": {r["place_id"]: ("like" if r["liked"] else "dislike") for r in rows},
    }


@app.get("/api/groups/{code}/places")
async def group_places(code: str, request: Request, category: str = "All"):
    """Back-compat wrapper. New clients should call `/api/places` + `/api/groups/{code}/my-votes`."""
    user = _get_user(request)
    _require_membership(code, user["id"])
    row = _group_or_404(code)
    if row["lat"] is None or row["lon"] is None:
        raise HTTPException(status_code=400, detail="Group has no destination set.")
    places = await fetch_places(category, row["lat"], row["lon"], None)
    with _connect() as conn:
        seen = {
            r["place_id"]: bool(r["liked"])
            for r in conn.execute(
                "SELECT place_id, liked FROM votes WHERE group_code = ? AND user_id = ?",
                (row["code"], user["id"]),
            )
        }
    for p in places:
        if p["id"] in seen:
            p["my_vote"] = "like" if seen[p["id"]] else "dislike"
    return {"destination": row["destination"], "category": category, "places": places}


@app.post("/api/groups/{code}/votes")
def submit_vote(code: str, payload: VoteIn, request: Request):
    import json

    user = _get_user(request)
    _require_membership(code, user["id"])
    row = _group_or_404(code)
    with _connect() as conn:
        conn.execute(
            """
            INSERT INTO votes (group_code, user_id, place_id, liked, place_json, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
            ON CONFLICT(group_code, user_id, place_id)
            DO UPDATE SET liked = excluded.liked, place_json = excluded.place_json, created_at = excluded.created_at
            """,
            (
                row["code"],
                user["id"],
                payload.place_id,
                1 if payload.liked else 0,
                json.dumps(payload.place),
                time.time(),
            ),
        )
        conn.commit()
    return {"ok": True}


@app.get("/api/groups/{code}/matches")
def matches(code: str, request: Request):
    """A 'match' is a place every group member liked."""
    import json

    user = _get_user(request)
    _require_membership(code, user["id"])
    row = _group_or_404(code)
    members = _group_members(code)
    member_count = len(members)

    with _connect() as conn:
        # places liked by ALL members
        match_rows = conn.execute(
            """
            SELECT place_id, MAX(place_json) AS place_json, COUNT(*) AS likes
            FROM votes
            WHERE group_code = ? AND liked = 1
            GROUP BY place_id
            HAVING COUNT(DISTINCT user_id) = ?
            ORDER BY MAX(created_at) DESC
            """,
            (row["code"], member_count),
        ).fetchall()
        # everyone who has voted, for "voting progress" UX
        progress_rows = conn.execute(
            """
            SELECT u.id, u.name, COUNT(v.place_id) AS votes
            FROM users u
            JOIN memberships m ON m.user_id = u.id
            LEFT JOIN votes v ON v.user_id = u.id AND v.group_code = m.group_code
            WHERE m.group_code = ?
            GROUP BY u.id, u.name
            """,
            (row["code"],),
        ).fetchall()

    return {
        "member_count": member_count,
        "matches": [
            {**json.loads(r["place_json"]), "likes": r["likes"]} for r in match_rows
        ],
        "progress": [
            {"user_id": r["id"], "name": r["name"], "votes": r["votes"]} for r in progress_rows
        ],
    }


# --- Availability ---------------------------------------------------------


def _availability_for(code: str) -> list[MemberAvailability]:
    """One entry per member. If a member hasn't set theirs, default to the group's dates."""
    row = _group_or_404(code)
    members = _group_members(code)
    with _connect() as conn:
        rows = conn.execute(
            "SELECT user_id, start_date, end_date FROM availability WHERE group_code = ?",
            (row["code"],),
        ).fetchall()
    by_user = {r["user_id"]: (r["start_date"], r["end_date"]) for r in rows}
    out: list[MemberAvailability] = []
    for m in members:
        if m.id in by_user:
            s, e = by_user[m.id]
            out.append(MemberAvailability(user_id=m.id, name=m.name, start_date=s, end_date=e, is_default=False))
        else:
            out.append(
                MemberAvailability(
                    user_id=m.id,
                    name=m.name,
                    start_date=row["start_date"] or "",
                    end_date=row["end_date"] or "",
                    is_default=True,
                )
            )
    return out


@app.get("/api/groups/{code}/availability", response_model=list[MemberAvailability])
def get_availability(code: str, request: Request):
    user = _get_user(request)
    _require_membership(code, user["id"])
    return _availability_for(code)


@app.put("/api/groups/{code}/availability", response_model=list[MemberAvailability])
def set_availability(code: str, payload: AvailabilityIn, request: Request):
    user = _get_user(request)
    _require_membership(code, user["id"])
    row = _group_or_404(code)
    # basic validation
    from datetime import date

    try:
        s = date.fromisoformat(payload.start_date)
        e = date.fromisoformat(payload.end_date)
    except ValueError:
        raise HTTPException(status_code=400, detail="Dates must be ISO yyyy-mm-dd.")
    if e < s:
        raise HTTPException(status_code=400, detail="End date is before start date.")
    with _connect() as conn:
        conn.execute(
            """
            INSERT INTO availability (group_code, user_id, start_date, end_date, updated_at)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(group_code, user_id) DO UPDATE
              SET start_date = excluded.start_date,
                  end_date = excluded.end_date,
                  updated_at = excluded.updated_at
            """,
            (row["code"], user["id"], payload.start_date, payload.end_date, time.time()),
        )
        conn.commit()
    return _availability_for(code)


# --- Itinerary ------------------------------------------------------------

# Slot templates per day. Keep "anchor" Sights/Museums short — Food is the
# load-bearing anchor for meal timing.
DAY_SLOTS = [
    {"slot": "morning", "time": "10:00", "kinds": ["Sights", "Museums"]},
    {"slot": "lunch", "time": "13:00", "kinds": ["Food"]},
    {"slot": "afternoon", "time": "15:30", "kinds": ["Sights", "Museums"]},
    {"slot": "dinner", "time": "19:30", "kinds": ["Food"]},
]


def _days_between(start: str | None, end: str | None) -> int:
    if not start or not end:
        return 3
    try:
        from datetime import date

        s = date.fromisoformat(start)
        e = date.fromisoformat(end)
        d = (e - s).days + 1
        return max(1, min(d, 14))
    except Exception:  # noqa: BLE001
        return 3


def _date_for_day(start: str | None, idx: int) -> str | None:
    if not start:
        return None
    try:
        from datetime import date, timedelta

        return (date.fromisoformat(start) + timedelta(days=idx)).isoformat()
    except Exception:  # noqa: BLE001
        return None


def _haversine_km(a: dict, b: dict) -> float:
    import math

    if not all(k in a for k in ("lat", "lon")) or not all(k in b for k in ("lat", "lon")):
        return 0.0
    if a.get("lat") is None or b.get("lat") is None:
        return 0.0
    lat1, lon1, lat2, lon2 = map(math.radians, (a["lat"], a["lon"], b["lat"], b["lon"]))
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    h = math.sin(dlat / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2) ** 2
    return 2 * 6371.0 * math.asin(math.sqrt(h))


def _all_voted_places(group_code: str) -> list[dict]:
    """Every place anyone has voted on, with per-user vote map.

    Returns: [{ place: {...}, likes_by: set[user_id], dislikes_by: set[user_id] }]
    """
    import json

    by_place: dict[str, dict] = {}
    with _connect() as conn:
        rows = conn.execute(
            "SELECT user_id, place_id, liked, place_json FROM votes WHERE group_code = ?",
            (group_code,),
        ).fetchall()
    for r in rows:
        pid = r["place_id"]
        entry = by_place.setdefault(pid, {"place": json.loads(r["place_json"]), "likes_by": set(), "dislikes_by": set()})
        (entry["likes_by"] if r["liked"] else entry["dislikes_by"]).add(r["user_id"])
    return list(by_place.values())


def _members_present_on(day_iso: str | None, availability: list[MemberAvailability]) -> set[str]:
    """Members whose availability range contains the given day (ISO)."""
    if not day_iso:
        return {a.user_id for a in availability}
    from datetime import date

    try:
        d = date.fromisoformat(day_iso)
    except ValueError:
        return {a.user_id for a in availability}
    present: set[str] = set()
    for a in availability:
        if not a.start_date or not a.end_date:
            present.add(a.user_id)
            continue
        try:
            if date.fromisoformat(a.start_date) <= d <= date.fromisoformat(a.end_date):
                present.add(a.user_id)
        except ValueError:
            present.add(a.user_id)
    return present


def _score_for_day(entries: list[dict], present_ids: set[str]) -> list[dict]:
    """Score every candidate place using only votes from members present that day.

    Score = likes_present − dislikes_present. Unanimous-among-present gets +0.5.
    Drops places with zero present-likers.
    """
    scored: list[dict] = []
    n_present = len(present_ids)
    for entry in entries:
        likes_present = len(entry["likes_by"] & present_ids)
        if likes_present == 0:
            continue
        dislikes_present = len(entry["dislikes_by"] & present_ids)
        bonus = 0.5 if n_present > 0 and likes_present == n_present else 0.0
        place = dict(entry["place"])  # shallow copy
        place["likes"] = len(entry["likes_by"])  # total across all members
        place["dislikes"] = len(entry["dislikes_by"])
        place["likes_present"] = likes_present
        place["dislikes_present"] = dislikes_present
        place["score"] = likes_present - dislikes_present + bonus
        scored.append(place)
    scored.sort(key=lambda p: (-p["score"], -p["likes_present"], p["title"]))
    return scored


def _build_itinerary(group_row: sqlite3.Row) -> tuple[list[dict], int]:
    """Compute the day-by-day plan respecting per-member availability.

    For each day:
      - Determine who's present.
      - Re-score candidate places using only present members' votes.
      - Greedy-pick by score, with a mild distance penalty after the first stop.
    Each place is used at most once across all days.

    Returns (days, total_place_count).
    """
    code = group_row["code"]
    n_days = _days_between(group_row["start_date"], group_row["end_date"])
    availability = _availability_for(code)
    members_by_id = {a.user_id: a for a in availability}
    entries = _all_voted_places(code)

    used: set[str] = set()
    days: list[dict] = []
    total_picks = 0

    for d in range(n_days):
        day_iso = _date_for_day(group_row["start_date"], d)
        present_ids = _members_present_on(day_iso, availability)
        present_members = [
            {"user_id": uid, "name": members_by_id[uid].name}
            for uid in present_ids
            if uid in members_by_id
        ]

        scored = _score_for_day(entries, present_ids)
        # Partition by category for fast lookup, preserving order
        by_kind: dict[str, list[dict]] = {"Sights": [], "Food": [], "Museums": []}
        for p in scored:
            by_kind.setdefault(p["category"], []).append(p)

        def pick(slot_kinds: list[str], anchor: dict | None) -> dict | None:
            best: tuple[float, dict] | None = None
            for kind in slot_kinds:
                for p in by_kind.get(kind, []):
                    if p["id"] in used:
                        continue
                    penalty = 0.0
                    if anchor is not None:
                        dist = _haversine_km(anchor, p)
                        penalty = min(dist * 0.15, 2.0)
                    effective = p["score"] - penalty
                    if best is None or effective > best[0]:
                        best = (effective, p)
            if best is None:
                return None
            chosen = best[1]
            used.add(chosen["id"])
            return chosen

        items: list[dict] = []
        anchor: dict | None = None
        for slot in DAY_SLOTS:
            chosen = pick(slot["kinds"], anchor)
            if chosen is None:
                continue
            items.append({"slot": slot["slot"], "time": slot["time"], "place": chosen})
            if anchor is None:
                anchor = chosen

        total_picks += len(items)
        days.append(
            {
                "day_index": d,
                "date": day_iso,
                "present_members": present_members,
                "items": items,
            }
        )

    return days, total_picks


class ItineraryOut(BaseModel):
    days: list[dict]
    generated_at: float
    place_count: int
    member_count: int


@app.get("/api/groups/{code}/itinerary", response_model=ItineraryOut)
def get_itinerary(code: str, request: Request):
    """Always computed fresh from current votes + availability."""
    user = _get_user(request)
    _require_membership(code, user["id"])
    row = _group_or_404(code)
    member_count = len(_group_members(code))
    days, place_count = _build_itinerary(row)
    return ItineraryOut(
        days=days,
        generated_at=time.time(),
        place_count=place_count,
        member_count=member_count,
    )


@app.post("/api/groups/{code}/itinerary/generate", response_model=ItineraryOut)
def generate_itinerary(code: str, request: Request):
    """Compatibility alias — itinerary is always live; this just returns it."""
    return get_itinerary(code, request)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
