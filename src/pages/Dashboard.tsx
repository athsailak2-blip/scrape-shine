import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Globe, Search, Loader2, Copy, ExternalLink } from "lucide-react";

type ScrapeResult = {
  url: string;
  status: number;
  content: string;
  scrapedAt: string;
};

const Dashboard = () => {
  const [url, setUrl] = useState("");
  const [format, setFormat] = useState("text");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ScrapeResult | null>(null);
  const [history, setHistory] = useState<ScrapeResult[]>([]);
  const { toast } = useToast();

  const handleScrape = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) return;

    setLoading(true);
    setResult(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const { data, error } = await supabase.functions.invoke("scrape", {
        body: { url, format },
      });

      if (error) throw error;

      const scrapeResult: ScrapeResult = {
        url,
        status: data.status || 200,
        content: typeof data.content === "string" ? data.content : JSON.stringify(data.content, null, 2),
        scrapedAt: new Date().toISOString(),
      };

      setResult(scrapeResult);
      setHistory((prev) => [scrapeResult, ...prev].slice(0, 20));
      toast({ title: "Scrape complete", description: `Successfully scraped ${url}` });
    } catch (error: any) {
      toast({ title: "Scrape failed", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
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

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container flex items-center justify-between h-14 px-4">
          <div className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" />
            <span className="font-bold font-heading">ScrapeLab</span>
          </div>
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            Sign out
          </Button>
        </div>
      </header>

      <main className="container px-4 py-8 max-w-5xl">
        {/* Scrape Form */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold font-heading mb-2">Web Scraper</h1>
          <p className="text-muted-foreground mb-6">
            Enter a URL to scrape its content. Powered by scrape.do.
          </p>

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
