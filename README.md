# Dzisiaj

Responsive Next.js app showing today's weather for the Polish city closest to the visitor's approximate IP-based location.

## Local setup

```bash
npm install
cp .env.example .env
npm run db:push
npm run dev
```

Open `http://localhost:3000`. The browser first reads its public IP through ipify and sends it to the Next.js API. In deployments, the API prefers a public IP supplied by trusted proxy headers.

## Configuration

- `DATABASE_URL` defaults to the SQLite URL in `.env.example`.
- `IP_GEOLOCATION_URL` selects the IP geolocation service (the default is `https://ipwho.is`).
- `IP_HASH_SALT` should be set to a long random value in production.
- `GEMINI_API_KEY` enables the Gemini free-tier horoscope generation.
- `GEMINI_MODEL` optionally overrides the default `gemini-3.1-flash-lite` model. If the configured model returns 404 or temporary 503, the app tries current supported fallback models.

The server stores an anonymous IP hash, the approximate coordinates, the nearest city, and the complete current-day Open-Meteo response. It does not store the raw IP address.

## Data source

`polish_cities_coordinates.csv` is loaded and validated on the server. Nearest-city selection uses the Haversine distance between the IP estimate and each city coordinate. Weather is requested from Open-Meteo using the selected city's coordinates and its local timezone. The selected transport types, zodiac sign, birth year, weather, and generated ranking are saved with each request.

The browser offers transport options used in Poland, including walking, bicycle, e-scooter, motorcycle, car, taxi, car-sharing, bus, tram, metro, train, ferry, and airplane. After weather is loaded, the server-side transport expert scores the selected modes from 0 to 100 using the current and near-term forecast, filters the weather-compatible suggestions, and passes those scores and explanations to Gemini. Gemini then produces an explicitly fictional ranking from best to worst with happiness, positive-energy, and negative-energy text.
