# Deploying TripWe

Frontend on **Cloudflare Pages** + backend on a **DigitalOcean Droplet**, with
Cloudflare in front of the Droplet to provide TLS and edge-cache the
expensive `/api/places` endpoint.

```
your-domain.com         → Cloudflare Pages (static site)
api.your-domain.com     → Cloudflare DNS (proxied / orange cloud) → DO Droplet
                            └─ Caddy (TLS) → uvicorn → SQLite (on disk)
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

SSH in as root, then:

```bash
# System packages
apt update && apt -y upgrade
apt -y install git curl debian-keyring debian-archive-keyring apt-transport-https

# Caddy (auto-TLS reverse proxy)
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' \
  | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' \
  | tee /etc/apt/sources.list.d/caddy-stable.list
apt update && apt -y install caddy

# uv (Python package manager)
curl -LsSf https://astral.sh/uv/install.sh | sh
mv ~/.local/bin/uv /usr/local/bin/uv

# App user + dirs
useradd -m -s /bin/bash tripwe
mkdir -p /var/lib/tripwe
chown tripwe:tripwe /var/lib/tripwe

# App code
sudo -u tripwe -H bash -lc '
  cd ~
  git clone https://github.com/YOUR_GITHUB/YOUR_REPO.git app
  cd app/backend
  uv sync
'
```

### 2c. systemd service

Create `/etc/systemd/system/tripwe.service`:

```ini
[Unit]
Description=TripWe FastAPI backend
After=network.target

[Service]
Type=simple
User=tripwe
WorkingDirectory=/home/tripwe/app/backend
Environment=TRIPWE_DB=/var/lib/tripwe/tripwe.db
# Comma-separated list of frontend origins (no trailing slash)
Environment=TRIPWE_ALLOWED_ORIGINS=https://your-domain.com,https://www.your-domain.com
ExecStart=/usr/local/bin/uv run python -m uvicorn main:app --host 127.0.0.1 --port 8000
Restart=on-failure
RestartSec=3

[Install]
WantedBy=multi-user.target
```

Then:

```bash
systemctl daemon-reload
systemctl enable --now tripwe
systemctl status tripwe   # should be "active (running)"
journalctl -u tripwe -f   # tail logs
```

### 2d. Caddy

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
automatically (DNS-01 is not needed since you've already pointed the `A`
record at the Droplet; Cloudflare's proxy will pass through Let's Encrypt
HTTP-01 challenges by default).

Smoke-test from your laptop:

```bash
curl -s https://api.your-domain.com/api/health
# {"ok":true}
```

### 2e. Firewall (optional but recommended)

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
sudo -u tripwe -H bash -lc 'cd ~/app && git pull && cd backend && uv sync'
systemctl restart tripwe
```

The frontend redeploys automatically on every `git push` to `main`.

---

## 6. Backups

The whole DB is a single SQLite file at `/var/lib/tripwe/tripwe.db`.

Easy backup with cron — add to root's crontab (`crontab -e`):

```cron
# Nightly DB snapshot, keep 7 days
0 3 * * * sqlite3 /var/lib/tripwe/tripwe.db ".backup '/var/lib/tripwe/backup-$(date +\%u).db'"
```

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

- **`502 Bad Gateway` from `api.your-domain.com`**: backend is down.
  Check `systemctl status tripwe` and `journalctl -u tripwe`.
- **CORS errors in browser console**: `TRIPWE_ALLOWED_ORIGINS` doesn't
  include the frontend origin. Update the systemd unit and
  `systemctl restart tripwe`.
- **`cf-cache-status: BYPASS` on `/api/places*`**: Cache Rule isn't
  matching. Double-check the URI Path pattern and that `Hostname` matches
  exactly. Also check the response carries `Cache-Control: public, …` —
  Cloudflare won't cache without it.
- **Wikipedia images intermittently missing**: the resolver has a 5-second
  per-place timeout. Restart the backend to invalidate the in-process cache
  if you want to re-attempt.
