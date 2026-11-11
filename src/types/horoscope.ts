export type HoroscopeItem = {
  transport: string;
  rank: number;
  archetype: string;
  element: string;
  patronPlanet: string;
  aura: string;
  warning: string;
  cosmicCompatibility: string;
};

export type WeatherResult = {
  horoscope: { ranking: HoroscopeItem[] };
};
