import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { CheckCircle2, AlertCircle } from "lucide-react";

export interface ColumnMapping {
  firstName: number;
  lastName: number;
  city: number;
  state: number;
  zipcode: number;
}

interface ColumnMapperProps {
  headers: string[];
  previewRows: string[][];
  mapping: ColumnMapping;
  onMappingChange: (mapping: ColumnMapping) => void;
  onConfirm: () => void;
  onCancel: () => void;
}

const REQUIRED_FIELDS = [
  { key: "firstName" as const, label: "First Name", hints: ["first", "firstname", "first_name", "given"] },
  { key: "lastName" as const, label: "Last Name", hints: ["last", "lastname", "last_name", "surname", "family"] },
  { key: "city" as const, label: "City", hints: ["city"] },
  { key: "state" as const, label: "State", hints: ["state"] },
] as const;

const OPTIONAL_FIELDS = [
  { key: "zipcode" as const, label: "Zipcode", hints: ["zip", "zipcode", "zip_code", "postal"] },
] as const;

export function autoDetectMapping(headers: string[]): ColumnMapping {
  const lower = headers.map(h => h.toLowerCase().replace(/[^a-z0-9]/g, ""));
  const find = (hints: readonly string[]) =>
    lower.findIndex(h => hints.some(hint => h.includes(hint)));

  return {
    firstName: find(REQUIRED_FIELDS[0].hints),
    lastName: find(REQUIRED_FIELDS[1].hints),
    city: find(REQUIRED_FIELDS[2].hints),
    state: find(REQUIRED_FIELDS[3].hints),
    zipcode: find(OPTIONAL_FIELDS[0].hints),
  };
}

const ColumnMapper = ({ headers, previewRows, mapping, onMappingChange, onConfirm, onCancel }: ColumnMapperProps) => {
  const allRequired = REQUIRED_FIELDS.every(f => mapping[f.key] !== -1);

  const updateField = (field: keyof ColumnMapping, value: string) => {
    onMappingChange({ ...mapping, [field]: value === "__none__" ? -1 : parseInt(value) });
  };

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-sm font-semibold mb-3">Map your columns</h3>
        <div className="grid gap-3">
          {[...REQUIRED_FIELDS, ...OPTIONAL_FIELDS].map(field => {
            const isRequired = REQUIRED_FIELDS.some(f => f.key === field.key);
            const isMapped = mapping[field.key] !== -1;
            return (
              <div key={field.key} className="flex items-center gap-3">
                <div className="w-28 flex items-center gap-1.5 text-sm">
                  {isMapped ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                  ) : isRequired ? (
                    <AlertCircle className="h-3.5 w-3.5 text-destructive flex-shrink-0" />
                  ) : (
                    <span className="h-3.5 w-3.5 flex-shrink-0" />
                  )}
                  <span className={isRequired && !isMapped ? "text-destructive" : ""}>
                    {field.label}{isRequired ? " *" : ""}
                  </span>
                </div>
                <Select value={mapping[field.key] === -1 ? "__none__" : String(mapping[field.key])} onValueChange={v => updateField(field.key, v)}>
                  <SelectTrigger className="flex-1 h-8 text-sm">
                    <SelectValue placeholder="Select column..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— Skip —</SelectItem>
                    {headers.map((h, i) => (
                      <SelectItem key={i} value={String(i)}>{h}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            );
          })}
        </div>
      </div>

      {/* Preview */}
      {previewRows.length > 0 && (
        <div>
          <p className="text-xs text-muted-foreground mb-2">Preview (first 3 rows)</p>
          <div className="bg-muted/30 border border-border rounded-lg overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border">
                  {REQUIRED_FIELDS.map(f => (
                    <th key={f.key} className="px-3 py-1.5 text-left font-medium text-muted-foreground">{f.label}</th>
                  ))}
                  <th className="px-3 py-1.5 text-left font-medium text-muted-foreground">Zipcode</th>
                </tr>
              </thead>
              <tbody>
                {previewRows.slice(0, 3).map((row, i) => (
                  <tr key={i} className="border-b border-border last:border-b-0">
                    {REQUIRED_FIELDS.map(f => (
                      <td key={f.key} className="px-3 py-1.5">{mapping[f.key] >= 0 ? row[mapping[f.key]] || "—" : "—"}</td>
                    ))}
                    <td className="px-3 py-1.5">{mapping.zipcode >= 0 ? row[mapping.zipcode] || "—" : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <Button variant="hero" onClick={onConfirm} disabled={!allRequired}>
          Confirm Mapping
        </Button>
        <Button variant="ghost" onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  );
};

export default ColumnMapper;
