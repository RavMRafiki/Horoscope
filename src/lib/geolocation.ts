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

type GeolocationResult = {
  latitude: number;
  longitude: number;
  accuracy: number | null;
};

function isPrivateOrReservedIpv4(ip: string): boolean {
  const [first, second] = ip.split(".").map(Number);
  const privateRanges = [
    first === 10,
    first === 127,
    first === 0,
    first === 172 && second >= 16 && second <= 31,
    first === 192 && second === 168,
  ];
  return privateRanges.some(Boolean);
}

function isPrivateOrReservedIpv6(ip: string): boolean {
  const normalized = ip.toLowerCase();
  const reservedPrefixes = ["fc", "fd", "fe80:"];
  const isLoopback = normalized === "::1";
  const hasReservedPrefix = reservedPrefixes.some((prefix) =>
    normalized.startsWith(prefix),
  );
  return isLoopback || hasReservedPrefix;
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

function isUsablePublicIpCandidate(candidate: string | null): candidate is string {
  if (!candidate) return false;
  if (candidate === "unknown") return false;
  return isPublicIp(candidate);
}

export function getClientIp(request: Request): string | null {
  const forwardedCandidate = parseForwardedIp(
    request.headers.get("x-forwarded-for"),
  );
  const realIpCandidate = request.headers.get("x-real-ip");
  const candidate = forwardedCandidate ?? realIpCandidate;

  if (!isUsablePublicIpCandidate(candidate)) return null;
  return candidate;
}

export async function getRequestIp(
  request: Request,
  body: unknown,
): Promise<string | null> {
  const serverIp = getClientIp(request);
  if (serverIp) return serverIp;

  const browserIp = z.object({ ip: z.string().trim() }).safeParse(body);
  const browserCandidate = browserIp.success ? browserIp.data.ip : null;
  if (!isUsablePublicIpCandidate(browserCandidate)) return null;
  return browserCandidate;
}

function getGeolocationBaseUrl(): string {
  return process.env.IP_GEOLOCATION_URL ?? "https://ipwho.is";
}

function buildGeolocationUrl(ip: string): string {
  return `${getGeolocationBaseUrl()}/${encodeURIComponent(ip)}`;
}

async function fetchGeolocationResponse(ip: string): Promise<Response> {
  try {
    return await fetch(buildGeolocationUrl(ip), {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(10000),
      cache: "no-store",
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "TimeoutError") {
      throw new Error(
        "The IP geolocation service did not respond within 10 seconds.",
      );
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
): Promise<z.infer<typeof responseSchema>> {
  return responseSchema.parse(await response.json());
}

function toGeolocationResult(
  payload: z.infer<typeof responseSchema>,
): GeolocationResult {
  if (payload.success === false) {
    throw new Error("IP geolocation provider rejected the address.");
  }
  if (payload.latitude === undefined || payload.longitude === undefined) {
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
  const data = new TextEncoder().encode(
    `${ip}:${process.env.IP_HASH_SALT ?? "development-salt"}`,
  );
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

export function getGeolocationProvider(): string {
  return getGeolocationBaseUrl();
}

type IpLocationRecord = {
  ipHash: string;
  provider: string;
  latitude: number;
  longitude: number;
  accuracy: number | null;
};

function toIpLocationRecord(input: {
  ipHash: string;
  provider: string;
  latitude: number;
  longitude: number;
  accuracy: number | null;
}): IpLocationRecord {
  return {
    ipHash: input.ipHash,
    provider: input.provider,
    latitude: input.latitude,
    longitude: input.longitude,
    accuracy: input.accuracy,
  };
}

async function findIpLocation(
  ipHash: string,
  provider: string,
): Promise<IpLocationRecord | null> {
  const existing = await prisma.ipLocation.findUnique({
    where: { ipHash_provider: { ipHash, provider } },
  });
  if (!existing) return null;
  return toIpLocationRecord({
    ipHash,
    provider,
    latitude: existing.latitude,
    longitude: existing.longitude,
    accuracy: existing.accuracy,
  });
}

async function createIpLocation(
  ipHash: string,
  provider: string,
  location: GeolocationResult,
): Promise<IpLocationRecord> {
  const created = await prisma.ipLocation.create({
    data: {
      ipHash,
      provider,
      latitude: location.latitude,
      longitude: location.longitude,
      accuracy: location.accuracy,
    },
  });
  return toIpLocationRecord({
    ipHash,
    provider,
    latitude: created.latitude,
    longitude: created.longitude,
    accuracy: created.accuracy,
  });
}

function isUniqueConstraintError(error: unknown): boolean {
  return (error as { code?: string }).code === "P2002";
}

async function resolveIpLocationRace(
  error: unknown,
  ipHash: string,
  provider: string,
): Promise<IpLocationRecord | null> {
  if (!isUniqueConstraintError(error)) return null;
  return findIpLocation(ipHash, provider);
}

export async function getOrCreateIpLocation(
  ip: string,
): Promise<IpLocationRecord> {
  const ipHash = await hashIp(ip);
  const provider = getGeolocationProvider();

  const existing = await findIpLocation(ipHash, provider);
  if (existing) return existing;

  const location = await geolocateIp(ip);
  try {
    return await createIpLocation(ipHash, provider, location);
  } catch (error) {
    const raced = await resolveIpLocationRace(error, ipHash, provider);
    if (raced) return raced;
    throw error;
  }
}
