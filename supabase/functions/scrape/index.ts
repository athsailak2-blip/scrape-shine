import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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
        JSON.stringify({ error: `Scrape failed with status ${response.status}`, status: response.status, html }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Extract data from JSON-LD
    const jsonLdMatches = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
    const emails = new Set<string>();
    const phones: Array<{ number: string; type?: string; carrier?: string }> = [];
    let age: string | null = null;
    let deceased = false;
    const aliases: string[] = [];
    const addresses: Array<{ street?: string; city?: string; state?: string; zip?: string }> = [];

    for (const match of jsonLdMatches) {
      try {
        const data = JSON.parse(match[1]);
        const items = Array.isArray(data) ? data : [data];
        for (const item of items) {
          // Emails
          if (item.email) {
            const vals = Array.isArray(item.email) ? item.email : [item.email];
            vals.forEach((e: string) => emails.add(e.toLowerCase()));
          }
          // Contact points
          if (item.contactPoint) {
            const contacts = Array.isArray(item.contactPoint) ? item.contactPoint : [item.contactPoint];
            for (const c of contacts) {
              if (c.email) {
                const cEmails = Array.isArray(c.email) ? c.email : [c.email];
                cEmails.forEach((e: string) => emails.add(e.toLowerCase()));
              }
              if (c.telephone) {
                phones.push({ number: c.telephone, type: c.contactType || undefined });
              }
            }
          }
          // Telephone directly
          if (item.telephone) {
            const tels = Array.isArray(item.telephone) ? item.telephone : [item.telephone];
            tels.forEach((t: string) => {
              if (!phones.find(p => p.number === t)) phones.push({ number: t });
            });
          }
          // Age
          if (item.age) age = String(item.age);
          if (item.birthDate && !age) {
            try {
              const birth = new Date(item.birthDate);
              const now = new Date();
              age = String(Math.floor((now.getTime() - birth.getTime()) / (365.25 * 24 * 60 * 60 * 1000)));
            } catch {}
          }
          // Aliases
          if (item.alternateName) {
            const altNames = Array.isArray(item.alternateName) ? item.alternateName : [item.alternateName];
            altNames.forEach((n: string) => { if (!aliases.includes(n)) aliases.push(n); });
          }
          // Addresses
          if (item.address) {
            const addrs = Array.isArray(item.address) ? item.address : [item.address];
            for (const addr of addrs) {
              addresses.push({
                street: addr.streetAddress,
                city: addr.addressLocality,
                state: addr.addressRegion,
                zip: addr.postalCode,
              });
            }
          }
        }
      } catch {}
    }

    // Regex fallback for emails
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const siteDomains = new Set(["cyberbackgroundchecks.com", "example.com"]);
    for (const match of html.matchAll(emailRegex)) {
      const email = match[0].toLowerCase();
      const domain = email.split("@")[1];
      if (!siteDomains.has(domain)) emails.add(email);
    }

    // Extract phone type/carrier from HTML (listing page shows first 3)
    const phoneBlockRegex = /class="[^"]*phone[^"]*"[^>]*>[\s\S]*?<\/div>/gi;
    const phoneBlocks = html.match(phoneBlockRegex) || [];
    // Try to extract type info near phone numbers
    for (const phone of phones) {
      const cleanNum = phone.number.replace(/\D/g, "");
      const phoneRegion = html.indexOf(cleanNum.slice(-4));
      if (phoneRegion > -1) {
        const context = html.substring(Math.max(0, phoneRegion - 200), phoneRegion + 200);
        if (/wireless/i.test(context)) phone.type = "Wireless";
        else if (/landline/i.test(context)) phone.type = "Landline";
        else if (/voip/i.test(context)) phone.type = "VoIP";
        const carrierMatch = context.match(/carrier[:\s]*([^<,]+)/i);
        if (carrierMatch) phone.carrier = carrierMatch[1].trim();
      }
    }

    // Check deceased
    if (/deceased/i.test(html)) deceased = true;

    // Extract age from HTML if not found in JSON-LD
    if (!age) {
      const ageMatch = html.match(/(?:age|Age)[:\s]*(\d{1,3})/);
      if (ageMatch) age = ageMatch[1];
    }

    return new Response(
      JSON.stringify({
        status: response.status,
        emails: [...emails],
        phones,
        age,
        deceased,
        aliases,
        addresses: addresses.slice(0, 10),
        totalAddresses: addresses.length,
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
