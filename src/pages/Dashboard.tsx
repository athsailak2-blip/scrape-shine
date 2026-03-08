import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Key, User, FileSpreadsheet, ShieldCheck } from "lucide-react";

import type { PersonInput, PersonResult, ScrapeResult, BulkItem } from "@/components/dashboard/types";
import { buildUrl, normalizeState, filterByZip } from "@/components/dashboard/utils";
import PersonCard from "@/components/dashboard/PersonCard";
import SettingsDialog from "@/components/dashboard/SettingsDialog";
import SearchForm from "@/components/dashboard/SearchForm";
import BulkUpload from "@/components/dashboard/BulkUpload";
import SearchHistory from "@/components/dashboard/SearchHistory";

const Dashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [apiKey, setApiKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ScrapeResult | null>(null);
  const [history, setHistory] = useState<ScrapeResult[]>([]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isDisabled, setIsDisabled] = useState(false);

  const [bulkItems, setBulkItems] = useState<BulkItem[]>([]);
  const [bulkRunning, setBulkRunning] = useState(false);
  const abortRef = useRef(false);

  useEffect(() => {
    loadApiKey();
    loadHistory();
    checkRole();
  }, []);

  const checkRole = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: roleData } = await supabase
      .from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
    if (roleData) setIsAdmin(true);
    const { data: profileData } = await supabase
      .from("profiles").select("disabled").eq("id", user.id).maybeSingle();
    if (profileData?.disabled) setIsDisabled(true);
  };

  const loadApiKey = async () => {
    const { data } = await supabase.from("user_api_keys").select("api_key").maybeSingle();
    if (data?.api_key) setApiKey(data.api_key);
  };

  const loadHistory = async () => {
    try {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const { data, error } = await supabase
        .from("search_results").select("*")
        .gte("created_at", sevenDaysAgo.toISOString())
        .order("created_at", { ascending: false }).limit(100);
      if (error) throw error;
      if (data) {
        const mapped: ScrapeResult[] = data.map((row: any) => ({
          url: row.search_url, status: 200, totalResults: row.total_results,
          people: row.people as PersonResult[], scrapedAt: row.created_at,
          person: {
            firstName: row.search_first, lastName: row.search_last,
            city: row.search_city, state: row.search_state, zipcode: row.search_zipcode || "",
          },
        }));
        setHistory(mapped.slice(0, 20));
      }
    } catch (err) {
      console.error("Failed to load history:", err);
    }
  };

  const saveResultToDb = async (scrapeResult: ScrapeResult) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await supabase.from("search_results").insert({
        user_id: user.id,
        search_first: scrapeResult.person.firstName,
        search_last: scrapeResult.person.lastName,
        search_city: scrapeResult.person.city,
        search_state: scrapeResult.person.state,
        search_zipcode: scrapeResult.person.zipcode || "",
        search_url: scrapeResult.url,
        total_results: scrapeResult.totalResults,
        people: scrapeResult.people as any,
        source: "single",
      });
    } catch (err) {
      console.error("Failed to save result:", err);
    }
  };

  const scrapeUrl = async (targetUrl: string, person: PersonInput): Promise<ScrapeResult> => {
    const { data, error } = await supabase.functions.invoke("scrape", {
      body: { url: targetUrl, apiKey },
    });
    if (error) throw error;
    if (data.error) throw new Error(data.error);
    return {
      url: targetUrl, status: data.status || 200,
      totalResults: data.totalResults || 0, people: data.people || [],
      scrapedAt: new Date().toISOString(), person,
    };
  };

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: `${label} copied` });
  };

  const checkCache = async (person: PersonInput): Promise<ScrapeResult | null> => {
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);
    const { data } = await supabase
      .from("search_results").select("*")
      .eq("search_first", person.firstName.trim())
      .eq("search_last", person.lastName.trim())
      .eq("search_city", person.city.trim())
      .eq("search_state", normalizeState(person.state))
      .gte("created_at", twentyFourHoursAgo.toISOString())
      .order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (data) {
      return {
        url: data.search_url, status: 200, totalResults: data.total_results,
        people: data.people as PersonResult[], scrapedAt: data.created_at, person,
      };
    }
    return null;
  };

  const handleSearch = async (person: PersonInput) => {
    if (!person.firstName || !person.lastName || !person.city || !person.state) {
      toast({ title: "All fields required", variant: "destructive" }); return;
    }
    if (!apiKey) { setSettingsOpen(true); toast({ title: "API key required", variant: "destructive" }); return; }
    if (isDisabled) { toast({ title: "Account disabled", description: "Contact admin.", variant: "destructive" }); return; }

    const url = buildUrl(person);
    setLoading(true); setResult(null);

    try {
      await supabase.auth.getSession();

      // Check 24h cache first
      const cached = await checkCache(person);
      if (cached) {
        setResult(cached);
        toast({ title: "Cached result", description: "Showing result from last 24 hours." });
        setLoading(false);
        return;
      }

      const scrapeResult = await scrapeUrl(url, person);
      filterByZip(scrapeResult, person.zipcode);

      // "No results don't count" — don't save if 0 results
      if (scrapeResult.people.length === 0) {
        setResult(scrapeResult);
        toast({ title: "No results found", description: "This search did not count against your credits." });
        setLoading(false);
        return;
      }

      setResult(scrapeResult);
      setHistory((prev) => [scrapeResult, ...prev].slice(0, 20));
      await saveResultToDb(scrapeResult);
      const totalEmails = scrapeResult.people.reduce((sum, p) => sum + p.emails.length, 0);
      toast({ title: "Search complete", description: `Found ${scrapeResult.totalResults} result(s), ${totalEmails} email(s)` });
    } catch (error: any) {
      toast({ title: "Search failed", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const runBulkScrape = async () => {
    if (!apiKey) { setSettingsOpen(true); return; }
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { toast({ title: "Not authenticated", variant: "destructive" }); return; }
    setBulkRunning(true); abortRef.current = false;

    for (let i = 0; i < bulkItems.length; i++) {
      if (abortRef.current) break;
      if (bulkItems[i].status === "done") continue;
      setBulkItems((prev) => prev.map((item, idx) => (idx === i ? { ...item, status: "scraping" } : item)));
      try {
        const result = await scrapeUrl(bulkItems[i].url, bulkItems[i].person);
        filterByZip(result, bulkItems[i].person.zipcode);
        // Only save if has results
        if (result.people.length > 0) {
          await saveResultToDb({ ...result, person: bulkItems[i].person });
        }
        setBulkItems((prev) => prev.map((item, idx) => (idx === i ? { ...item, status: "done", result } : item)));
        setHistory((prev) => [result, ...prev].slice(0, 50));
        if (i < bulkItems.length - 1) await new Promise(r => setTimeout(r, 3000));
      } catch (error: any) {
        // Check for credits exhaustion
        const msg = error.message || "";
        if (msg.includes("402") || msg.toLowerCase().includes("credit")) {
          toast({ title: "Credits exhausted", description: "Stopping bulk search. Partial results saved.", variant: "destructive" });
          setBulkItems((prev) => prev.map((item, idx) =>
            idx === i ? { ...item, status: "error", error: "Credits exhausted" } :
            idx > i && item.status === "pending" ? { ...item, status: "error", error: "Not processed - credits exhausted" } : item
          ));
          break;
        }
        setBulkItems((prev) => prev.map((item, idx) => idx === i ? { ...item, status: "error", error: msg } : item));
      }
    }

    // Retry failed rows (except credits exhaustion) once
    const failedIndices = bulkItems
      .map((item, idx) => ({ item, idx }))
      .filter(({ item }) => item.status === "error" && !item.error?.includes("credit") && !item.error?.includes("Not processed"));

    for (const { idx } of failedIndices) {
      if (abortRef.current) break;
      setBulkItems((prev) => prev.map((item, i) => (i === idx ? { ...item, status: "scraping", error: undefined } : item)));
      try {
        const result = await scrapeUrl(bulkItems[idx].url, bulkItems[idx].person);
        filterByZip(result, bulkItems[idx].person.zipcode);
        if (result.people.length > 0) {
          await saveResultToDb({ ...result, person: bulkItems[idx].person });
        }
        setBulkItems((prev) => prev.map((item, i) => (i === idx ? { ...item, status: "done", result } : item)));
      } catch (error: any) {
        setBulkItems((prev) => prev.map((item, i) => i === idx ? { ...item, status: "error", error: error.message } : item));
      }
    }

    setBulkRunning(false);
    toast({ title: "Bulk search complete" });
    loadHistory();
  };

  const exportBulkResults = () => {
    const csvRows = ["search_first,search_last,search_city,search_state,search_zipcode,status,result_name,age,deceased,current_address,emails,phones,phone_types,carriers,relatives"];
    for (const item of bulkItems) {
      const p = item.person;
      const esc = (s: string) => `"${s.replace(/"/g, '""')}"`;
      if (item.status === "done" && item.result && item.result.people.length > 0) {
        for (const r of item.result.people) {
          csvRows.push([
            esc(p.firstName), esc(p.lastName), esc(p.city), esc(p.state), esc(p.zipcode),
            esc("success"),
            esc(r.name), esc(r.age || ""), esc(r.deceased ? "Yes" : "No"),
            esc(r.currentAddress || ""),
            esc(r.emails.join("; ")),
            esc(r.phones.map(ph => ph.number).join("; ")),
            esc(r.phones.map(ph => ph.type).join("; ")),
            esc(r.phones.map(ph => ph.carrier).join("; ")),
            esc(r.relatives.join("; ")),
          ].join(","));
        }
      } else {
        const status = item.error?.includes("credit") ? "credits_exhausted" :
          item.error?.includes("Not processed") ? "not_processed" :
          item.status === "error" ? "failed" : "not_processed";
        csvRows.push([
          esc(p.firstName), esc(p.lastName), esc(p.city), esc(p.state), esc(p.zipcode),
          esc(status), "", "", "", "", "", "", "", "", "",
        ].join(","));
      }
    }
    const blob = new Blob([csvRows.join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `ownertrace-export-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/auth";
  };

  const maskedKey = apiKey ? `${apiKey.slice(0, 6)}${"•".repeat(Math.max(0, apiKey.length - 10))}${apiKey.slice(-4)}` : "";

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container flex items-center justify-between h-14 px-4">
          <div className="flex items-center gap-2">
            <Search className="h-5 w-5 text-primary" />
            <span className="font-bold font-heading">OwnerTrace</span>
          </div>
          <div className="flex items-center gap-2">
            <SettingsDialog
              open={settingsOpen}
              onOpenChange={setSettingsOpen}
              apiKey={apiKey}
              onApiKeySaved={setApiKey}
              disabled={bulkRunning}
              disabledReason={bulkRunning ? "Cannot change API key while bulk search is running" : undefined}
            />
            {isAdmin && (
              <Button variant="ghost" size="sm" onClick={() => navigate("/admin")} className="gap-1.5">
                <ShieldCheck className="h-4 w-4" /><span className="hidden sm:inline">Admin</span>
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={handleLogout}>Sign out</Button>
          </div>
        </div>
      </header>

      <main className="container px-4 py-8 max-w-5xl">
        {!apiKey && (
          <div className="mb-6 bg-primary/5 border border-primary/20 rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Key className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-medium">API key required</p>
                <p className="text-xs text-muted-foreground">Add your scrape.do API key to start searching.</p>
              </div>
            </div>
            <Button variant="hero" size="sm" onClick={() => setSettingsOpen(true)}>Add Key</Button>
          </div>
        )}

        {apiKey && (
          <div className="mb-6 flex items-center gap-2 text-xs text-muted-foreground">
            <Key className="h-3.5 w-3.5" />
            <span className="font-mono">{maskedKey}</span>
            <span className="text-primary/60">• Validated ✓</span>
          </div>
        )}

        <div className="mb-8">
          <h1 className="text-3xl font-bold font-heading mb-2">People Search</h1>
          <p className="text-muted-foreground mb-6">Find emails, phones, addresses, relatives and more from public records.</p>

          <Tabs defaultValue="single" className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="single" className="gap-2"><User className="h-4 w-4" />Single</TabsTrigger>
              <TabsTrigger value="bulk" className="gap-2"><FileSpreadsheet className="h-4 w-4" />Bulk CSV</TabsTrigger>
            </TabsList>

            <TabsContent value="single">
              <SearchForm onSearch={handleSearch} loading={loading} />
            </TabsContent>

            <TabsContent value="bulk">
              <BulkUpload
                bulkItems={bulkItems}
                setBulkItems={setBulkItems}
                bulkRunning={bulkRunning}
                onRunBulk={runBulkScrape}
                onStopBulk={() => { abortRef.current = true; }}
                onViewResult={setResult}
                onExport={exportBulkResults}
              />
            </TabsContent>
          </Tabs>
        </div>

        {/* Results */}
        {result && (
          <div className="mb-8 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold font-heading">
                {result.totalResults} result{result.totalResults !== 1 ? "s" : ""} for {result.person.firstName} {result.person.lastName}
              </h2>
              <span className="text-xs text-muted-foreground">{result.person.city}, {result.person.state.toUpperCase()}</span>
            </div>

            {result.people.length === 0 && (
              <div className="bg-card border border-border rounded-xl p-8 text-center text-muted-foreground">
                No results found. The page may have returned empty or the person wasn't found.
              </div>
            )}

            {result.people.map((person, i) => (
              <PersonCard key={i} person={person} onCopy={handleCopy} />
            ))}
          </div>
        )}

        <SearchHistory history={history} onSelect={setResult} />
      </main>
    </div>
  );
};

export default Dashboard;
