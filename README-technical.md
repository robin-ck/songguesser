# Song Guesser — Technical Reference

## Architecture

Single Docker container. Node.js (ESM) backend serves both the REST/WebSocket API and the Vite-built React frontend as static files.

```
Browser ──HTTPS──► Caddy (reverse-proxy) ──HTTP──► songguesser:3000 (Node)
                                                        ├── /api/spotify/*   Spotify search
                                                        ├── /api/youtube/*   YouTube video ID lookup
                                                        ├── /socket.io       Socket.io (WebSocket)
                                                        └── /*               React SPA (static)
```

## Stack

| Layer | Technology |
|---|---|
| Backend | Node.js 20 (ESM), Express 4, Socket.io 4 |
| Frontend | React 18, Vite 5, react-router-dom 6, socket.io-client |
| Music search | Spotify Web API (Client Credentials) |
| Music playback | YouTube IFrame API (host browser only) |
| YT video lookup | `youtube-search-api` npm package + `yt-dlp` binary fallback |
| Container | Docker, multi-stage build |
| Reverse proxy | Caddy (on `web-services` Docker network) |

## Directory Structure

```
/root/songguesser/
├── docker-compose.yml
├── .env                          # SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET
├── backend/
│   ├── Dockerfile                # Multi-stage: Vite build → Node runtime
│   ├── package.json              # type: module
│   ├── server.js                 # Express + Socket.io entry point
│   ├── routes/
│   │   ├── spotify.js            # GET /api/spotify/search?q=
│   │   └── youtube.js            # GET /api/youtube/search?q=
│   └── game/
│       ├── roomManager.js        # In-memory room state + scoring
│       └── socketHandlers.js     # All Socket.io event handlers
└── frontend/
    ├── vite.config.js            # Dev proxy: /api, /socket.io → :3000
    └── src/
        ├── App.jsx               # Phase-based routing
        ├── socket.js             # socket.io-client singleton
        ├── pages/
        │   ├── Home.jsx          # Create/Join room
        │   ├── Lobby.jsx         # Waiting room
        │   ├── Submission.jsx    # Spotify search + song picker
        │   ├── Game.jsx          # Playback + guessing + round results
        │   └── Results.jsx       # Final scoreboard
        └── components/
            ├── YoutubePlayer.jsx # YT IFrame API wrapper (host only)
            ├── SongCard.jsx
            ├── Scoreboard.jsx
            └── PlayerList.jsx
```

## Game Phases

```
lobby → submission → playing → ended
```

Rooms are entirely in-memory. They vanish when all players disconnect.

## Socket.io Events

### Client → Server

| Event | Payload | Description |
|---|---|---|
| `create_room` | `{ username, settings: { songsPerPlayer, speedBonus } }` | Create room, become host |
| `join_room` | `{ code, username }` | Join existing room |
| `start_submission` | — | Host moves lobby → submission |
| `submit_songs` | `{ songs[] }` | Player submits their song list |
| `start_game` | — | Host starts game (requires all submitted) |
| `submit_guess` | `{ guessedPlayerId }` | Player guesses who submitted current song |
| `next_song` | — | Host reveals round results + triggers scoring |
| `advance_song` | — | Host (auto, after 6s) moves to next song |

### Server → Client

| Event | Payload | Description |
|---|---|---|
| `room_created` | `{ code }` | Sent to creator only |
| `room_joined` | `{ code }` | Sent to joiner only |
| `room_update` | full room state | Broadcast on any player/phase change |
| `all_submitted` | — | Broadcast when every player submitted |
| `game_started` | — | Broadcast when game begins |
| `song_changed` | `{ song, playerOptions, songIndex, totalSongs }` | Broadcast per song |
| `guess_locked` | `{ guessedPlayerId }` | Sent to guesser only |
| `round_result` | `{ submittedBy, guesses[], scores[] }` | Broadcast on host reveal |
| `game_ended` | `{ finalScores[] }` | Broadcast when all songs played |

## Scoring

- Speed bonus **OFF**: correct guess = 500 points
- Speed bonus **ON**: `max(100, round(1000 - secondsElapsed * 100))` points

## YouTube Playback

1. Backend `/api/youtube/search?q=` tries `youtube-search-api` (no API key — scrapes YT)
2. Falls back to `yt-dlp --get-id ytsearch1:query` binary
3. Frontend host loads the video via YouTube IFrame API with `autoplay: 1`
4. Fallback: if no video found and track has a Spotify preview URL, plays 30s `<audio>` clip

## Spotify Token Caching

`backend/routes/spotify.js` caches the Client Credentials token in memory with a 60-second early-expiry buffer. Tokens last ~1 hour; refreshed automatically on next request.

## Local Development

```bash
# Terminal 1: Backend
cd backend && npm install && node server.js

# Terminal 2: Frontend (Vite dev server with proxy)
cd frontend && npm install && npm run dev
# Opens at http://localhost:5173
```
