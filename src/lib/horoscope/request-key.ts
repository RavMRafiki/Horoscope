import type { ModeAssessment } from "../transport-expert";

export async function buildHoroscopeRequestKey(input: {
  weatherId: string;
  expertId: string;
  transports: string[];
  transportAssessments: ModeAssessment[];
  zodiacSign: string;
  birthYear: number;
  city: string;
  model: string | null;
}): Promise<string> {
  const payload = JSON.stringify({
    weatherId: input.weatherId,
    expertId: input.expertId,
    transports: input.transports,
    transportAssessments: input.transportAssessments,
    zodiacSign: input.zodiacSign,
    birthYear: input.birthYear,
    city: input.city,
    model: input.model,
  });
  const data = new TextEncoder().encode(payload);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}
