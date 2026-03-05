# Song Guesser

A real-time multiplayer game where players submit songs and try to guess who submitted which track.

**Live:** https://songs.patola-mountains.com

## How it works

1. One player creates a room and shares the code
2. Everyone joins and submits songs (searched via Spotify)
3. Each song plays via YouTube — players guess who submitted it
4. Points are awarded for correct guesses (optionally speed-based)
5. Final scoreboard after all songs have played

## Tech

- **Backend:** Node.js, Express, Socket.io
- **Frontend:** React, Vite
- **Music search:** Spotify Web API
- **Playback:** YouTube IFrame API
- **Infra:** Docker, Caddy reverse proxy

## Docs

- [Setup Guide](README-setup.md) — run it yourself
- [Technical Reference](README-technical.md) — architecture, events, scoring
