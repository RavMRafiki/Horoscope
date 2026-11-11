import { z } from "zod";

export const horoscopeSchema = z.object({
  ranking: z
    .array(
      z.object({
        transport: z.string(),
        rank: z.number().int().positive(),
        archetype: z.string(),
        element: z.string(),
        patronPlanet: z.string(),
        aura: z.string(),
        warning: z.string(),
        cosmicCompatibility: z.string(),
      }),
    )
    .min(1),
});

export type Horoscope = z.infer<typeof horoscopeSchema>;
