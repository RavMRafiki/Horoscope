# AstroCommute

Next.js (App Router) app that generates a playful, astrology-themed ranking of transport modes for today’s trip. Users pick available transport options, a zodiac sign, and birth year; the app resolves their approximate location from IP, finds the nearest Polish city, evaluates weather conditions with a server-side transport expert, and returns a tarot-style ranking (Gemini-backed when configured, with a local fallback).

> Results are entertainment based on astrological motifs — not navigation or safety advice.

## Screenshots

| Onboarding — transport                                                             | Onboarding — zodiac                                                                      |
| ---------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| ![Transport step](docs/screenshots/Screenshot%20from%202026-11-13%2001-14-51.png)  | ![Zodiac step](docs/screenshots/Screenshot%20from%202026-11-13%2001-15-05.png)           |
| **Loading**                                                                        | **Results**                                                                              |
| ![Loading overlay](docs/screenshots/Screenshot%20from%202026-11-13%2001-15-23.png) | ![Tarot ranking results](docs/screenshots/Screenshot%20from%202026-11-13%2001-17-23.png) |

> Screenshots are captured from the local dev build; the third step (birth year) is omitted.

## Features

- 3-step onboarding: select transport modes, zodiac sign, and birth year.
- IP-based approximate geolocation (browser ipify hint + server/proxy IP), matched to the nearest Polish city (`polish_cities_coordinates.csv`, Haversine distance).
- Weather via Open-Meteo (current/near-term), cached in SQLite through Prisma.
- Server-side transport expert scores selected modes (0–100) using forecast/conditions (evaluating temperature, precipitation, wind speed, and mode-specific vulnerability profiles) and passes assessments to generation.
- Horoscope generation via Gemini (configurable model with fallbacks) or a mode-specific local fallback when unavailable.
- Tarot-style results view with fixed-layout cards, hover/foil interaction, and adaptive text fitting.
- Fullscreen mystical loading overlay while generating results.
- Client-side result caching (1h TTL, params-keyed) to avoid duplicate API calls for identical inputs in-session.
- `POST /api/horoscope` with Zod validation, payload size limit (4 KB), per-IP rate limiting (3/min, Redis/Upstash when configured, in-memory fallback), and thin route → domain service architecture.
- Standard security headers via `next.config.mjs` (`nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy`, HSTS in production).

## Tech Stack

- **Framework:** Next.js 16 (App Router), React 19, TypeScript
- **Runtime:** Node.js 26+ (LTS) (`.nvmrc`, `.node-version`, `engines.node >=26`)
- **Data:** Prisma + SQLite, Zod validation
- **APIs/services:** Open-Meteo, IP geolocation provider (`IP_GEOLOCATION_URL`, default `https://ipwho.is`), optional Gemini, optional Upstash Redis (rate limiting)
- **UI:** CSS (global + component-scoped files), `react-icons`

## Project Structure

```text
src/
  app/                         # App Router (layout, page, globals, API route)
    api/horoscope/route.ts     # thin HTTP handler (parse/validate/rate-limit/respond)
  components/
    onboarding/                # onboarding form, steps, loading overlay (+ CSS)
    results/                   # result view and tarot cards (+ CSS)
    ui/                        # shared UI (AutoFitText)
  hooks/                       # useHoroscope
  lib/
    api/                       # client API/cache (horoscope-client)
    domain/
      horoscope/               # schema/types/constants/generate/fallback/service
      transport-expert/        # expert scoring engine/types/profiles
    server/                    # prisma, rate-limit, request-body, geolocation, weather, cities
    format.ts                  # formatting and card interaction helpers
    onboarding.ts              # onboarding validation helpers
prisma/                        # schema/migrations (SQLite)
polish_cities_coordinates.csv  # city coordinates dataset
docs/screenshots/              # UI screenshots
```

## Getting Started

### Prerequisites

- Node.js (LTS recommended)
- npm

### Setup

```bash
npm install
cp .env.example .env
npm run db:push
npm run dev
```

Open `http://localhost:3000`.

The browser attempts to read its public IP via ipify and sends it to the API as a hint. In deployed environments the server prefers a public IP from trusted proxy headers.

## Configuration

Create `.env` from `.env.example`:

| Variable                   | Purpose                                                                                                                |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`             | Prisma database URL (defaults to SQLite in `.env.example`).                                                            |
| `IP_GEOLOCATION_URL`       | IP geolocation provider base URL (default `https://ipwho.is`).                                                         |
| `IP_HASH_SALT`             | Long random secret for hashing IPs before storage; set a unique value in production.                                   |
| `GEMINI_API_KEY`           | Enables Gemini-backed horoscope generation. If unset/unavailable, local fallback is used.                              |
| `GEMINI_MODEL`             | Optional model override (default `gemini-3.1-flash-lite`); falls back across supported models on 404/429/503/timeouts. |
| `UPSTASH_REDIS_REST_URL`   | Upstash Redis REST URL for shared rate limiting (optional).                                                            |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis REST token for shared rate limiting (optional).                                                          |

When Upstash Redis vars are unset or Redis is unavailable, rate limiting falls back to in-memory per-process limiting.

## Scripts

```bash
npm run dev         # start dev server
npm run build       # production build
npm run start       # start production server
npm run lint        # lint
npm run db:push     # push Prisma schema to DB
npm run db:generate # generate Prisma client
```

## How It Works

1. Client submits selected transports, zodiac sign, and birth year to `POST /api/horoscope`.
2. Route enforces payload limit, validates input (Zod), resolves IP, and applies rate limiting.
3. Domain service resolves/caches approximate location, finds nearest city, fetches/caches weather (Open-Meteo), and runs the transport expert.
4. Expert ranking for all selected modes is passed to Gemini (or local fallback) to produce a fictional, mode-specific horoscope ranking.
5. Results are cached (server-side in DB for reusable contexts; client-side in memory with 1h TTL) and rendered as tarot cards.

## Privacy & Data

- The server stores an anonymous IP hash (with salt), approximate coordinates/provider data, nearest city, weather responses, expert results, and generated rankings as needed for caching.
- The raw IP address is not stored.
- Transport choices, zodiac sign, and birth year are included in request processing and cached/generated records.

## Deployment Notes

- **Self-hosted / Node server / Container:** Works out of the box with local SQLite and in-memory rate limiting. Ensure `IP_HASH_SALT` is set and reverse-proxy headers (`X-Forwarded-For`) are trusted.
- **Serverless (e.g., Vercel):** Configure `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` for distributed rate limiting, and point Prisma to a hosted database (or libSQL/Turso) since serverless filesystems are ephemeral.

## Disclaimer

AstroCommute outputs playful, astrology-inspired content. Do not use it as safety advice—follow real-world conditions and local rules.
