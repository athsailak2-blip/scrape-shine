import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Globe,
  Loader2,
  Copy,
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
  User,
  Mail,
  Phone,
  MapPin,
  AlertTriangle,
  Users,
  ExternalLink,
} from "lucide-react";

type PhoneInfo = { number: string; type: string; carrier: string };

type PersonResult = {
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

type ScrapeResult = {
  url: string;
  status: number;
  totalResults: number;
  people: PersonResult[];
  scrapedAt: string;
  person: PersonInput;
};

type PersonInput = {
  firstName: string;
  lastName: string;
  city: string;
  state: string;
  zipcode: string;
};

type BulkItem = {
  person: PersonInput;
  url: string;
  status: "pending" | "scraping" | "done" | "error";
  result?: ScrapeResult;
  error?: string;
};

const US_STATES: Record<string, string> = {
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

function normalizeState(input: string): string {
  const lower = input.trim().toLowerCase();
  if (lower.length === 2 && Object.values(US_STATES).includes(lower)) return lower;
  if (US_STATES[lower]) return US_STATES[lower];
  return lower;
}

function buildUrl(person: PersonInput): string {
  const first = person.firstName.trim().toLowerCase();
  const last = person.lastName.trim().toLowerCase();
  const state = normalizeState(person.state);
  const city = person.city.trim().toLowerCase().replace(/\s+/g, "-");
  return `https://www.cyberbackgroundchecks.com/people/${first}-${last}/${state}/${city}`;
}

const PersonCard = ({ person, onCopy }: { person: PersonResult; onCopy: (text: string, label: string) => void }) => (
  <div className="bg-card border border-border rounded-xl overflow-hidden">
    <div className="p-4 border-b border-border">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <User className="h-5 w-5 text-primary" />
          <div>
            <h3 className="font-semibold font-heading text-lg">{person.name}</h3>
            <p className="text-xs text-muted-foreground">
              {person.age && `Age ${person.age}`}
              {person.deceased && (
                <span className="text-destructive ml-2 inline-flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" /> Deceased
                </span>
              )}
            </p>
          </div>
        </div>
        {person.detailUrl && (
          <a href={person.detailUrl} target="_blank" rel="noopener noreferrer"
            className="text-xs text-primary hover:underline inline-flex items-center gap-1">
            Detail Page <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>
    </div>

    <div className="p-4 space-y-4">
      {/* Emails */}
      {person.emails.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Mail className="h-4 w-4 text-primary" /> Emails ({person.emails.length})
            </div>
            <Button variant="ghost" size="sm" onClick={() => onCopy(person.emails.join("\n"), "Emails")} className="h-7 text-xs gap-1">
              <Copy className="h-3 w-3" /> Copy
            </Button>
          </div>
          {person.emails.map((email, i) => (
            <div key={i} className="font-mono text-sm bg-muted/50 rounded-lg px-3 py-2 mb-1 flex items-center justify-between">
              <span>{email}</span>
              <button onClick={() => onCopy(email, "Email")} className="text-muted-foreground hover:text-foreground">
                <Copy className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Phones */}
      {person.phones.length > 0 && (
        <div>
          <div className="flex items-center gap-2 text-sm font-medium mb-2">
            <Phone className="h-4 w-4 text-primary" />
            Phones ({person.phones.length})
          </div>
          <Table>
            <TableHeader>
              <TableRow><TableHead>Number</TableHead><TableHead>Type</TableHead><TableHead>Carrier</TableHead></TableRow>
            </TableHeader>
            <TableBody>
              {person.phones.map((ph, i) => (
                <TableRow key={i}>
                  <TableCell className="font-mono">{ph.number}</TableCell>
                  <TableCell>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      ph.type === "Wireless" ? "bg-primary/10 text-primary" :
                      ph.type === "Voip" ? "bg-blue-500/10 text-blue-400" :
                      ph.type === "Landline" ? "bg-orange-500/10 text-orange-400" : "bg-muted text-muted-foreground"
                    }`}>{ph.type || "—"}</span>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{ph.carrier || "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

    </div>
  </div>
);

const Dashboard = () => {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zipcode, setZipcode] = useState("");

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ScrapeResult | null>(null);
  const [history, setHistory] = useState<ScrapeResult[]>([]);
  const [apiKey, setApiKey] = useState("");
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [savingKey, setSavingKey] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const [bulkItems, setBulkItems] = useState<BulkItem[]>([]);
  const [bulkRunning, setBulkRunning] = useState(false);
  const [dbHistory, setDbHistory] = useState<ScrapeResult[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef(false);

  const { toast } = useToast();

  useEffect(() => { loadApiKey(); loadHistory(); }, []);

  const loadApiKey = async () => {
    const { data } = await supabase.from("user_api_keys").select("api_key").maybeSingle();
    if (data?.api_key) { setApiKey(data.api_key); setApiKeyInput(data.api_key); }
  };

  const saveApiKey = async () => {
    if (!apiKeyInput.trim()) { toast({ title: "API key is required", variant: "destructive" }); return; }
    setSavingKey(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase.from("user_api_keys").upsert(
        { user_id: user.id, api_key: apiKeyInput.trim(), updated_at: new Date().toISOString() },
        { onConflict: "user_id" }
      );
      if (error) throw error;
      setApiKey(apiKeyInput.trim());
      setSettingsOpen(false);
      toast({ title: "API key saved" });
    } catch (error: any) {
      toast({ title: "Failed to save API key", description: error.message, variant: "destructive" });
    } finally { setSavingKey(false); }
  };

  const scrapeUrl = async (targetUrl: string, person: PersonInput): Promise<ScrapeResult> => {
    const { data, error } = await supabase.functions.invoke("scrape", {
      body: { url: targetUrl, apiKey },
    });
    if (error) throw error;
    if (data.error) throw new Error(data.error);
    return {
      url: targetUrl,
      status: data.status || 200,
      totalResults: data.totalResults || 0,
      people: data.people || [],
      scrapedAt: new Date().toISOString(),
      person,
    };
  };

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: `${label} copied` });
  };

  const handleScrape = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName || !lastName || !city || !state) {
      toast({ title: "All fields required", variant: "destructive" }); return;
    }
    if (!apiKey) { setSettingsOpen(true); toast({ title: "API key required", variant: "destructive" }); return; }

    const person: PersonInput = { firstName, lastName, city, state, zipcode };
    const url = buildUrl(person);
    setLoading(true); setResult(null);

    try {
      await supabase.auth.getSession();
      const scrapeResult = await scrapeUrl(url, person);
      
      // Filter by zipcode if provided
      if (person.zipcode.trim()) {
        const zip = person.zipcode.trim().substring(0, 5);
        console.log("Filtering by zip:", zip);
        console.log("People before filter:", scrapeResult.people.map(p => ({
          name: p.name,
          currentAddress: p.currentAddress,
          previousAddresses: p.previousAddresses,
        })));
        scrapeResult.people = scrapeResult.people.filter((p) => {
          const currentAddr = p.currentAddress || "";
          const prevAddrs = p.previousAddresses.join(" ");
          const matches = currentAddr.includes(zip) || prevAddrs.includes(zip);
          console.log(`  ${p.name}: current="${currentAddr}", matches=${matches}`);
          return matches;
        });
        scrapeResult.totalResults = scrapeResult.people.length;
        console.log("People after filter:", scrapeResult.people.length);
      }
      
      setResult(scrapeResult);
      setHistory((prev) => [scrapeResult, ...prev].slice(0, 20));
      const totalEmails = scrapeResult.people.reduce((sum, p) => sum + p.emails.length, 0);
      toast({ title: "Search complete", description: `Found ${scrapeResult.totalResults} result(s), ${totalEmails} email(s)` });
    } catch (error: any) {
      toast({ title: "Search failed", description: error.message, variant: "destructive" });
    } finally { setLoading(false); }
  };

  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split(/\r?\n/).filter(Boolean);
      if (lines.length < 2) { toast({ title: "Invalid CSV", variant: "destructive" }); return; }
      const headerCols = lines[0].split(",").map((c) => c.trim().toLowerCase().replace(/^["']|["']$/g, ""));
      const findCol = (names: string[]) => headerCols.findIndex((h) => names.some((n) => h.includes(n)));
      const firstIdx = findCol(["first", "firstname", "first_name"]);
      const lastIdx = findCol(["last", "lastname", "last_name"]);
      const cityIdx = findCol(["city"]);
      const stateIdx = findCol(["state"]);
      const zipIdx = findCol(["zip", "zipcode", "zip_code", "postal"]);
      if (firstIdx === -1 || lastIdx === -1 || cityIdx === -1 || stateIdx === -1) {
        toast({ title: "Missing columns", description: "Need: first name, last name, city, state.", variant: "destructive" }); return;
      }
      const items: BulkItem[] = [];
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(",").map((c) => c.trim().replace(/^["']|["']$/g, ""));
        const person: PersonInput = {
          firstName: cols[firstIdx] || "", lastName: cols[lastIdx] || "",
          city: cols[cityIdx] || "", state: cols[stateIdx] || "",
          zipcode: zipIdx !== -1 ? (cols[zipIdx] || "") : "",
        };
        if (person.firstName && person.lastName && person.city && person.state) {
          items.push({ person, url: buildUrl(person), status: "pending" });
        }
      }
      if (items.length === 0) { toast({ title: "No valid rows", variant: "destructive" }); return; }
      if (items.length > 500) { toast({ title: "Max 500 per batch", variant: "destructive" }); return; }
      setBulkItems(items);
      toast({ title: `${items.length} people loaded` });
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
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
        setBulkItems((prev) => prev.map((item, idx) => (idx === i ? { ...item, status: "done", result } : item)));
        setHistory((prev) => [result, ...prev].slice(0, 50));
        if (i < bulkItems.length - 1) await new Promise(r => setTimeout(r, 3000));
      } catch (error: any) {
        setBulkItems((prev) => prev.map((item, idx) => idx === i ? { ...item, status: "error", error: error.message } : item));
      }
    }
    setBulkRunning(false);
    toast({ title: "Bulk search complete" });
  };

  const exportBulkResults = () => {
    const completed = bulkItems.filter((i) => i.status === "done" && i.result);
    if (completed.length === 0) { toast({ title: "No results", variant: "destructive" }); return; }
    const csvRows = ["search_first,search_last,search_city,search_state,result_name,age,deceased,emails,phones,phone_types,carriers,current_address,aliases,relatives"];
    for (const item of completed) {
      const p = item.person;
      for (const r of item.result!.people) {
        const esc = (s: string) => `"${s.replace(/"/g, '""')}"`;
        csvRows.push([
          esc(p.firstName), esc(p.lastName), esc(p.city), esc(p.state),
          esc(r.name), esc(r.age || ""), esc(r.deceased ? "Yes" : "No"),
          esc(r.emails.join("; ")),
          esc(r.phones.map(ph => ph.number).join("; ")),
          esc(r.phones.map(ph => ph.type).join("; ")),
          esc(r.phones.map(ph => ph.carrier).join("; ")),
          esc(r.currentAddress || ""),
          esc(r.aliases.join("; ")),
          esc(r.relatives.join("; ")),
        ].join(","));
      }
    }
    const blob = new Blob([csvRows.join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `people-search-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const handleLogout = async () => { await supabase.auth.signOut(); window.location.href = "/auth"; };

  const maskedKey = apiKey ? `${apiKey.slice(0, 6)}${"•".repeat(Math.max(0, apiKey.length - 10))}${apiKey.slice(-4)}` : "";
  const bulkDone = bulkItems.filter((i) => i.status === "done").length;
  const bulkError = bulkItems.filter((i) => i.status === "error").length;
  const bulkTotal = bulkItems.length;
  const bulkProgress = bulkTotal > 0 ? ((bulkDone + bulkError) / bulkTotal) * 100 : 0;

  return (
    <div className="min-h-screen bg-background">
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
                  <Settings className="h-4 w-4" /><span className="hidden sm:inline">Settings</span>
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle className="font-heading">API Key Settings</DialogTitle>
                  <DialogDescription>
                    Enter your scrape.do API key. Get one at{" "}
                    <a href="https://scrape.do" target="_blank" rel="noopener noreferrer" className="text-primary underline">scrape.do</a>
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 pt-2">
                  <div className="relative">
                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input value={apiKeyInput} onChange={(e) => setApiKeyInput(e.target.value)}
                      placeholder="Enter your scrape.do API key" type={showKey ? "text" : "password"}
                      className="pl-10 pr-10 font-mono text-sm" />
                    <button type="button" onClick={() => setShowKey(!showKey)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <Button onClick={saveApiKey} disabled={savingKey} className="w-full" variant="hero">
                    {savingKey ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save API Key"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
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
                <p className="text-xs text-muted-foreground">Add your scrape.do API key. 10 credits per search.</p>
              </div>
            </div>
            <Button variant="hero" size="sm" onClick={() => setSettingsOpen(true)}>Add Key</Button>
          </div>
        )}

        {apiKey && (
          <div className="mb-6 flex items-center gap-2 text-xs text-muted-foreground">
            <Key className="h-3.5 w-3.5" />
            <span className="font-mono">{maskedKey}</span>
            <span className="text-primary/60">• 10 credits/search</span>
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
              <form onSubmit={handleScrape} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">First Name</label>
                    <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Steven" required />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Last Name</label>
                    <Input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Silianoff" required />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">City</label>
                    <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="New York" required />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">State</label>
                    <Input value={state} onChange={(e) => setState(e.target.value)} placeholder="NY" required />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Zipcode (optional)</label>
                    <Input value={zipcode} onChange={(e) => setZipcode(e.target.value)} placeholder="10001" />
                  </div>
                </div>

                {firstName && lastName && city && state && (
                  <div className="text-xs text-muted-foreground font-mono bg-muted/50 rounded-lg px-3 py-2 truncate">
                    {buildUrl({ firstName, lastName, city, state, zipcode })}
                  </div>
                )}

                <Button type="submit" variant="hero" disabled={loading} className="w-full sm:w-auto">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Globe className="h-4 w-4 mr-2" />}
                  Search Person
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="bulk">
              <div className="space-y-4">
                {bulkItems.length === 0 && (
                  <>
                    <div className="bg-muted/30 border border-border rounded-lg p-3 text-xs text-muted-foreground space-y-1">
                      <p className="font-medium text-foreground text-sm">CSV Format</p>
                      <p>Required: <span className="font-mono text-primary">first_name</span>, <span className="font-mono text-primary">last_name</span>, <span className="font-mono text-primary">city</span>, <span className="font-mono text-primary">state</span></p>
                      <p>Optional: <span className="font-mono text-primary">zipcode</span> • 10 credits per person</p>
                    </div>
                    <label htmlFor="csv-upload"
                      className="flex flex-col items-center justify-center gap-3 border-2 border-dashed border-border rounded-xl p-10 cursor-pointer hover:border-primary/40 transition-colors">
                      <Upload className="h-8 w-8 text-muted-foreground" />
                      <p className="text-sm font-medium">Upload CSV file</p>
                      <p className="text-xs text-muted-foreground">Max 500 per batch</p>
                      <input id="csv-upload" ref={fileInputRef} type="file" accept=".csv,.txt" onChange={handleCsvUpload} className="hidden" />
                    </label>
                  </>
                )}

                {bulkItems.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                      {!bulkRunning ? (
                        <div className="flex gap-2">
                          <Button variant="hero" onClick={runBulkScrape} className="gap-2">
                            <Globe className="h-4 w-4" />Search {bulkTotal} People
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => setBulkItems([])}><X className="h-4 w-4" /></Button>
                        </div>
                      ) : (
                        <Button variant="destructive" onClick={() => { abortRef.current = true; }} className="gap-2">
                          <X className="h-4 w-4" />Stop
                        </Button>
                      )}
                      {bulkDone > 0 && !bulkRunning && (
                        <Button variant="outline" onClick={exportBulkResults} className="gap-2 ml-auto">
                          <Download className="h-4 w-4" />Export CSV
                        </Button>
                      )}
                    </div>

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

                    <div className="bg-card border border-border rounded-xl overflow-hidden max-h-[400px] overflow-y-auto">
                      {bulkItems.map((item, i) => (
                        <div key={i} className="flex items-center gap-3 px-4 py-2.5 border-b border-border last:border-b-0 hover:bg-muted/30">
                          {item.status === "pending" && <span className="h-4 w-4 rounded-full border border-border flex-shrink-0" />}
                          {item.status === "scraping" && <Loader2 className="h-4 w-4 text-primary animate-spin flex-shrink-0" />}
                          {item.status === "done" && <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />}
                          {item.status === "error" && <XCircle className="h-4 w-4 text-destructive flex-shrink-0" />}
                          <span className="text-sm truncate flex-1">
                            {item.person.firstName} {item.person.lastName} — {item.person.city}, {item.person.state.toUpperCase()}
                          </span>
                          {item.status === "done" && item.result && (
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <span className="text-xs text-muted-foreground">{item.result.people.length} results</span>
                              <button onClick={() => setResult(item.result!)} className="text-xs text-primary hover:underline">View</button>
                            </div>
                          )}
                          {item.status === "error" && <span className="text-xs text-destructive truncate max-w-[200px]">{item.error}</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
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

        {/* History */}
        {history.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold font-heading mb-4">Recent Searches</h2>
            <div className="space-y-2">
              {history.map((item, i) => (
                <button key={i} onClick={() => setResult(item)}
                  className="w-full text-left bg-card border border-border rounded-lg p-3 hover:border-primary/30 transition-colors flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-sm">{item.person.firstName} {item.person.lastName} — {item.person.city}, {item.person.state.toUpperCase()}</span>
                    <span className="text-xs text-primary">{item.totalResults} results</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{new Date(item.scrapedAt).toLocaleTimeString()}</span>
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
