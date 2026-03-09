import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BATCH_SIZE = 10;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
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
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { jobId } = await req.json();
    if (!jobId) {
      return new Response(JSON.stringify({ error: "jobId required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get job
    const { data: job, error: jobError } = await supabase
      .from("bulk_jobs").select("*").eq("id", jobId).single();
    if (jobError || !job) {
      return new Response(JSON.stringify({ error: "Job not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (job.status === "cancelled" || job.status === "complete") {
      return new Response(JSON.stringify({ status: job.status, message: "Job already finished" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get user's API key
    const { data: keyData } = await supabase
      .from("user_api_keys").select("api_key").eq("user_id", user.id).maybeSingle();
    if (!keyData?.api_key) {
      return new Response(JSON.stringify({ error: "No API key configured" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const apiKey = keyData.api_key;

    // Mark job as processing
    await supabase.from("bulk_jobs").update({ status: "processing", updated_at: new Date().toISOString() }).eq("id", jobId);

    // Get pending items (batch)
    const { data: pendingItems } = await supabase
      .from("bulk_job_items").select("*").eq("job_id", jobId).eq("status", "pending")
      .order("created_at", { ascending: true }).limit(BATCH_SIZE);

    if (!pendingItems || pendingItems.length === 0) {
      // Check if there are any items still processing or if we're done
      const { data: remaining } = await supabase
        .from("bulk_job_items").select("id").eq("job_id", jobId).in("status", ["pending", "processing"]).limit(1);

      if (!remaining || remaining.length === 0) {
        await supabase.from("bulk_jobs").update({ status: "complete", updated_at: new Date().toISOString() }).eq("id", jobId);
      }

      return new Response(JSON.stringify({ status: "complete", processed: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let processed = 0;
    let creditsExhausted = false;

    for (const item of pendingItems) {
      // Mark as processing
      await supabase.from("bulk_job_items").update({ status: "processing", updated_at: new Date().toISOString() }).eq("id", item.id);

      const first = item.first_name.trim().toLowerCase();
      const last = item.last_name.trim().toLowerCase();
      const state = item.state.trim().toLowerCase();
      const city = item.city.trim().toLowerCase().replace(/\s+/g, "-");
      const targetUrl = `https://www.cyberbackgroundchecks.com/people/${first}-${last}/${state}/${city}`;

      try {
        const scrapeResponse = await fetch(
          `${Deno.env.get("SUPABASE_URL")}/functions/v1/scrape`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: authHeader,
            },
            body: JSON.stringify({ url: targetUrl, apiKey }),
          }
        );

        const scrapeData = await scrapeResponse.json();

        if (!scrapeResponse.ok || scrapeData.error) {
          const errMsg = String(scrapeData?.error || `Scrape failed with status ${scrapeResponse.status}`);
          const status = Number(scrapeData?.status || scrapeResponse.status || 0);

          if (status === 402 || errMsg.toLowerCase().includes("credit")) {
            creditsExhausted = true;
            await supabase.from("bulk_job_items").update({
              status: "credits_exhausted", error: "Credits exhausted", updated_at: new Date().toISOString(),
            }).eq("id", item.id);
            await supabase.from("bulk_job_items").update({
              status: "not_processed", error: "Credits exhausted before processing", updated_at: new Date().toISOString(),
            }).eq("job_id", jobId).eq("status", "pending");
            break;
          }

          throw new Error(errMsg);
        }

        const result = {
          url: targetUrl,
          totalResults: scrapeData.totalResults || 0,
          people: scrapeData.people || [],
        };

        // Save to search_results only if no duplicate in past 24h
        if (result.people.length > 0) {
          const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
          const { data: existing } = await supabase
            .from("search_results")
            .select("id")
            .eq("user_id", user.id)
            .ilike("search_first", item.first_name.trim())
            .ilike("search_last", item.last_name.trim())
            .ilike("search_city", item.city.trim())
            .ilike("search_state", item.state.trim())
            .gte("created_at", twentyFourHoursAgo)
            .limit(1)
            .maybeSingle();

          if (!existing) {
            await supabase.from("search_results").insert({
              user_id: user.id,
              search_first: item.first_name,
              search_last: item.last_name,
              search_city: item.city,
              search_state: item.state,
              search_zipcode: item.zipcode || "",
              search_url: targetUrl,
              total_results: result.totalResults,
              people: result.people,
              source: "bulk",
            });
          }
        }

        await supabase.from("bulk_job_items").update({
          status: "done", result, updated_at: new Date().toISOString(),
        }).eq("id", item.id);

        // Update job counters
        await supabase.from("bulk_jobs").update({
          completed_items: (job.completed_items || 0) + processed + 1,
          updated_at: new Date().toISOString(),
        }).eq("id", jobId);

        processed++;

        // Delay between requests
        if (processed < pendingItems.length) {
          await new Promise(r => setTimeout(r, 3000));
        }
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        await supabase.from("bulk_job_items").update({
          status: "error", error: errMsg, updated_at: new Date().toISOString(),
        }).eq("id", item.id);

        await supabase.from("bulk_jobs").update({
          failed_items: (job.failed_items || 0) + 1,
          updated_at: new Date().toISOString(),
        }).eq("id", jobId);

        processed++;
      }
    }

    // Check if more items remain
    const { data: remaining } = await supabase
      .from("bulk_job_items").select("id").eq("job_id", jobId).eq("status", "pending").limit(1);

    const hasMore = remaining && remaining.length > 0 && !creditsExhausted;

    if (!hasMore) {
      const finalStatus = creditsExhausted ? "failed" : "complete";
      await supabase.from("bulk_jobs").update({ status: finalStatus, updated_at: new Date().toISOString() }).eq("id", jobId);
    }

    return new Response(JSON.stringify({
      processed,
      hasMore,
      creditsExhausted,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Bulk process error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
