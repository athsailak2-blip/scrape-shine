import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Upload, Search, X, Loader2, CheckCircle2, XCircle, Download, FileSpreadsheet,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { buildUrl } from "./utils";
import type { BulkItem, PersonInput, ScrapeResult } from "./types";

interface BulkUploadProps {
  bulkItems: BulkItem[];
  setBulkItems: React.Dispatch<React.SetStateAction<BulkItem[]>>;
  bulkRunning: boolean;
  onRunBulk: () => void;
  onStopBulk: () => void;
  onViewResult: (result: ScrapeResult) => void;
  onExport: () => void;
}

const BulkUpload = ({ bulkItems, setBulkItems, bulkRunning, onRunBulk, onStopBulk, onViewResult, onExport }: BulkUploadProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isExcel = file.name.endsWith(".xlsx") || file.name.endsWith(".xls");
    if (isExcel) {
      toast({ title: "Excel support coming soon", description: "Please export as CSV for now.", variant: "destructive" });
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

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
        toast({ title: "Missing columns", description: "Need: first name, last name, city, state.", variant: "destructive" });
        return;
      }

      const items: BulkItem[] = [];
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(",").map((c) => c.trim().replace(/^["']|["']$/g, ""));
        const person: PersonInput = {
          firstName: cols[firstIdx] || "",
          lastName: cols[lastIdx] || "",
          city: cols[cityIdx] || "",
          state: cols[stateIdx] || "",
          zipcode: zipIdx !== -1 ? (cols[zipIdx] || "") : "",
        };
        if (person.firstName && person.lastName && person.city && person.state) {
          items.push({ person, url: buildUrl(person), status: "pending" });
        }
      }

      if (items.length === 0) { toast({ title: "No valid rows", variant: "destructive" }); return; }
      if (items.length > 1000) { toast({ title: "Max 1,000 rows per upload", variant: "destructive" }); return; }
      setBulkItems(items);
      toast({ title: `${items.length} people loaded` });
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const bulkDone = bulkItems.filter((i) => i.status === "done").length;
  const bulkError = bulkItems.filter((i) => i.status === "error").length;
  const bulkTotal = bulkItems.length;
  const bulkProgress = bulkTotal > 0 ? ((bulkDone + bulkError) / bulkTotal) * 100 : 0;

  return (
    <div className="space-y-4">
      {bulkItems.length === 0 && (
        <>
          <div className="bg-muted/30 border border-border rounded-lg p-3 text-xs text-muted-foreground space-y-1">
            <p className="font-medium text-foreground text-sm">CSV Format</p>
            <p>Required: <span className="font-mono text-primary">first_name</span>, <span className="font-mono text-primary">last_name</span>, <span className="font-mono text-primary">city</span>, <span className="font-mono text-primary">state</span></p>
            <p>Optional: <span className="font-mono text-primary">zipcode</span> • Max 1,000 rows per upload</p>
          </div>
          <label htmlFor="csv-upload"
            className="flex flex-col items-center justify-center gap-3 border-2 border-dashed border-border rounded-xl p-10 cursor-pointer hover:border-primary/40 transition-colors">
            <Upload className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-medium">Upload CSV file</p>
            <p className="text-xs text-muted-foreground">Max 1,000 per upload</p>
            <input id="csv-upload" ref={fileInputRef} type="file" accept=".csv,.txt" onChange={handleFileUpload} className="hidden" />
          </label>
        </>
      )}

      {bulkItems.length > 0 && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            {!bulkRunning ? (
              <div className="flex gap-2">
                <Button variant="hero" onClick={onRunBulk} className="gap-2">
                  <Search className="h-4 w-4" />Search {bulkTotal} People
                </Button>
                <Button variant="ghost" size="icon" onClick={() => setBulkItems([])}><X className="h-4 w-4" /></Button>
              </div>
            ) : (
              <Button variant="destructive" onClick={onStopBulk} className="gap-2">
                <X className="h-4 w-4" />Stop
              </Button>
            )}
            {bulkDone > 0 && !bulkRunning && (
              <Button variant="outline" onClick={onExport} className="gap-2 ml-auto">
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
                    <button onClick={() => onViewResult(item.result!)} className="text-xs text-primary hover:underline">View</button>
                  </div>
                )}
                {item.status === "error" && <span className="text-xs text-destructive truncate max-w-[200px]">{item.error}</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default BulkUpload;
