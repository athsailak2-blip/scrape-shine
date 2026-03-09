import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface PersonResult {
  name: string;
  age: string | null;
  deceased: boolean;
  currentAddress: string | null;
  previousAddresses: string[];
  moreAddresses: number;
  aliases: string[];
  phones: Array<{ number: string; type: string; carrier: string }>;
  morePhones: number;
  emails: string[];
  relatives: string[];
  associates: string[];
  detailUrl: string | null;
}

function parseListingPage(html: string): PersonResult[] {
  const results: PersonResult[] = [];
  const namePattern = /<h2 class="mb-0">\s*<i class="fad fa-user-circle/g;
  let match;
  const positions: number[] = [];

  while ((match = namePattern.exec(html)) !== null) {
    positions.push(match.index);
  }

  const personBlocks: string[] = [];
  for (let i = 0; i < positions.length; i++) {
    const start = positions[i];
    const end = i < positions.length - 1 ? positions[i + 1] : html.length;
    personBlocks.push(html.substring(start, end));
  }

  for (const block of personBlocks) {
    const person: PersonResult = {
      name: "", age: null, deceased: false, currentAddress: null,
      previousAddresses: [], moreAddresses: 0, aliases: [],
      phones: [], morePhones: 0, emails: [], relatives: [],
      associates: [], detailUrl: null,
    };

    const nameMatch = block.match(/<span class="name-given">\s*([\s\S]*?)\s*<\/span>/);
    if (nameMatch) person.name = nameMatch[1].trim();

    const ageMatch = block.match(/<span class="age">(\d+)<\/span>/);
    if (ageMatch) person.age = ageMatch[1];

    if (/deceased/i.test(block)) person.deceased = true;

    const currentAddrMatch = block.match(/<p class="address-current[^"]*"[^>]*>\s*<a[^>]*>([^<]+)<\/a>/);
    if (currentAddrMatch) person.currentAddress = currentAddrMatch[1].trim();

    const prevAddrRegex = /<p class="[^"]*address-previous[^"]*"[^>]*>\s*<a[^>]*>([^<]+)<\/a>/g;
    let addrMatch;
    while ((addrMatch = prevAddrRegex.exec(block)) !== null) {
      person.previousAddresses.push(addrMatch[1].trim());
    }

    const moreAddrMatch = block.match(/\[(\d+)\] more\.\.\./);
    if (moreAddrMatch) person.moreAddresses = parseInt(moreAddrMatch[1]);

    const aliasRegex = /<span class="aka">([^<]+)<\/span>/g;
    let aliasMatch;
    while ((aliasMatch = aliasRegex.exec(block)) !== null) {
      person.aliases.push(aliasMatch[1].trim());
    }

    const phoneRegex = /<a[^>]*title="[^"]*\((\d{3})\)\s*(\d{3})-(\d{4})\s*\(([^)]+)\)"[^>]*class="phone"[^>]*>\((\d{3})\)\s*(\d{3})-(\d{4})<\/a>/g;
    let phoneMatch;
    while ((phoneMatch = phoneRegex.exec(block)) !== null) {
      const number = `(${phoneMatch[5]}) ${phoneMatch[6]}-${phoneMatch[7]}`;
      const info = phoneMatch[4];
      const parts = info.split(" - ");
      const type = parts[0]?.trim() || "";
      const lastPart = parts[parts.length - 1]?.trim() || "";
      const hasStateCode = /^[A-Z]{2}$/.test(lastPart);
      const carrierParts = hasStateCode ? parts.slice(1, -1) : parts.slice(1);
      const carrier = carrierParts.join(" - ").trim() || "";
      person.phones.push({ number, type, carrier });
    }

    const morePhonesMatch = block.match(/class="more-phones[\s\S]*?\[(\d+)\] more/);
    if (morePhonesMatch) person.morePhones = parseInt(morePhonesMatch[1]);

    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const siteDomains = new Set(["cyberbackgroundchecks.com", "example.com"]);
    let emailMatch;
    while ((emailMatch = emailRegex.exec(block)) !== null) {
      const email = emailMatch[0].toLowerCase();
      if (!siteDomains.has(email.split("@")[1]) && !person.emails.includes(email)) {
        person.emails.push(email);
      }
    }

    const relativeRegex = /<a[^>]*class="relative"[^>]*>([^<]+)<\/a>/g;
    let relMatch;
    while ((relMatch = relativeRegex.exec(block)) !== null) {
      person.relatives.push(relMatch[1].trim());
    }

    const assocRegex = /<a[^>]*class="associate"[^>]*>([^<]+)<\/a>/g;
    let assocMatch;
    while ((assocMatch = assocRegex.exec(block)) !== null) {
      person.associates.push(assocMatch[1].trim());
    }

    const detailMatch = block.match(/href="(https:\/\/www\.cyberbackgroundchecks\.com\/detail\/[^"]+)"/);
    if (detailMatch) person.detailUrl = detailMatch[1];

    if (person.name) results.push(person);
  }

  // Check JSON-LD for emails
  const jsonLdMatches = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  for (const jmatch of jsonLdMatches) {
    try {
      const data = JSON.parse(jmatch[1]);
      const items = Array.isArray(data) ? data : [data];
      for (const item of items) {
        if (item.email && results.length > 0) {
          const vals = Array.isArray(item.email) ? item.email : [item.email];
          for (const e of vals) {
            const el = e.toLowerCase();
            if (!results[0].emails.includes(el)) results[0].emails.push(el);
          }
        }
      }
    } catch {}
  }

  return results;
}

function buildScrapeUrl(apiKey: string, url: string, useSuperProxy: boolean): string {
  const params = new URLSearchParams({
    token: apiKey,
    url,
    geoCode: "us",
    render: "false",
  });

  if (useSuperProxy) {
    params.set("super", "true");
  }

  return `https://api.scrape.do/?${params.toString()}`;
}

const ATTEMPTS = [
  { useSuperProxy: false, timeoutMs: 18000 },
  { useSuperProxy: true, timeoutMs: 22000 },
  { useSuperProxy: false, timeoutMs: 18000 },
] as const;

const RETRYABLE_STATUSES = new Set([429, 500, 502, 503, 504]);

async function scrapePage(apiKey: string, url: string): Promise<{ html: string; status: number }> {
  let lastStatus = 0;
  let lastHtml = "";

  for (let i = 0; i < ATTEMPTS.length; i++) {
    const attempt = ATTEMPTS[i];
    const scrapeUrl = buildScrapeUrl(apiKey, url, attempt.useSuperProxy);

    console.log(
      `Scrape attempt ${i + 1}/${ATTEMPTS.length} (super=${attempt.useSuperProxy}, timeout=${attempt.timeoutMs}ms)`
    );

    try {
      const response = await fetch(scrapeUrl, { signal: AbortSignal.timeout(attempt.timeoutMs) });
      const html = await response.text();
      lastStatus = response.status;
      lastHtml = html;

      if (response.status === 200) {
        return { html, status: 200 };
      }

      const hasMoreAttempts = i < ATTEMPTS.length - 1;
      if (!hasMoreAttempts || !RETRYABLE_STATUSES.has(response.status)) {
        return { html, status: response.status };
      }

      await new Promise((r) => setTimeout(r, 1200));
    } catch (error) {
      const hasMoreAttempts = i < ATTEMPTS.length - 1;
      const msg = error instanceof Error ? error.message : String(error);
      console.log(`Attempt ${i + 1} failed: ${msg}`);

      if (!hasMoreAttempts) {
        return { html: lastHtml, status: lastStatus || 504 };
      }

      await new Promise((r) => setTimeout(r, 1200));
    }
  }

  return { html: lastHtml, status: lastStatus || 504 };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { url, apiKey, validateOnly } = await req.json();

    if (!url) {
      return new Response(JSON.stringify({ error: "URL is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "API key is required. Please add your scrape.do API key in Settings." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // For validation, do a quick single attempt with short timeout
    if (validateOnly) {
      try {
        const params = new URLSearchParams({ token: apiKey, url: url });
        const res = await fetch(`https://api.scrape.do/?${params.toString()}`, { signal: AbortSignal.timeout(15000) });
        return new Response(
          JSON.stringify({ status: res.status }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } catch {
        return new Response(
          JSON.stringify({ status: 0, error: "Validation request failed" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    console.log("Scraping:", url);

    const { html, status } = await scrapePage(apiKey, url);

    if (status !== 200) {
      const errorMsg = status === 402
        ? "ScrapeDo credits exhausted. Please top up your account."
        : `Scrape failed with status ${status}`;
      return new Response(
        JSON.stringify({ error: errorMsg, status }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const people = parseListingPage(html);

    const totalMatch = html.match(/<strong>(\d+)<\/strong>\s*results? for/);
    const totalResults = totalMatch ? parseInt(totalMatch[1]) : people.length;

    return new Response(
      JSON.stringify({ status: 200, totalResults, people }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Scrape error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
