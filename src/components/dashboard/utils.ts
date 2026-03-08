import type { PersonInput, ScrapeResult } from "./types";

export const US_STATES: Record<string, string> = {
  alabama: "al", alaska: "ak", arizona: "az", arkansas: "ar", california: "ca",
  colorado: "co", connecticut: "ct", delaware: "de", florida: "fl", georgia: "ga",
  hawaii: "hi", idaho: "id", illinois: "il", indiana: "in", iowa: "ia",
  kansas: "ks", kentucky: "ky", louisiana: "la", maine: "me", maryland: "md",
  massachusetts: "ma", michigan: "mi", minnesota: "mn", mississippi: "ms", missouri: "mo",
  montana: "mt", nebraska: "ne", nevada: "nv", "new hampshire": "nh", "new jersey": "nj",
  "new mexico": "nm", "new york": "ny", "north carolina": "nc", "north dakota": "nd",
  ohio: "oh", oklahoma: "ok", oregon: "or", pennsylvania: "pa", "rhode island": "ri",
  "south carolina": "sc", "south dakota": "sd", tennessee: "tn", texas: "tx", utah: "ut",
  vermont: "vt", virginia: "va", washington: "wa", "west virginia": "wv", wisconsin: "wi",
  wyoming: "wy",
};

export function normalizeState(input: string): string {
  const lower = input.trim().toLowerCase();
  if (lower.length === 2 && Object.values(US_STATES).includes(lower)) return lower;
  if (US_STATES[lower]) return US_STATES[lower];
  return lower;
}

export function buildUrl(person: PersonInput): string {
  const first = person.firstName.trim().toLowerCase();
  const last = person.lastName.trim().toLowerCase();
  const state = normalizeState(person.state);
  const city = person.city.trim().toLowerCase().replace(/\s+/g, "-");
  return `https://www.cyberbackgroundchecks.com/people/${first}-${last}/${state}/${city}`;
}

export function filterByZip(scrapeResult: ScrapeResult, zip: string) {
  if (!zip) return;
  const z = zip.trim().substring(0, 5);
  if (!z) return;
  scrapeResult.people = scrapeResult.people.filter((p) => {
    const currentAddr = p.currentAddress || "";
    const prevAddrs = p.previousAddresses.join(" ");
    return currentAddr.includes(z) || prevAddrs.includes(z);
  });
  scrapeResult.totalResults = scrapeResult.people.length;
}
