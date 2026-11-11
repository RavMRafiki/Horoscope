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

export function isPublicIp(ip: string): boolean {
  if (isIP(ip) === 4) {
    const [first, second] = ip.split(".").map(Number);
    return (
      first !== 10 &&
      first !== 127 &&
      !(first === 172 && second >= 16 && second <= 31) &&
      !(first === 192 && second === 168) &&
      first !== 0
    );
  }
  if (isIP(ip) === 6) {
    return (
      ip !== "::1" &&
      !ip.toLowerCase().startsWith("fc") &&
      !ip.toLowerCase().startsWith("fd") &&
      !ip.toLowerCase().startsWith("fe80:")
    );
  }
  return false;
}

export function getClientIp(request: Request): string | null {
  const forwarded = request.headers.get("x-forwarded-for");
  const candidate =
    forwarded?.split(",")[0]?.trim() ?? request.headers.get("x-real-ip");
  if (!candidate || candidate === "unknown" || !isPublicIp(candidate))
    return null;
  return candidate;
}

export async function getRequestIp(
  request: Request,
  body: unknown,
): Promise<string | null> {
  const serverIp = getClientIp(request);
  if (serverIp) return serverIp;

  const browserIp = z.object({ ip: z.string().trim() }).safeParse(body);
  if (!browserIp.success || !isPublicIp(browserIp.data.ip)) return null;
  return browserIp.data.ip;
}

export async function geolocateIp(ip: string) {
  const baseUrl = process.env.IP_GEOLOCATION_URL ?? "https://ipwho.is";
  let response: Response;
  try {
    response = await fetch(`${baseUrl}/${encodeURIComponent(ip)}`, {
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
  if (!response.ok)
    throw new Error(`IP geolocation failed with status ${response.status}.`);
  const result = responseSchema.parse(await response.json());
  if (result.success === false)
    throw new Error("IP geolocation provider rejected the address.");
  if (result.latitude === undefined || result.longitude === undefined) {
    throw new Error("IP geolocation provider returned no coordinates.");
  }
  return {
    latitude: result.latitude,
    longitude: result.longitude,
    accuracy: result.accuracy ?? null,
  };
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
  return process.env.IP_GEOLOCATION_URL ?? "https://ipwho.is";
}

export async function getOrCreateIpLocation(ip: string) {
  const ipHash = await hashIp(ip);
  const provider = getGeolocationProvider();
  const existing = await prisma.ipLocation.findUnique({
    where: { ipHash_provider: { ipHash, provider } },
  });
  if (existing) {
    return {
      ipHash,
      provider,
      latitude: existing.latitude,
      longitude: existing.longitude,
      accuracy: existing.accuracy,
    };
  }

  const location = await geolocateIp(ip);
  try {
    const created = await prisma.ipLocation.create({
      data: {
        ipHash,
        provider,
        latitude: location.latitude,
        longitude: location.longitude,
        accuracy: location.accuracy,
      },
    });
    return {
      ipHash,
      provider,
      latitude: created.latitude,
      longitude: created.longitude,
      accuracy: created.accuracy,
    };
  } catch (error) {
    const code = (error as { code?: string }).code;
    if (code === "P2002") {
      const raced = await prisma.ipLocation.findUnique({
        where: { ipHash_provider: { ipHash, provider } },
      });
      if (raced) {
        return {
          ipHash,
          provider,
          latitude: raced.latitude,
          longitude: raced.longitude,
          accuracy: raced.accuracy,
        };
      }
    }
    throw error;
  }
}
