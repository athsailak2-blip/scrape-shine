import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CheckCircle2, XCircle, Pencil, Trash2, Search } from "lucide-react";
import type { PersonInput } from "./types";

interface FilePreviewProps {
  items: PersonInput[];
  onConfirm: (items: PersonInput[]) => void;
  onCancel: () => void;
}

const FilePreview = ({ items: initialItems, onConfirm, onCancel }: FilePreviewProps) => {
  const [items, setItems] = useState<PersonInput[]>(initialItems);
  const [editIdx, setEditIdx] = useState<number | null>(null);
  const [editItem, setEditItem] = useState<PersonInput | null>(null);

  const isValid = (p: PersonInput) =>
    p.firstName.trim() && p.lastName.trim() && p.city.trim() && p.state.trim();

  const validCount = items.filter(isValid).length;
  const invalidCount = items.length - validCount;

  const handleRemove = (idx: number) => {
    setItems(prev => prev.filter((_, i) => i !== idx));
    if (editIdx === idx) { setEditIdx(null); setEditItem(null); }
  };

  const handleEdit = (idx: number) => {
    setEditIdx(idx);
    setEditItem({ ...items[idx] });
  };

  const handleSave = () => {
    if (editIdx !== null && editItem) {
      setItems(prev => prev.map((item, i) => i === editIdx ? editItem : item));
      setEditIdx(null);
      setEditItem(null);
    }
  };

  const removeInvalid = () => {
    setItems(prev => prev.filter(isValid));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">{items.length} rows loaded</h3>
          <p className="text-xs text-muted-foreground">
            {validCount} valid{invalidCount > 0 && <span className="text-destructive"> • {invalidCount} invalid</span>}
          </p>
        </div>
        <div className="flex gap-2">
          {invalidCount > 0 && (
            <Button variant="outline" size="sm" onClick={removeInvalid} className="text-xs">
              Remove {invalidCount} invalid
            </Button>
          )}
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden max-h-[350px] overflow-y-auto">
        {items.map((item, i) => {
          const valid = isValid(item);
          const isEditing = editIdx === i;

          if (isEditing && editItem) {
            return (
              <div key={i} className="flex items-center gap-2 px-3 py-2 border-b border-border bg-primary/5">
                <Input value={editItem.firstName} onChange={e => setEditItem({ ...editItem, firstName: e.target.value })}
                  placeholder="First" className="h-7 text-xs flex-1" />
                <Input value={editItem.lastName} onChange={e => setEditItem({ ...editItem, lastName: e.target.value })}
                  placeholder="Last" className="h-7 text-xs flex-1" />
                <Input value={editItem.city} onChange={e => setEditItem({ ...editItem, city: e.target.value })}
                  placeholder="City" className="h-7 text-xs flex-1" />
                <Input value={editItem.state} onChange={e => setEditItem({ ...editItem, state: e.target.value })}
                  placeholder="State" className="h-7 text-xs w-16" />
                <Input value={editItem.zipcode} onChange={e => setEditItem({ ...editItem, zipcode: e.target.value })}
                  placeholder="Zip" className="h-7 text-xs w-16" />
                <Button variant="hero" size="sm" onClick={handleSave} className="h-7 text-xs px-2">Save</Button>
                <Button variant="ghost" size="sm" onClick={() => { setEditIdx(null); setEditItem(null); }} className="h-7 text-xs px-2">✕</Button>
              </div>
            );
          }

          return (
            <div key={i} className={`flex items-center gap-3 px-4 py-2 border-b border-border last:border-b-0 hover:bg-muted/30 ${!valid ? "bg-destructive/5" : ""}`}>
              {valid ? (
                <CheckCircle2 className="h-3.5 w-3.5 text-primary flex-shrink-0" />
              ) : (
                <XCircle className="h-3.5 w-3.5 text-destructive flex-shrink-0" />
              )}
              <span className="text-sm truncate flex-1">
                {item.firstName || "—"} {item.lastName || "—"} — {item.city || "—"}, {(item.state || "—").toUpperCase()}
                {item.zipcode && <span className="text-muted-foreground"> {item.zipcode}</span>}
              </span>
              <button onClick={() => handleEdit(i)} className="text-muted-foreground hover:text-foreground p-1">
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <button onClick={() => handleRemove(i)} className="text-muted-foreground hover:text-destructive p-1">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        })}
      </div>

      <div className="flex gap-2">
        <Button variant="hero" onClick={() => onConfirm(items.filter(isValid))} disabled={validCount === 0} className="gap-2">
          <Search className="h-4 w-4" />Proceed with {validCount} people
        </Button>
        <Button variant="ghost" onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  );
};

export default FilePreview;
