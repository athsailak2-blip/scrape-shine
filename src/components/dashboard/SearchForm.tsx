import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Loader2 } from "lucide-react";
import { buildUrl } from "./utils";
import type { PersonInput } from "./types";

interface SearchFormProps {
  onSearch: (person: PersonInput) => Promise<void>;
  loading: boolean;
}

const SearchForm = ({ onSearch, loading }: SearchFormProps) => {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zipcode, setZipcode] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSearch({ firstName, lastName, city, state, zipcode });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
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
        {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Search className="h-4 w-4 mr-2" />}
        Search Person
      </Button>
    </form>
  );
};

export default SearchForm;
