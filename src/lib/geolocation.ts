import { z } from "zod";
import { isIP } from "node:net";
import { prisma } from "@/lib/prisma";

const responseSchema = z.object({
  success: z.boolean().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  city: z.string().nullable().optional(),
  accuracy: z.number().nullable().optional(),
});

type GeolocationPayload = z.infer<typeof responseSchema>;

type GeolocationResult = {
  latitude: number;
  longitude: number;
  accuracy: number | null;
};

type IpLocationRecord = {
  ipHash: string;
  provider: string;
  latitude: number;
  longitude: number;
  accuracy: number | null;
};

type IpLocationKey = {
  ipHash: string;
  provider: string;
};

type IpLocationEntity = {
  latitude: number;
  longitude: number;
  accuracy: number | null;
};

const IPV4_RESERVED_PREDICATES: Array<(first: number, second: number) => boolean> = [
  (first) => first === 10,
  (first) => first === 127,
  (first) => first === 0,
  (first, second) => first === 172 && second >= 16 && second <= 31,
  (first, second) => first === 192 && second === 168,
];

const IPV6_RESERVED_PREFIXES = ["fc", "fd", "fe80:"] as const;

const GEOLOCATION_TIMEOUT_MS = 10000;
const GEOLOCATION_TIMEOUT_MESSAGE =
  "The IP geolocation service did not respond within 10 seconds.";
const DEFAULT_GEOLOCATION_URL = "https://ipwho.is";
const UNKNOWN_IP_CANDIDATE = "unknown";

const browserIpBodySchema = z.object({ ip: z.string().trim() });

function isReservedIpv4(first: number, second: number): boolean {
  return IPV4_RESERVED_PREDICATES.some((predicate) => predicate(first, second));
}

function isPrivateOrReservedIpv4(ip: string): boolean {
  const [first, second] = ip.split(".").map(Number);
  return isReservedIpv4(first, second);
}

function isIpv6Loopback(ip: string): boolean {
  return ip === "::1";
}

function hasReservedIpv6Prefix(ip: string): boolean {
  return IPV6_RESERVED_PREFIXES.some((prefix) => ip.startsWith(prefix));
}

function isPrivateOrReservedIpv6(ip: string): boolean {
  const normalized = ip.toLowerCase();
  return isIpv6Loopback(normalized) || hasReservedIpv6Prefix(normalized);
}

export function isPublicIp(ip: string): boolean {
  const version = isIP(ip);
  if (version === 4) return !isPrivateOrReservedIpv4(ip);
  if (version === 6) return !isPrivateOrReservedIpv6(ip);
  return false;
}

function parseForwardedIp(headerValue: string | null): string | null {
  const firstValue = headerValue?.split(",")[0]?.trim();
  return firstValue || null;
}

function isUnknownCandidate(candidate: string): boolean {
  return candidate === UNKNOWN_IP_CANDIDATE;
}

function isUsablePublicIpCandidate(candidate: string | null): candidate is string {
  if (!candidate) return false;
  if (isUnknownCandidate(candidate)) return false;
  return isPublicIp(candidate);
}

function getHeaderIpCandidate(request: Request): string | null {
  const forwardedCandidate = parseForwardedIp(
    request.headers.get("x-forwarded-for"),
  );
  if (forwardedCandidate) return forwardedCandidate;
  return request.headers.get("x-real-ip");
}

export function getClientIp(request: Request): string | null {
  const candidate = getHeaderIpCandidate(request);
  if (!isUsablePublicIpCandidate(candidate)) return null;
  return candidate;
}

function extractBrowserIpCandidate(body: unknown): string | null {
  const parsed = browserIpBodySchema.safeParse(body);
  if (!parsed.success) return null;
  return parsed.data.ip;
}

export async function getRequestIp(
  request: Request,
  body: unknown,
): Promise<string | null> {
  const serverIp = getClientIp(request);
  if (serverIp) return serverIp;

  const browserCandidate = extractBrowserIpCandidate(body);
  if (!isUsablePublicIpCandidate(browserCandidate)) return null;
  return browserCandidate;
}

function getGeolocationBaseUrl(): string {
  return process.env.IP_GEOLOCATION_URL ?? DEFAULT_GEOLOCATION_URL;
}

function buildGeolocationUrl(ip: string): string {
  return `${getGeolocationBaseUrl()}/${encodeURIComponent(ip)}`;
}

function isTimeoutError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "TimeoutError";
}

async function fetchGeolocationResponse(ip: string): Promise<Response> {
  try {
    return await fetch(buildGeolocationUrl(ip), {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(GEOLOCATION_TIMEOUT_MS),
      cache: "no-store",
    });
  } catch (error) {
    if (isTimeoutError(error)) {
      throw new Error(GEOLOCATION_TIMEOUT_MESSAGE);
    }
    throw error;
  }
}

function ensureGeolocationResponseOk(response: Response): void {
  if (response.ok) return;
  throw new Error(`IP geolocation failed with status ${response.status}.`);
}

async function parseGeolocationPayload(
  response: Response,
): Promise<GeolocationPayload> {
  return responseSchema.parse(await response.json());
}

function hasCoordinates(
  payload: GeolocationPayload,
): payload is GeolocationPayload & { latitude: number; longitude: number } {
  return payload.latitude !== undefined && payload.longitude !== undefined;
}

function toGeolocationResult(payload: GeolocationPayload): GeolocationResult {
  if (payload.success === false) {
    throw new Error("IP geolocation provider rejected the address.");
  }
  if (!hasCoordinates(payload)) {
    throw new Error("IP geolocation provider returned no coordinates.");
  }
  return {
    latitude: payload.latitude,
    longitude: payload.longitude,
    accuracy: payload.accuracy ?? null,
  };
}

export async function geolocateIp(ip: string): Promise<GeolocationResult> {
  const response = await fetchGeolocationResponse(ip);
  ensureGeolocationResponseOk(response);
  const payload = await parseGeolocationPayload(response);
  return toGeolocationResult(payload);
}

export async function hashIp(ip: string): Promise<string> {
  const salt = process.env.IP_HASH_SALT ?? "development-salt";
  const data = new TextEncoder().encode(`${ip}:${salt}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

export function getGeolocationProvider(): string {
  return getGeolocationBaseUrl();
}

function toIpLocationRecord(
  key: IpLocationKey,
  entity: IpLocationEntity,
): IpLocationRecord {
  return {
    ipHash: key.ipHash,
    provider: key.provider,
    latitude: entity.latitude,
    longitude: entity.longitude,
    accuracy: entity.accuracy,
  };
}

async function findIpLocation(
  key: IpLocationKey,
): Promise<IpLocationRecord | null> {
  const existing = await prisma.ipLocation.findUnique({
    where: { ipHash_provider: key },
  });
  if (!existing) return null;
  return toIpLocationRecord(key, existing);
}

async function createIpLocation(
  key: IpLocationKey,
  location: GeolocationResult,
): Promise<IpLocationRecord> {
  const created = await prisma.ipLocation.create({
    data: {
      ipHash: key.ipHash,
      provider: key.provider,
      latitude: location.latitude,
      longitude: location.longitude,
      accuracy: location.accuracy,
    },
  });
  return toIpLocationRecord(key, created);
}

function isUniqueConstraintError(error: unknown): boolean {
  return (error as { code?: string }).code === "P2002";
}

async function resolveIpLocationRace(
  error: unknown,
  key: IpLocationKey,
): Promise<IpLocationRecord | null> {
  if (!isUniqueConstraintError(error)) return null;
  return findIpLocation(key);
}

export async function getOrCreateIpLocation(
  ip: string,
): Promise<IpLocationRecord> {
  const key: IpLocationKey = {
    ipHash: await hashIp(ip),
    provider: getGeolocationProvider(),
  };

  const existing = await findIpLocation(key);
  if (existing) return existing;

  const location = await geolocateIp(ip);
  try {
    return await createIpLocation(key, location);
  } catch (error) {
    const raced = await resolveIpLocationRace(error, key);
    if (raced) return raced;
    throw error;
  }
}
