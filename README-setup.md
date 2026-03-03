# Song Guesser — Setup

## Prerequisites
- Docker + Docker Compose
- Spotify Developer account (free)
- `web-services` Docker network (created by the reverse-proxy stack)

## 1. Get Spotify Credentials

1. Go to [developer.spotify.com/dashboard](https://developer.spotify.com/dashboard)
2. Click **Create App**
3. Fill in any name/description — no redirect URI needed
4. Copy **Client ID** and **Client Secret**

## 2. Configure Environment

```bash
cd /root/songguesser
cp .env.example .env
nano .env
```

Fill in:
```
SPOTIFY_CLIENT_ID=abc123...
SPOTIFY_CLIENT_SECRET=def456...
```

## 3. Build and Start

```bash
cd /root/songguesser
docker compose up --build -d
```

The first build takes ~2-3 minutes (installs npm deps + downloads yt-dlp binary).

## 4. Verify

```bash
docker compose logs -f songguesser
# Should print: SongGuesser running on port 3000
```

Open [songs.patola-mountains.com](https://songs.patola-mountains.com) — the home page should load.

## Stopping / Updating

```bash
# Stop
docker compose down

# Rebuild after code changes
docker compose up --build -d
```
