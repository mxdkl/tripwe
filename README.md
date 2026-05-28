# TripWe

Collaborative group travel, simplified. Tinder-style swiping on real places —
when everyone in your group likes the same place, it's a match.

No accounts. You join a group with a 6-character code or create your own.

## Project layout

```
backend/   FastAPI + SQLite. Talks to OpenStreetMap (Nominatim + Overpass).
site/      Vite + React + TypeScript + Tailwind. Cookie-based session.
```

## Run it

Two terminals.

### Backend
```
cd backend
uv sync
uv run python -m uvicorn main:app --reload
```
Serves on `http://127.0.0.1:8000`. A SQLite file `tripwe.db` is created next to
`main.py` on first run.

### Frontend
```
cd site
npm install
npm run dev
```
Serves on `http://localhost:5173`. Vite proxies `/api/*` to the backend, so
open the site URL and you're done.

## Flow

1. **Welcome** — enter a display name. Stored as a cookie + localStorage; no
   account.
2. **Create or Join** — create a group (you get a 6-char invite code) or paste
   a code to join.
3. **Setup wizard** (new groups only)
   - "Yes, I have a city" → type a destination + optional dates.
   - "Still deciding" → pick a country, then a city (or use the country itself
     as a search area).
4. **Swipe deck** — like/pass on real POIs (sights, food, museums) pulled live
   from Overpass for your destination.
5. **Matches** — places liked by every group member show up in the sidebar.

## Deploying

See [DEPLOY.md](./DEPLOY.md) — Cloudflare Pages for the frontend, a $6/mo
DigitalOcean Droplet for the backend, with Cloudflare edge-caching the
`/api/places` endpoint.

## Tech notes

- Group code: 6 chars from a confusion-resistant alphabet
  (`ABCDEFGHJKLMNPQRSTUVWXYZ23456789`).
- "Session" = `tripwe_uid` cookie. The backend trusts it (or an
  `x-tripwe-uid` header). MVP-grade; not auth.
- Place search: Nominatim geocodes the destination, then Overpass returns up
  to 40 named POIs in a bbox around it. 30-min in-process cache per
  `(category, lat, lon)` to be polite.
- "Match" = a place liked by every current group member. Adding a new member
  retroactively un-matches places they haven't liked yet.
