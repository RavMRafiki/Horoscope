import type { ModeAssessment } from "../transport-expert";
import type { Horoscope } from "./schema";

type ModeFlavor = {
  archetype: string;
  element: string;
  patronPlanet: string;
  aura: string;
  warning: string;
  cosmicCompatibility: string;
};

const MODE_FLAVOR: Record<string, ModeFlavor> = {
  pieszo: {
    archetype: "Pielgrzym Chodnikowego Labiryntu",
    element: "Kurz z Krawężnika",
    patronPlanet: "Saturn liczący każdy krok",
    aura: "Twoje buty czytają pęknięcia asfaltu jak linie papilarne miasta, a tempo dyktuje rytm własnego oddechu.",
    warning: "Uważaj na kałuże udające zwierciadła i rowerzystów wyłaniających się spoza zakrętu przeznaczenia.",
    cosmicCompatibility: "Karmiczna zgoda z zielonym światłem, wieczny spór z przedłużającym się czerwonym.",
  },
  rower: {
    archetype: "Rycerz Okrutnego Łańcucha",
    element: "Smar i Pot Przodków",
    patronPlanet: "Mars na cienkich oponach",
    aura: "Pedały mielą kilometry w modlitwie o płynny przejazd, a wiatr dopisuje własne wersety do Twojej trasy.",
    warning: "Strzeż się zdradzieckich szyn tramwajowych i drzwi auta otwieranych bez konsultacji z kosmosem.",
    cosmicCompatibility: "Sprzymierzeniec podjazdów z górnej półki, rywal śliskiego liścia na zakręcie.",
  },
  "hulajnoga elektryczna": {
    archetype: "Posłaniec Baterii o Zmierzchu",
    element: "Iskra z Akumulatora",
    patronPlanet: "Uran z migającą diodą",
    aura: "Cichy silnik niesie Cię nad płytami chodnika, jakby miasto było planszą do szybkiej wróżby.",
    warning: "Gdy procent baterii spada, wszechświat zamienia prędkość w pokorny spacer obok hulajnogi.",
    cosmicCompatibility: "Sojusz z gładką nawierzchnią, napięcie z każdą kostką brukową.",
  },
  motocykl: {
    archetype: "Gromowładny Nomada Pasa Ruchu",
    element: "Spaliny i Adrenalina",
    patronPlanet: "Pluton na pełnym gazie",
    aura: "Silnik warczy mantrę wolności, a każde skrzyżowanie staje się próbą charakteru i refleksu.",
    warning: "Niewidzialna plama oleju potrafi przepisać horoskop w ułamku sekundy.",
    cosmicCompatibility: "Braterstwo z pustą drogą, drażliwość w obecności nieuważnych lusterek.",
  },
  "skuter lub motorower": {
    archetype: "Żeglarz Miejskiej Bryzy",
    element: "Benzynowa Mżawka",
    patronPlanet: "Merkury na małych kołach",
    aura: "Skuter przemyka między zdarzeniami dnia, zbierając plotki z sygnalizacji i zapachy ulic.",
    warning: "Podmuch od autobusu może zachwiać nie tylko torem jazdy, lecz i wiarą w stabilność bytu.",
    cosmicCompatibility: "Zgoda z wąską uliczką, chłodne relacje z silnym bocznym wiatrem.",
  },
  samochód: {
    archetype: "Kapitan Stalowej Kapsuły",
    element: "Płyn do Spryskiwaczy",
    patronPlanet: "Jowisz blokujący lewy pas",
    aura: "Za kierownicą snujesz prywatną sagę o cierpliwości, klimatyzacji i wiecznym poszukiwaniu miejsca.",
    warning: "Kosmos ostrzega: wolne miejsce parkingowe to fatamorgana, a sprzęgło pamięta każdy nerwowy start.",
    cosmicCompatibility: "Porozumienie z radiem, zatarg z korkiem w godzinie szczytu.",
  },
  taksówka: {
    archetype: "Wyrocznia Taksometru",
    element: "Opowieść Kierowcy",
    patronPlanet: "Wenus licząca strefy taryfowe",
    aura: "Siedzisz na tylnym fotelu losu, podczas gdy licznik odmierza cenę wygody w rytmie miejskich świateł.",
    warning: "Nagły mnożnik taryfy potrafi zaskoczyć bardziej niż retrogradacja bez ostrzeżenia.",
    cosmicCompatibility: "Harmonia z zmęczeniem po dniu, napięcie z portfelem przy dłuższej trasie.",
  },
  "car-sharing": {
    archetype: "Łowca Kluczy w Aplikacji",
    element: "Zapach Choinki Zapachowej",
    patronPlanet: "Neptun ukryty w strefie parkowania",
    aura: "Auto materializuje się na mapie jak znak z niebios, niosąc tajemnicę poprzednich kierowców.",
    warning: "Rozładowany telefon przed zakończeniem wynajmu zamienia powrót w pieszą pokutę.",
    cosmicCompatibility: "Sojusz z pełnym bakiem, spór z niedopasowaną strefą zakończenia jazdy.",
  },
  autobus: {
    archetype: "Wędrowny Salon Zbiorowej Cierpliwości",
    element: "Ciepło od Grzejnika",
    patronPlanet: "Księżyc według rozkładu jazdy",
    aura: "Autobus kołysze pasażerów w rytmie przystanków, gdzie każdy dzwonek jest małym wyrokiem losu.",
    warning: "Drzwi potrafią zamknąć się dokładnie wtedy, gdy Twoja wiara w punktualność jest największa.",
    cosmicCompatibility: "Zgoda z ważnym biletem, tarcia z niespodziewanym objazdem.",
  },
  tramwaj: {
    archetype: "Szynowy Medium Prądów Losu",
    element: "Iskry z Pantografu",
    patronPlanet: "Saturn w wiecznym remoncie torowiska",
    aura: "Dzwonek i brzęk szyn wyznaczają niezmienny rytuał, któremu miasto poddaje się od pokoleń.",
    warning: "Zablokowana zwrotnica potrafi zatrzymać nie tylko skład, lecz i cały Twój plan dnia.",
    cosmicCompatibility: "Harmonia z wydzielonym torowiskiem, konflikt z samochodem na szynach.",
  },
  metro: {
    archetype: "Podziemny Wyznawca Tunelu",
    element: "Echo Peronu",
    patronPlanet: "Pluton pod powierzchnią miasta",
    aura: "W tunelu czas płynie inaczej, a pociąg niesie Cię w rytmie migających świateł stacyjnych.",
    warning: "Tłum w godzinie szczytu testuje granice osobistej przestrzeni i zen.",
    cosmicCompatibility: "Braterstwo z klimatyzacją, napięcie z awarią sygnalizacji.",
  },
  pociąg: {
    archetype: "Długodystansowy Kronikarz Torów",
    element: "Stalowy Rozkład Jazdy",
    patronPlanet: "Jowisz na torze dalekobieżnym",
    aura: "Miarowe stukoty kół układają podróż w opowieść, gdzie każdy peron jest rozdziałem.",
    warning: "Zmiana peronu w ostatniej chwili to ulubiony żart kolejowego trickstera.",
    cosmicCompatibility: "Sojusz z oknem i krajobrazem, niepokój przy opóźnieniu z przyczyn technicznych.",
  },
  prom: {
    archetype: "Wodny Wędrowiec Pokładu",
    element: "Słona Mgła",
    patronPlanet: "Neptun kołyszący burtą",
    aura: "Pokład unosi się między brzegami jak wahadło losu, a woda dopowiada resztę przepowiedni.",
    warning: "Nagły podmuch i mokra balustrada wymagają szacunku wobec żywiołu.",
    cosmicCompatibility: "Harmonia ze spokojną taflą, spór z wysoką falą i chłodem.",
  },
  samolot: {
    archetype: "Orzeł Nadchmurnej Sfery",
    element: "Rozrzedzone Powietrze",
    patronPlanet: "Uran nad pasem startowym",
    aura: "Start odrywa codzienność od ziemi, a chmury stają się miękkim dywanem pod skrzydłami planu.",
    warning: "Kontrola bezpieczeństwa i bramka mogą wydłużyć rytuał odlotu bez ostrzeżenia.",
    cosmicCompatibility: "Przymierze z oknem i widokiem, napięcie z turbulencją bez zapowiedzi.",
  },
};

const DEFAULT_FLAVOR: ModeFlavor = {
  archetype: "Wędrowiec Miejskiej Orbity",
  element: "Miejski Pył",
  patronPlanet: "Merkury w pośpiechu",
  aura: "Ten środek niesie Cię przez miejskie prądy w rytmie własnego, niepowtarzalnego przeznaczenia.",
  warning: "Zachowaj czujność, gdy plan dnia spotyka nieprzewidziany kaprys ruchu.",
  cosmicCompatibility: "Harmonia z dobrą pogodą, napięcie z nagłą zmianą warunków.",
};

function scoreContext(assessment?: ModeAssessment): string {
  if (!assessment) return "";
  if (assessment.reasons.length > 0) {
    return ` Niebiosa odnotowują: ${assessment.reasons[0].toLowerCase()}.`;
  }
  if (assessment.blocked) {
    return " Gwiazdy stawiają tu wyraźny znak ostrzegawczy.";
  }
  return "";
}

export function createFallbackHoroscope(input: {
  transports: string[];
  transportAssessments?: ModeAssessment[];
  zodiacSign: string;
  birthYear: number;
  city: string;
  weather: Record<string, unknown>;
}): Horoscope {
  const assessmentsByMode = new Map<string, ModeAssessment>(
    (input.transportAssessments ?? []).map((a) => [a.mode, a]),
  );

  return {
    ranking: input.transports.map((transport, index) => {
      const flavor = MODE_FLAVOR[transport] ?? DEFAULT_FLAVOR;
      const assessment = assessmentsByMode.get(transport);
      return {
        transport,
        rank: index + 1,
        archetype: flavor.archetype,
        element: flavor.element,
        patronPlanet: flavor.patronPlanet,
        aura: `${flavor.aura} Znak ${input.zodiacSign} prowadzi dziś Twój kurs w ${input.city}.${scoreContext(assessment)}`,
        warning: flavor.warning,
        cosmicCompatibility: flavor.cosmicCompatibility,
      };
    }),
  };
}
