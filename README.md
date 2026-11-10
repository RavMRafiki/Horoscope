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

The server stores an anonymous IP hash, the approximate coordinates, the nearest city, and the complete current-day Open-Meteo response. It does not store the raw IP address.

## Data source

`polish_cities_coordinates.csv` is loaded and validated on the server. Nearest-city selection uses the Haversine distance between the IP estimate and each city coordinate. Weather is requested from Open-Meteo using the selected city's coordinates and its local timezone.
