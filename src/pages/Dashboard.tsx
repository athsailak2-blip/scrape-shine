import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Globe,
  Search,
  Loader2,
  Copy,
  ExternalLink,
  Settings,
  Key,
  Eye,
  EyeOff,
  Upload,
  FileSpreadsheet,
  X,
  CheckCircle2,
  XCircle,
  Download,
} from "lucide-react";

type ScrapeResult = {
  url: string;
  status: number;
  content: string;
  scrapedAt: string;
};

type BulkItem = {
  url: string;
  status: "pending" | "scraping" | "done" | "error";
  result?: ScrapeResult;
  error?: string;
};

const Dashboard = () => {
  const [url, setUrl] = useState("");
  const [format, setFormat] = useState("text");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ScrapeResult | null>(null);
  const [history, setHistory] = useState<ScrapeResult[]>([]);
  const [apiKey, setApiKey] = useState("");
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [savingKey, setSavingKey] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Bulk scraping state
  const [bulkItems, setBulkItems] = useState<BulkItem[]>([]);
  const [bulkRunning, setBulkRunning] = useState(false);
  const [bulkFormat, setBulkFormat] = useState("text");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef(false);

  const { toast } = useToast();

  useEffect(() => {
    loadApiKey();
  }, []);

  const loadApiKey = async () => {
    const { data } = await supabase
      .from("user_api_keys")
      .select("api_key")
      .maybeSingle();
    if (data?.api_key) {
      setApiKey(data.api_key);
      setApiKeyInput(data.api_key);
    }
  };

  const saveApiKey = async () => {
    if (!apiKeyInput.trim()) {
      toast({ title: "API key is required", variant: "destructive" });
      return;
    }
    setSavingKey(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("user_api_keys")
        .upsert(
          { user_id: user.id, api_key: apiKeyInput.trim(), updated_at: new Date().toISOString() },
          { onConflict: "user_id" }
        );
      if (error) throw error;
      setApiKey(apiKeyInput.trim());
      setSettingsOpen(false);
      toast({ title: "API key saved" });
    } catch (error: any) {
      toast({ title: "Failed to save API key", description: error.message, variant: "destructive" });
    } finally {
      setSavingKey(false);
    }
  };

  const scrapeUrl = async (targetUrl: string, targetFormat: string): Promise<ScrapeResult> => {
    const { data, error } = await supabase.functions.invoke("scrape", {
      body: { url: targetUrl, format: targetFormat, apiKey },
    });
    if (error) throw error;
    return {
      url: targetUrl,
      status: data.status || 200,
      content: typeof data.content === "string" ? data.content : JSON.stringify(data.content, null, 2),
      scrapedAt: new Date().toISOString(),
    };
  };

  const handleScrape = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) return;

    if (!apiKey) {
      setSettingsOpen(true);
      toast({ title: "API key required", description: "Please add your scrape.do API key first.", variant: "destructive" });
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const scrapeResult = await scrapeUrl(url, format);
      setResult(scrapeResult);
      setHistory((prev) => [scrapeResult, ...prev].slice(0, 20));
      toast({ title: "Scrape complete", description: `Successfully scraped ${url}` });
    } catch (error: any) {
      toast({ title: "Scrape failed", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split(/\r?\n/).filter(Boolean);

      // Parse URLs: support header row, single column or multi-column (take first URL-like column)
      const urls: string[] = [];
      for (const line of lines) {
        const cols = line.split(",").map((c) => c.trim().replace(/^["']|["']$/g, ""));
        const urlCol = cols.find((c) => c.startsWith("http://") || c.startsWith("https://"));
        if (urlCol) urls.push(urlCol);
      }

      if (urls.length === 0) {
        toast({ title: "No URLs found", description: "CSV must contain URLs starting with http:// or https://", variant: "destructive" });
        return;
      }

      if (urls.length > 500) {
        toast({ title: "Too many URLs", description: "Maximum 500 URLs per batch.", variant: "destructive" });
        return;
      }

      setBulkItems(urls.map((u) => ({ url: u, status: "pending" })));
      toast({ title: `${urls.length} URLs loaded`, description: "Ready to scrape." });
    };
    reader.readAsText(file);
    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const runBulkScrape = async () => {
    if (!apiKey) {
      setSettingsOpen(true);
      toast({ title: "API key required", description: "Please add your scrape.do API key first.", variant: "destructive" });
      return;
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      toast({ title: "Not authenticated", variant: "destructive" });
      return;
    }

    setBulkRunning(true);
    abortRef.current = false;

    for (let i = 0; i < bulkItems.length; i++) {
      if (abortRef.current) break;
      if (bulkItems[i].status === "done") continue;

      setBulkItems((prev) =>
        prev.map((item, idx) => (idx === i ? { ...item, status: "scraping" } : item))
      );

      try {
        const result = await scrapeUrl(bulkItems[i].url, bulkFormat);
        setBulkItems((prev) =>
          prev.map((item, idx) => (idx === i ? { ...item, status: "done", result } : item))
        );
        setHistory((prev) => [result, ...prev].slice(0, 50));
      } catch (error: any) {
        setBulkItems((prev) =>
          prev.map((item, idx) =>
            idx === i ? { ...item, status: "error", error: error.message } : item
          )
        );
      }
    }

    setBulkRunning(false);
    toast({ title: "Bulk scrape complete" });
  };

  const stopBulkScrape = () => {
    abortRef.current = true;
  };

  const clearBulk = () => {
    setBulkItems([]);
  };

  const exportBulkResults = () => {
    const completed = bulkItems.filter((i) => i.status === "done" && i.result);
    if (completed.length === 0) {
      toast({ title: "No results to export", variant: "destructive" });
      return;
    }

    const csvRows = ["url,status,content"];
    for (const item of completed) {
      const escaped = item.result!.content.replace(/"/g, '""').substring(0, 10000);
      csvRows.push(`"${item.url}",${item.result!.status},"${escaped}"`);
    }

    const blob = new Blob([csvRows.join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `scrape-results-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/auth";
  };

  const copyResult = () => {
    if (result) {
      navigator.clipboard.writeText(result.content);
      toast({ title: "Copied to clipboard" });
    }
  };

  const maskedKey = apiKey
    ? `${apiKey.slice(0, 6)}${"•".repeat(Math.max(0, apiKey.length - 10))}${apiKey.slice(-4)}`
    : "";

  const bulkDone = bulkItems.filter((i) => i.status === "done").length;
  const bulkError = bulkItems.filter((i) => i.status === "error").length;
  const bulkTotal = bulkItems.length;
  const bulkProgress = bulkTotal > 0 ? ((bulkDone + bulkError) / bulkTotal) * 100 : 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container flex items-center justify-between h-14 px-4">
          <div className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" />
            <span className="font-bold font-heading">ScrapeLab</span>
          </div>
          <div className="flex items-center gap-2">
            <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-1.5">
                  <Settings className="h-4 w-4" />
                  <span className="hidden sm:inline">Settings</span>
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle className="font-heading">API Key Settings</DialogTitle>
                  <DialogDescription>
                    Enter your scrape.do API key. Get one at{" "}
                    <a href="https://scrape.do" target="_blank" rel="noopener noreferrer" className="text-primary underline">
                      scrape.do
                    </a>
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 pt-2">
                  <div className="relative">
                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      value={apiKeyInput}
                      onChange={(e) => setApiKeyInput(e.target.value)}
                      placeholder="Enter your scrape.do API key"
                      type={showKey ? "text" : "password"}
                      className="pl-10 pr-10 font-mono text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowKey(!showKey)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <Button onClick={saveApiKey} disabled={savingKey} className="w-full" variant="hero">
                    {savingKey ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save API Key"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              Sign out
            </Button>
          </div>
        </div>
      </header>

      <main className="container px-4 py-8 max-w-5xl">
        {/* API Key Banner */}
        {!apiKey && (
          <div className="mb-6 bg-primary/5 border border-primary/20 rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Key className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-medium">API key required</p>
                <p className="text-xs text-muted-foreground">Add your scrape.do API key to start scraping.</p>
              </div>
            </div>
            <Button variant="hero" size="sm" onClick={() => setSettingsOpen(true)}>
              Add Key
            </Button>
          </div>
        )}

        {apiKey && (
          <div className="mb-6 flex items-center gap-2 text-xs text-muted-foreground">
            <Key className="h-3.5 w-3.5" />
            <span className="font-mono">{maskedKey}</span>
          </div>
        )}

        {/* Scrape Tabs */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold font-heading mb-2">Web Scraper</h1>
          <p className="text-muted-foreground mb-6">
            Scrape a single URL or upload a CSV for bulk scraping.
          </p>

          <Tabs defaultValue="single" className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="single" className="gap-2">
                <Search className="h-4 w-4" />
                Single URL
              </TabsTrigger>
              <TabsTrigger value="bulk" className="gap-2">
                <FileSpreadsheet className="h-4 w-4" />
                Bulk CSV
              </TabsTrigger>
            </TabsList>

            {/* Single URL Tab */}
            <TabsContent value="single">
              <form onSubmit={handleScrape} className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://example.com"
                    className="pl-10"
                    type="url"
                    required
                  />
                </div>
                <Select value={format} onValueChange={setFormat}>
                  <SelectTrigger className="w-full sm:w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="text">Text</SelectItem>
                    <SelectItem value="html">HTML</SelectItem>
                    <SelectItem value="json">JSON</SelectItem>
                  </SelectContent>
                </Select>
                <Button type="submit" variant="hero" disabled={loading} className="sm:w-auto">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Scrape"}
                </Button>
              </form>
            </TabsContent>

            {/* Bulk CSV Tab */}
            <TabsContent value="bulk">
              <div className="space-y-4">
                {/* Upload area */}
                {bulkItems.length === 0 && (
                  <label
                    htmlFor="csv-upload"
                    className="flex flex-col items-center justify-center gap-3 border-2 border-dashed border-border rounded-xl p-10 cursor-pointer hover:border-primary/40 transition-colors"
                  >
                    <Upload className="h-8 w-8 text-muted-foreground" />
                    <div className="text-center">
                      <p className="text-sm font-medium">Upload CSV file</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        One URL per row, or a column with URLs. Max 500 URLs.
                      </p>
                    </div>
                    <input
                      id="csv-upload"
                      ref={fileInputRef}
                      type="file"
                      accept=".csv,.txt"
                      onChange={handleCsvUpload}
                      className="hidden"
                    />
                  </label>
                )}

                {/* Bulk items loaded */}
                {bulkItems.length > 0 && (
                  <div className="space-y-4">
                    {/* Controls */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                      <Select value={bulkFormat} onValueChange={setBulkFormat}>
                        <SelectTrigger className="w-full sm:w-[140px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="text">Text</SelectItem>
                          <SelectItem value="html">HTML</SelectItem>
                          <SelectItem value="json">JSON</SelectItem>
                        </SelectContent>
                      </Select>

                      {!bulkRunning ? (
                        <div className="flex gap-2">
                          <Button variant="hero" onClick={runBulkScrape} className="gap-2">
                            <Globe className="h-4 w-4" />
                            Scrape {bulkTotal} URLs
                          </Button>
                          <Button variant="ghost" size="icon" onClick={clearBulk}>
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <Button variant="destructive" onClick={stopBulkScrape} className="gap-2">
                          <X className="h-4 w-4" />
                          Stop
                        </Button>
                      )}

                      {bulkDone > 0 && !bulkRunning && (
                        <Button variant="outline" onClick={exportBulkResults} className="gap-2 ml-auto">
                          <Download className="h-4 w-4" />
                          Export CSV
                        </Button>
                      )}
                    </div>

                    {/* Progress */}
                    {(bulkRunning || bulkDone + bulkError > 0) && (
                      <div className="space-y-2">
                        <Progress value={bulkProgress} className="h-2" />
                        <div className="flex gap-4 text-xs text-muted-foreground">
                          <span>{bulkDone} done</span>
                          {bulkError > 0 && <span className="text-destructive">{bulkError} failed</span>}
                          <span>{bulkTotal - bulkDone - bulkError} remaining</span>
                        </div>
                      </div>
                    )}

                    {/* URL list */}
                    <div className="bg-card border border-border rounded-xl overflow-hidden max-h-[400px] overflow-y-auto">
                      {bulkItems.map((item, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-3 px-4 py-2.5 border-b border-border last:border-b-0 hover:bg-muted/30 transition-colors"
                        >
                          {item.status === "pending" && (
                            <span className="h-4 w-4 rounded-full border border-border flex-shrink-0" />
                          )}
                          {item.status === "scraping" && (
                            <Loader2 className="h-4 w-4 text-primary animate-spin flex-shrink-0" />
                          )}
                          {item.status === "done" && (
                            <CheckCircle2 className="h-4 w-4 text-success flex-shrink-0" />
                          )}
                          {item.status === "error" && (
                            <XCircle className="h-4 w-4 text-destructive flex-shrink-0" />
                          )}
                          <span className="text-sm font-mono truncate flex-1">{item.url}</span>
                          {item.status === "done" && item.result && (
                            <button
                              onClick={() => setResult(item.result!)}
                              className="text-xs text-primary hover:underline flex-shrink-0"
                            >
                              View
                            </button>
                          )}
                          {item.status === "error" && (
                            <span className="text-xs text-destructive truncate max-w-[200px] flex-shrink-0">
                              {item.error}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Result */}
        {result && (
          <div className="mb-8 bg-card border border-border rounded-xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-primary/10 text-primary text-xs font-mono font-medium">
                  {result.status}
                </span>
                <span className="text-sm text-muted-foreground font-mono truncate max-w-xs">
                  {result.url}
                </span>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" size="icon" onClick={copyResult}>
                  <Copy className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" asChild>
                  <a href={result.url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
              </div>
            </div>
            <pre className="p-4 text-sm font-mono text-muted-foreground overflow-auto max-h-[500px] whitespace-pre-wrap">
              {result.content}
            </pre>
          </div>
        )}

        {/* History */}
        {history.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold font-heading mb-4">Recent Scrapes</h2>
            <div className="space-y-2">
              {history.map((item, i) => (
                <button
                  key={i}
                  onClick={() => setResult(item)}
                  className="w-full text-left bg-card border border-border rounded-lg p-3 hover:border-primary/30 transition-colors flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-primary/10 text-primary text-xs font-mono font-medium">
                      {item.status}
                    </span>
                    <span className="text-sm font-mono truncate max-w-sm">
                      {item.url}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(item.scrapedAt).toLocaleTimeString()}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
