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

  // Split by card-hover divs (each person result)
  const cardRegex = /<div class="card card-hover"[^>]*>[\s\S]*?<\/div>\s*<\/div>\s*<\/div>\s*<\/div>/g;
  
  // Better approach: find each person card by the name heading pattern
  const personBlocks: string[] = [];
  const namePattern = /<h2 class="mb-0">\s*<i class="fad fa-user-circle/g;
  let match;
  const positions: number[] = [];
  
  while ((match = namePattern.exec(html)) !== null) {
    positions.push(match.index);
  }
  
  for (let i = 0; i < positions.length; i++) {
    const start = positions[i];
    const end = i < positions.length - 1 ? positions[i + 1] : html.length;
    personBlocks.push(html.substring(start, end));
  }

  for (const block of personBlocks) {
    const person: PersonResult = {
      name: "",
      age: null,
      deceased: false,
      currentAddress: null,
      previousAddresses: [],
      moreAddresses: 0,
      aliases: [],
      phones: [],
      morePhones: 0,
      emails: [],
      relatives: [],
      associates: [],
      detailUrl: null,
    };

    // Name
    const nameMatch = block.match(/<span class="name-given">\s*([\s\S]*?)\s*<\/span>/);
    if (nameMatch) person.name = nameMatch[1].trim();

    // Age
    const ageMatch = block.match(/<span class="age">(\d+)<\/span>/);
    if (ageMatch) person.age = ageMatch[1];

    // Deceased
    if (/deceased/i.test(block)) person.deceased = true;

    // Current address
    const currentAddrMatch = block.match(/<p class="address-current[^"]*"[^>]*>\s*<a[^>]*>([^<]+)<\/a>/);
    if (currentAddrMatch) person.currentAddress = currentAddrMatch[1].trim();

    // Previous addresses
    const prevAddrRegex = /<p class="[^"]*address-previous[^"]*"[^>]*>\s*<a[^>]*>([^<]+)<\/a>/g;
    let addrMatch;
    while ((addrMatch = prevAddrRegex.exec(block)) !== null) {
      person.previousAddresses.push(addrMatch[1].trim());
    }

    // More addresses count
    const moreAddrMatch = block.match(/\[(\d+)\] more\.\.\./);
    if (moreAddrMatch) person.moreAddresses = parseInt(moreAddrMatch[1]);

    // Aliases
    const aliasRegex = /<span class="aka">([^<]+)<\/span>/g;
    let aliasMatch;
    while ((aliasMatch = aliasRegex.exec(block)) !== null) {
      person.aliases.push(aliasMatch[1].trim());
    }

    // Phones with type and carrier from title attribute
    // title="Find other people associated with (315) 573-3358 (Wireless - Cellco Partnership dba Verizon Wireless - NY)"
    const phoneRegex = /<a[^>]*title="[^"]*\((\d{3})\)\s*(\d{3})-(\d{4})\s*\(([^)]+)\)"[^>]*class="phone"[^>]*>\((\d{3})\)\s*(\d{3})-(\d{4})<\/a>/g;
    let phoneMatch;
    while ((phoneMatch = phoneRegex.exec(block)) !== null) {
      const number = `(${phoneMatch[5]}) ${phoneMatch[6]}-${phoneMatch[7]}`;
      const info = phoneMatch[4]; // e.g. "Wireless - Cellco Partnership dba Verizon Wireless - NY"
      const parts = info.split(" - ");
      const type = parts[0]?.trim() || "";
      // Last part may be a 2-letter state code — strip it if so
      const lastPart = parts[parts.length - 1]?.trim() || "";
      const hasStateCode = /^[A-Z]{2}$/.test(lastPart);
      const carrierParts = hasStateCode ? parts.slice(1, -1) : parts.slice(1);
      const carrier = carrierParts.join(" - ").trim() || "";
      person.phones.push({ number, type, carrier });
    }

    // More phones count
    const morePhonesMatch = block.match(/class="more-phones[\s\S]*?\[(\d+)\] more/);
    if (morePhonesMatch) person.morePhones = parseInt(morePhonesMatch[1]);

    // Emails - regex fallback in the block
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const siteDomains = new Set(["cyberbackgroundchecks.com", "example.com"]);
    let emailMatch;
    while ((emailMatch = emailRegex.exec(block)) !== null) {
      const email = emailMatch[0].toLowerCase();
      if (!siteDomains.has(email.split("@")[1]) && !person.emails.includes(email)) {
        person.emails.push(email);
      }
    }

    // Relatives
    const relativeRegex = /<a[^>]*class="relative"[^>]*>([^<]+)<\/a>/g;
    let relMatch;
    while ((relMatch = relativeRegex.exec(block)) !== null) {
      person.relatives.push(relMatch[1].trim());
    }

    // Associates
    const assocRegex = /<a[^>]*class="associate"[^>]*>([^<]+)<\/a>/g;
    let assocMatch;
    while ((assocMatch = assocRegex.exec(block)) !== null) {
      person.associates.push(assocMatch[1].trim());
    }

    // Detail URL
    const detailMatch = block.match(/href="(https:\/\/www\.cyberbackgroundchecks\.com\/detail\/[^"]+)"/);
    if (detailMatch) person.detailUrl = detailMatch[1];

    if (person.name) results.push(person);
  }

  // Also check for emails in JSON-LD if present
  const jsonLdMatches = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  for (const jmatch of jsonLdMatches) {
    try {
      const data = JSON.parse(jmatch[1]);
      const items = Array.isArray(data) ? data : [data];
      for (const item of items) {
        if (item.email) {
          const vals = Array.isArray(item.email) ? item.email : [item.email];
          // Add to first result if exists
          if (results.length > 0) {
            for (const e of vals) {
              const el = e.toLowerCase();
              if (!results[0].emails.includes(el)) results[0].emails.push(el);
            }
          }
        }
      }
    } catch {}
  }

  return results;
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

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { url, apiKey } = await req.json();

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

    // Build scrape.do API URL with super=true and geoCode=us (NO render)
    const params = new URLSearchParams({
      token: apiKey,
      url: url,
      super: "true",
      geoCode: "us",
    });

    const scrapeUrl = `https://api.scrape.do/?${params.toString()}`;
    console.log("Scraping:", url);

    const response = await fetch(scrapeUrl, { signal: AbortSignal.timeout(90000) });
    const html = await response.text();

    if (response.status !== 200) {
      return new Response(
        JSON.stringify({ error: `Scrape failed with status ${response.status}`, status: response.status }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse the listing page HTML
    const people = parseListingPage(html);

    // Count total results from the page
    const totalMatch = html.match(/<strong>(\d+)<\/strong>\s*results? for/);
    const totalResults = totalMatch ? parseInt(totalMatch[1]) : people.length;

    return new Response(
      JSON.stringify({
        status: response.status,
        totalResults,
        people,
      }),
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
