### CTBE Backend

An Express 5 + Bun TypeScript API with MongoDB, Redis, WebSockets, media streaming (FFmpeg), and weather utilities.

## Prerequisites
- **Bun** v1.2.6+ installed (`curl -fsSL https://bun.sh/install | bash`)
- **Docker** and **Docker Compose** for MongoDB and Redis
- **FFmpeg** available on PATH (`ffmpeg -version`)
- Optional: `mongosh` and `redis-cli` for local debugging

## Quick Start
1) Install dependencies
```bash
bun install
```

2) Start MongoDB and Redis
```bash
docker compose up -d
```

3) Create a .env file in project root
```bash
cat > .env <<'EOF'
PORT=5000
MONGO_URI=mongodb://localhost:27017/ctbe
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT settings (set your own strong secrets in production)
JWT_SECRET=change-me-access
JWT_REFRESH_SECRET=change-me-refresh
# Expirations are in milliseconds
JWT_EXPIRES_IN=900000
JWT_REFRESH_EXPIRES_IN=604800000

# Optional: for the weather script only (if you want to fetch fresh data)
# WEATHER_API_KEY=your_weatherapi_com_key

NODE_ENV=development
EOF
```

4) Run the server (choose one)
- Dev (watch):
```bash
bun run --watch src/index.ts
```
- Prod-like:
```bash
bun run src/index.ts
```

The HTTP API listens on `PORT` (default 5000). A WebSocket server also starts on port `8081`.

## Verify Setup
- Healthcheck:
```bash
curl -s http://localhost:5000/test/health
```
Expected: `{ "success": true, "message": "OK" }`

- Not found test:
```bash
curl -i http://localhost:5000/does-not-exist
```
Expected: HTTP 404 JSON error.

## Environment Variables
- **PORT**: HTTP port for Express (default `5000`).
- **MONGO_URI**: Mongo connection string. Required; app exits if missing.
- **REDIS_HOST / REDIS_PORT**: Redis connection (defaults `localhost:6379`).
- **JWT_SECRET / JWT_REFRESH_SECRET**: Secrets to sign access/refresh tokens. Defaults exist but must be overridden in production.
- **JWT_EXPIRES_IN / JWT_REFRESH_EXPIRES_IN**: Expiry durations in ms (default 15m and 7d).
- **NODE_ENV**: If `production`, secure cookies are set for refresh tokens.
- **WEATHER_API_KEY**: Only used by the weather generator script below.

## Scripts
- Generate weather forecast JSON (skips if file exists at `media/weather/weather-forecast.json`):
```bash
WEATHER_API_KEY=your_key bun run src/scripts/generate-weather-forecast.ts
```

## Running with Docker Services
This repo provides only MongoDB and Redis via Compose. The API itself runs with Bun locally.
```bash
docker compose up -d
```
Volumes persist data between restarts.

## CORS
Allowed origins are configured in `src/index.ts` and include:
- http://localhost:3000
- http://localhost:3001
- http://192.168.1.51:3000
- https://app.deadsec.ai

Adjust `corsOptions.origin` as needed for your frontend.

## Authentication Overview
- Register: `POST /auth/register` with JSON `{ name, email, password }` (plus optional device info fields).
- Login: `POST /auth/login` with `{ email, password }`. Response includes `accessToken`; a `refreshToken` is set as an HttpOnly cookie.
- Auth header: Send `Authorization: Bearer <accessToken>` on protected routes.
- Refresh access token: `GET /auth/refresh-token` (uses refresh cookie) → returns new `accessToken`.
- Logout: `GET /auth/logout` (requires auth) → clears refresh cookie and ends session.

Example login and authenticated request:
```bash
curl -s -X POST http://localhost:5000/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"test@example.com","password":"password"}'

# then use the accessToken from the response
curl -s http://localhost:5000/auth/me -H "Authorization: Bearer <ACCESS_TOKEN>"
```

## Key Endpoints
- Test
  - `GET /test` simple success message
  - `GET /test/error` sample error
  - `GET /test/health` healthcheck
- Auth (`/auth`)
  - `POST /register`, `POST /login`, `GET /refresh-token`, `GET /logout`, `GET /me`
- Users (`/users`) [protected]
  - `GET /me`, `DELETE /sessions/:sessionId`
  - Admin: `GET /all`, `PUT /admin/reset-password/:id`, `PUT /admin/:id`
  - `GET /:id`, `PUT /:id`
- Weather (`/weather`) [protected]
  - `GET /` current forecast (from local json with interpolation)
  - `POST /temperature-preference` update user preference
- Video (`/video`)
  - `GET /` list RTSP sources
  - `GET /previews` capture preview JPGs → served under `/previews/...`
  - `GET /stream/:streamName` progressive MP4 stream transcoded via FFmpeg
- Audio (`/audio`)
  - `GET /` returns current audio state and timing
  - `GET /play` streams mixed WAV audio (MC+OBC) via FFmpeg
- Admin (`/admin`)
  - `GET /`, `POST /diagnostic`, `GET /system-info`, `GET /health`, `GET /network`, `GET /docs`

Note: Many endpoints under `/users`, `/weather` require a Bearer token. Admin routes in this snapshot do not enforce a role check at the router layer.

## Media and FFmpeg
- FFmpeg is required for both video and audio streaming.
- Video sources are configured in `src/controllers/video.controller.ts` as RTSP URLs. Update them to valid sources.
- Preview images are saved to `public/previews/` and served statically.
- Audio WAV files should exist under `media/audio/`. Filenames follow patterns like `pre_mc.wav`, `pre_obc.wav`, `launch_mc_hs.wav`, etc. The server selects files based on launch timing/state and randomly varies static levels.

## WebSocket Server
- A standalone WebSocket server runs on port `8081`. If your frontend uses WebSockets, point it to `ws://<host>:8081`.

## Static Files
`public/` is served at the root (e.g., `/previews/<file>.jpg`).

## Troubleshooting
- Mongo connection error at startup: ensure `MONGO_URI` is set and `docker compose up -d` was run.
- Redis errors: confirm Redis is up at `REDIS_HOST:REDIS_PORT`.
- FFmpeg not found: install FFmpeg and make sure it's on PATH.
- 401 Unauthorized: include `Authorization: Bearer <accessToken>`.
- 403 CORS: add your frontend origin in `corsOptions.origin`.
- Video stream fails: verify RTSP URLs and network access from server to the cameras.

## Notes
- This project was created using `bun init` (Bun v1.2.6).
- Consider setting strong JWT secrets and using HTTPS in production.
