import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Upload, Search, X, Loader2, CheckCircle2, XCircle, Download, FileSpreadsheet,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { buildUrl } from "./utils";
import type { BulkItem, PersonInput, ScrapeResult } from "./types";
import ColumnMapper, { autoDetectMapping, type ColumnMapping } from "./ColumnMapper";
import FilePreview from "./FilePreview";
import * as XLSX from "xlsx";

type UploadStep = "upload" | "mapping" | "preview" | "ready";

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

  const [step, setStep] = useState<UploadStep>("upload");
  const [rawHeaders, setRawHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<ColumnMapping>({ firstName: -1, lastName: -1, city: -1, state: -1, zipcode: -1 });
  const [parsedPeople, setParsedPeople] = useState<PersonInput[]>([]);

  const resetUpload = () => {
    setStep("upload");
    setRawHeaders([]);
    setRawRows([]);
    setMapping({ firstName: -1, lastName: -1, city: -1, state: -1, zipcode: -1 });
    setParsedPeople([]);
    setBulkItems([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const parseFile = (file: File) => {
    const isExcel = file.name.endsWith(".xlsx") || file.name.endsWith(".xls");

    if (isExcel) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: "array" });
          const sheet = workbook.Sheets[workbook.SheetNames[0]];
          const rows: string[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });

          if (rows.length < 2) { toast({ title: "File has no data rows", variant: "destructive" }); return; }
          if (rows.length > 1001) { toast({ title: "Max 1,000 rows per upload", variant: "destructive" }); return; }

          const headers = rows[0].map(String);
          const dataRows = rows.slice(1).filter(r => r.some(c => String(c).trim()));

          setRawHeaders(headers);
          setRawRows(dataRows.map(r => r.map(String)));

          const autoMap = autoDetectMapping(headers);
          setMapping(autoMap);
          setStep("mapping");
          toast({ title: `${dataRows.length} rows parsed from Excel` });
        } catch (err) {
          toast({ title: "Failed to parse Excel file", variant: "destructive" });
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      // CSV
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        const lines = text.split(/\r?\n/).filter(Boolean);
        if (lines.length < 2) { toast({ title: "Invalid CSV", variant: "destructive" }); return; }
        if (lines.length > 1001) { toast({ title: "Max 1,000 rows per upload", variant: "destructive" }); return; }

        const headers = lines[0].split(",").map(c => c.trim().replace(/^["']|["']$/g, ""));
        const dataRows = lines.slice(1).map(line =>
          line.split(",").map(c => c.trim().replace(/^["']|["']$/g, ""))
        ).filter(r => r.some(c => c.trim()));

        setRawHeaders(headers);
        setRawRows(dataRows);

        const autoMap = autoDetectMapping(headers);
        setMapping(autoMap);
        setStep("mapping");
        toast({ title: `${dataRows.length} rows parsed from CSV` });
      };
      reader.readAsText(file);
    }

    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    parseFile(file);
  };

  const handleMappingConfirm = () => {
    const people: PersonInput[] = [];
    const origRows: Record<string, string>[] = [];
    for (const row of rawRows) {
      const person: PersonInput = {
        firstName: mapping.firstName >= 0 ? (row[mapping.firstName] || "") : "",
        lastName: mapping.lastName >= 0 ? (row[mapping.lastName] || "") : "",
        city: mapping.city >= 0 ? (row[mapping.city] || "") : "",
        state: mapping.state >= 0 ? (row[mapping.state] || "") : "",
        zipcode: mapping.zipcode >= 0 ? (row[mapping.zipcode] || "") : "",
      };
      // Build original row object with all headers
      const orig: Record<string, string> = {};
      rawHeaders.forEach((h, idx) => { orig[h] = row[idx] || ""; });
      people.push(person);
      origRows.push(orig);
    }
    setParsedPeople(people);
    setOriginalRows(origRows);
    setStep("preview");
  };

  const handlePreviewConfirm = (validPeople: PersonInput[]) => {
    if (validPeople.length === 0) { toast({ title: "No valid rows", variant: "destructive" }); return; }
    const items: BulkItem[] = validPeople.map((person, i) => ({
      person,
      url: buildUrl(person),
      status: "pending" as const,
      originalRow: originalRows[i],
    }));
    setBulkItems(items);
    setStep("ready");
  };

  const bulkDone = bulkItems.filter(i => i.status === "done").length;
  const bulkError = bulkItems.filter(i => i.status === "error").length;
  const bulkTotal = bulkItems.length;
  const bulkProgress = bulkTotal > 0 ? ((bulkDone + bulkError) / bulkTotal) * 100 : 0;

  // Step: Upload
  if (step === "upload") {
    return (
      <div className="space-y-4">
        <div className="bg-muted/30 border border-border rounded-lg p-3 text-xs text-muted-foreground space-y-1">
          <p className="font-medium text-foreground text-sm">Upload Format</p>
          <p>Supports <span className="font-mono text-primary">CSV</span> and <span className="font-mono text-primary">Excel (.xlsx)</span></p>
          <p>Required: <span className="font-mono text-primary">first_name</span>, <span className="font-mono text-primary">last_name</span>, <span className="font-mono text-primary">city</span>, <span className="font-mono text-primary">state</span></p>
          <p>Optional: <span className="font-mono text-primary">zipcode</span> • Max 1,000 rows per upload</p>
        </div>
        <label htmlFor="csv-upload"
          className="flex flex-col items-center justify-center gap-3 border-2 border-dashed border-border rounded-xl p-10 cursor-pointer hover:border-primary/40 transition-colors">
          <Upload className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm font-medium">Upload CSV or Excel file</p>
          <p className="text-xs text-muted-foreground">Max 1,000 per upload</p>
          <input id="csv-upload" ref={fileInputRef} type="file" accept=".csv,.txt,.xlsx,.xls" onChange={handleFileUpload} className="hidden" />
        </label>
      </div>
    );
  }

  // Step: Column mapping
  if (step === "mapping") {
    return (
      <ColumnMapper
        headers={rawHeaders}
        previewRows={rawRows}
        mapping={mapping}
        onMappingChange={setMapping}
        onConfirm={handleMappingConfirm}
        onCancel={resetUpload}
      />
    );
  }

  // Step: Preview & fix
  if (step === "preview") {
    return (
      <FilePreview
        items={parsedPeople}
        onConfirm={handlePreviewConfirm}
        onCancel={resetUpload}
      />
    );
  }

  // Step: Ready / Running / Done
  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        {!bulkRunning ? (
          <div className="flex gap-2">
            <Button variant="hero" onClick={onRunBulk} className="gap-2">
              <Search className="h-4 w-4" />Search {bulkTotal} People
            </Button>
            <Button variant="ghost" size="icon" onClick={resetUpload}><X className="h-4 w-4" /></Button>
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
  );
};

export default BulkUpload;
