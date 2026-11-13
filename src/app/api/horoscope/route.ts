import { NextResponse } from "next/server";
import { z } from "zod";
import { transportOptions, zodiacSigns } from "@/lib/domain/horoscope";
import { createHoroscopeRanking } from "@/lib/domain/horoscope/service";
import type { TransportMode } from "@/lib/domain/transport-expert";
import { getRequestIp } from "@/lib/server/geolocation";
import { checkRateLimit } from "@/lib/server/rate-limit";
import { readJsonWithLimit } from "@/lib/server/request-body";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_BODY_BYTES = 4096;

const requestSchema = z.object({
  ip: z.string().optional(),
  transports: z
    .array(z.enum(transportOptions))
    .min(1)
    .max(transportOptions.length),
  zodiacSign: z.enum(zodiacSigns),
  birthYear: z.number().int().min(1900).max(new Date().getFullYear()),
});

export async function POST(request: Request) {
  const bodyResult = await readJsonWithLimit(request, MAX_BODY_BYTES);
  if (!bodyResult.ok) {
    return NextResponse.json(
      { error: bodyResult.error },
      { status: bodyResult.status },
    );
  }

  const input = requestSchema.safeParse(bodyResult.data);
  if (!input.success) {
    return NextResponse.json(
      {
        error:
          "Wybierz co najmniej jeden środek transportu, znak zodiaku i poprawny rok urodzenia.",
      },
      { status: 400 },
    );
  }

  const ip = await getRequestIp(request, input.data);
  if (!ip) {
    return NextResponse.json(
      {
        error:
          "Unable to determine a public IP address. Check your internet connection and try again.",
      },
      { status: 400 },
    );
  }

  const rateLimit = await checkRateLimit(`horoscope:${ip}`);
  if (!rateLimit.ok) {
    return NextResponse.json(
      { error: "Zbyt wiele żądań. Spróbuj ponownie później." },
      {
        status: 429,
        headers: {
          "Retry-After": String(rateLimit.retryAfter),
          "X-RateLimit-Limit": String(rateLimit.limit),
          "X-RateLimit-Remaining": String(rateLimit.remaining),
          "X-RateLimit-Reset": String(rateLimit.resetAt),
        },
      },
    );
  }

  try {
    const horoscope = await createHoroscopeRanking(ip, {
      transports: input.data.transports as TransportMode[],
      zodiacSign: input.data.zodiacSign,
      birthYear: input.data.birthYear,
    });
    return NextResponse.json({ horoscope });
  } catch (error) {
    console.error("Horoscope request failed", error);
    return NextResponse.json(
      { error: "Nie udało się przygotować horoskopu. Spróbuj ponownie później." },
      { status: 502 },
    );
  }
}
