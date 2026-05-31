# Deploying TripWe

Frontend on **Cloudflare Pages** + backend on a **DigitalOcean Droplet**, with
Cloudflare in front of the Droplet to provide TLS and edge-cache the
expensive `/api/places` endpoint.

```
your-domain.com         → Cloudflare Pages (static site)
api.your-domain.com     → Cloudflare DNS (proxied / orange cloud) → DO Droplet
                            └─ Caddy (TLS) → docker (uvicorn) → SQLite on bind mount
```

You'll need:
- A domain on Cloudflare DNS (free)
- A DigitalOcean account (a $6/mo basic Droplet is fine)
- The repo pushed to GitHub (for Cloudflare Pages to build from)

---

## 1. DNS + domain prep

1. Add your domain to Cloudflare (free plan is enough). Update your registrar
   to point at Cloudflare's nameservers.
2. In the Cloudflare dashboard, **DNS → Records**, add (you'll fill in the
   Droplet IP in step 2):

   | Type | Name | Content | Proxy |
   |---|---|---|---|
   | `A` | `api` | _your droplet IP_ | 🟠 Proxied |
   | `CNAME` | `@` (or `www`) | _set automatically by Pages in step 3_ | 🟠 Proxied |

---

## 2. Droplet

### 2a. Create

DigitalOcean → Create → Droplet:
- Ubuntu 24.04 LTS
- Basic / Regular SSD / **$6/mo** (1 GB RAM, 25 GB disk — plenty)
- Region close to your users
- Add your SSH key
- Enable backups if you care about data (cheap insurance for the SQLite file)

After it's up, copy its public IP into the Cloudflare `A` record above.

### 2b. Provision

The backend runs in a container; Caddy stays on the host as the
TLS-terminating reverse proxy. SSH in as root, then:

```bash
# System packages
apt update && apt -y upgrade
apt -y install git curl debian-keyring debian-archive-keyring apt-transport-https

# Docker Engine + Compose plugin (official one-liner)
curl -fsSL https://get.docker.com | sh

# Caddy (auto-TLS reverse proxy — on the HOST, not in a container)
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' \
  | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' \
  | tee /etc/apt/sources.list.d/caddy-stable.list
apt update && apt -y install caddy

# App code
git clone https://github.com/YOUR_GITHUB/YOUR_REPO.git /opt/tripwe
cd /opt/tripwe

# Edit compose.yml — set TRIPWE_ALLOWED_ORIGINS to your real frontend
# domain(s). Comma-separated, no trailing slashes, no spaces. Example:
#   TRIPWE_ALLOWED_ORIGINS: "https://your-domain.com,https://www.your-domain.com"
$EDITOR compose.yml

# Build + start
docker compose up -d --build
docker compose ps                 # should show "running"
docker compose logs -f backend    # tail logs (Ctrl-C to detach)
```

The compose file binds the container's port 8000 only to `127.0.0.1`, so
the container is reachable from Caddy on the same host but not from the
public internet. The SQLite DB lives in `/opt/tripwe/data/tripwe.db` via
a bind mount, so `docker compose down`, image rebuilds, and container
replacement never wipe data.

### 2c. Caddy

Edit `/etc/caddy/Caddyfile`:

```
api.your-domain.com {
    encode zstd gzip
    reverse_proxy 127.0.0.1:8000
}
```

Then:

```bash
systemctl reload caddy
```

Caddy will get a free Let's Encrypt cert for `api.your-domain.com`
automatically (Cloudflare's proxy passes Let's Encrypt HTTP-01 challenges
through by default).

Smoke-test from your laptop:

```bash
curl -s https://api.your-domain.com/api/health
# {"ok":true}
```

### 2d. Firewall (optional but recommended)

```bash
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable
```

For extra hardening, restrict 80/443 to **Cloudflare IPs only** so the
Droplet can only be reached through Cloudflare — see
<https://www.cloudflare.com/ips/>.

---

## 3. Cloudflare Pages (frontend)

Cloudflare dashboard → Workers & Pages → Create → Pages → Connect to Git.

- Repository: your GitHub repo
- Production branch: `main`
- Framework preset: **None**
- Build command: `npm install && npm run build`
- Build output directory: `dist`
- Root directory: `site`
- Environment variables (Production):

  | Key | Value |
  |---|---|
  | `VITE_API_URL` | `https://api.your-domain.com` |

After the first deploy, attach your custom domain (Pages → Custom domains →
add `your-domain.com`). Cloudflare will create the DNS record automatically.

---

## 4. The Cache Rule (the "edge caching thing")

Cloudflare's free plan can cache the heavy `/api/places` endpoint at the edge.
That endpoint is purely a function of `(lat, lon, category)` and is the same
for every user — so a single edge cache hit serves the entire group.

Dashboard → your domain → **Caching → Cache Rules → Create rule**:

- **Rule name:** `Cache TripWe public places`
- **If:** `URI Path` `wildcard matches` `/api/places*` **AND**
          `Hostname` `equals` `api.your-domain.com`
- **Then:**
  - Cache eligibility: **Eligible for cache**
  - Edge TTL: **Use cache-control header if present, bypass cache if not present**
  - Browser TTL: **Respect existing headers**

The backend sets `Cache-Control: public, max-age=1800, s-maxage=1800,
stale-while-revalidate=600` on that endpoint, so Cloudflare caches it for
30 minutes per `(lat, lon, category)` URL. Everything else is sent with
`Cache-Control: no-store`, so user-specific data is never edge-cached.

You can verify hits in the response headers — look for `cf-cache-status: HIT`.

---

## 5. Updates

To deploy backend changes:

```bash
ssh root@your-droplet
cd /opt/tripwe
git pull
docker compose up -d --build
```

`docker compose up -d --build` rebuilds the image and replaces the running
container in one shot — the bind-mounted SQLite DB is untouched. Rollback is `git checkout <previous-commit> && docker compose up -d --build`.

The frontend redeploys automatically on every `git push` to `main`
(Cloudflare Pages watches the repo).

---

## 6. Backups

The whole DB is a single SQLite file at `/opt/tripwe/data/tripwe.db`.

The container ships with sqlite3, so cron on the host can snapshot through
`docker exec`. Add to root's crontab (`crontab -e`):

```cron
# Nightly DB snapshot, rotate weekly (7 files, one per weekday)
0 3 * * * docker exec tripwe-backend python -c "import sqlite3,sys; sqlite3.connect('/data/tripwe.db').backup(sqlite3.connect('/data/backup-' + sys.argv[1] + '.db'))" $(date +\%u)
```

(Using Python's built-in `.backup()` avoids needing a sqlite3 CLI install.)

DigitalOcean's weekly Droplet backups ($1.20/mo on a $6 Droplet) cover the
whole disk; combined with the daily SQLite snapshots above, you've got
reasonable recovery options.

---

## 7. Costs

| | |
|---|---|
| Domain | ~$10/yr |
| DO Droplet | $6/mo |
| DO backups (optional) | $1.20/mo |
| Cloudflare Pages | $0 |
| Cloudflare DNS + caching | $0 |
| **Total** | **~$7–8/mo** |

---

## Troubleshooting

- **`502 Bad Gateway` from `api.your-domain.com`**: backend is down. Check
  `docker compose ps` and `docker compose logs backend` from
  `/opt/tripwe`.
- **CORS errors in browser console**: `TRIPWE_ALLOWED_ORIGINS` in
  `/opt/tripwe/compose.yml` doesn't match the frontend origin exactly
  (watch for trailing slashes and `http` vs `https`). Edit it and
  `docker compose up -d` (which recreates the container with the new env;
  `docker compose restart` does NOT pick up changes).
- **`cf-cache-status: BYPASS` on `/api/places*`**: Cache Rule isn't
  matching. Double-check the URI Path pattern and that `Hostname` matches
  exactly. Also check the response carries `Cache-Control: public, …` —
  Cloudflare won't cache without it.
- **Wikipedia images intermittently missing**: the resolver has a 5-second
  per-place timeout. `docker compose restart backend` to invalidate the
  in-process cache if you want to re-attempt.
- **`Permission denied` on `./data/tripwe.db`**: on SELinux hosts
  (uncommon on Ubuntu, but happens), the bind mount needs the `:Z` flag.
  Edit `compose.yml`: change `./data:/data` to `./data:/data:Z`.
