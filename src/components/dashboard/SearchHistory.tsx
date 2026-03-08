import { Clock } from "lucide-react";
import type { ScrapeResult } from "./types";

interface SearchHistoryProps {
  history: ScrapeResult[];
  onSelect: (result: ScrapeResult) => void;
}

const SearchHistory = ({ history, onSelect }: SearchHistoryProps) => {
  if (history.length === 0) return null;

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <Clock className="h-4 w-4 text-muted-foreground" />
        <h2 className="text-lg font-semibold font-heading">Recent Searches (Last 7 Days)</h2>
      </div>
      <div className="space-y-2">
        {history.map((item, i) => (
          <button key={i} onClick={() => onSelect(item)}
            className="w-full text-left bg-card border border-border rounded-lg p-3 hover:border-primary/30 transition-colors flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-sm">{item.person.firstName} {item.person.lastName} — {item.person.city}, {item.person.state.toUpperCase()}</span>
              <span className="text-xs text-primary">{item.totalResults} results</span>
            </div>
            <span className="text-xs text-muted-foreground">
              {new Date(item.scrapedAt).toLocaleDateString()} {new Date(item.scrapedAt).toLocaleTimeString()}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default SearchHistory;
