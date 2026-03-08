export type PhoneInfo = { number: string; type: string; carrier: string };

export type PersonResult = {
  name: string;
  age: string | null;
  deceased: boolean;
  currentAddress: string | null;
  previousAddresses: string[];
  moreAddresses: number;
  aliases: string[];
  phones: PhoneInfo[];
  morePhones: number;
  emails: string[];
  relatives: string[];
  associates: string[];
  detailUrl: string | null;
};

export type PersonInput = {
  firstName: string;
  lastName: string;
  city: string;
  state: string;
  zipcode: string;
};

export type ScrapeResult = {
  url: string;
  status: number;
  totalResults: number;
  people: PersonResult[];
  scrapedAt: string;
  person: PersonInput;
};

export type BulkItem = {
  person: PersonInput;
  url: string;
  status: "pending" | "scraping" | "done" | "error";
  result?: ScrapeResult;
  error?: string;
};
