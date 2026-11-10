import { readFile } from "node:fs/promises";
import path from "node:path";

export type City = {
  city: string;
  latitude: number;
  longitude: number;
};

let citiesPromise: Promise<City[]> | undefined;

async function loadCities(): Promise<City[]> {
  const file = await readFile(
    path.join(process.cwd(), "polish_cities_coordinates.csv"),
    "utf8"
  );
  const rows = file.trim().split(/\r?\n/);
  const [header, ...data] = rows;
  if (header !== "city,latitude,longitude") {
    throw new Error("City CSV header is invalid.");
  }

  const cities = data.map((row, index) => {
    const [city, latitude, longitude] = row.split(",");
    const parsedLatitude = Number(latitude);
    const parsedLongitude = Number(longitude);
    if (!city || !Number.isFinite(parsedLatitude) || !Number.isFinite(parsedLongitude)) {
      throw new Error(`City CSV row ${index + 2} is invalid.`);
    }
    return { city, latitude: parsedLatitude, longitude: parsedLongitude };
  });
  if (cities.length === 0) throw new Error("City CSV is empty.");
  return cities;
}

export function getCities(): Promise<City[]> {
  citiesPromise ??= loadCities();
  return citiesPromise;
}

function toRadians(value: number): number {
  return (value * Math.PI) / 180;
}

export function distanceInKm(
  latitude1: number,
  longitude1: number,
  latitude2: number,
  longitude2: number
): number {
  const earthRadiusKm = 6371;
  const latitudeDelta = toRadians(latitude2 - latitude1);
  const longitudeDelta = toRadians(longitude2 - longitude1);
  const a =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(toRadians(latitude1)) *
      Math.cos(toRadians(latitude2)) *
      Math.sin(longitudeDelta / 2) ** 2;
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function findNearestCity(latitude: number, longitude: number) {
  const cities = await getCities();
  return cities.reduce((nearest, city) => {
    const distanceKm = distanceInKm(latitude, longitude, city.latitude, city.longitude);
    return distanceKm < nearest.distanceKm ? { city, distanceKm } : nearest;
  }, { city: cities[0], distanceKm: Number.POSITIVE_INFINITY });
}
