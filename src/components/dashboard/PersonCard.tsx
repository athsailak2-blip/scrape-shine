import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { User, Mail, Phone, AlertTriangle, ExternalLink, Copy, MapPin, Users } from "lucide-react";
import type { PersonResult } from "./types";

interface PersonCardProps {
  person: PersonResult;
  onCopy: (text: string, label: string) => void;
}

const PersonCard = ({ person, onCopy }: PersonCardProps) => (
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
      {/* Addresses */}
      {(person.currentAddress || person.previousAddresses.length > 0) && (
        <div>
          <div className="flex items-center gap-2 text-sm font-medium mb-2">
            <MapPin className="h-4 w-4 text-primary" /> Addresses
          </div>
          {person.currentAddress && (
            <div className="font-mono text-sm bg-muted/50 rounded-lg px-3 py-2 mb-1 flex items-center justify-between">
              <span>{person.currentAddress} <span className="text-xs text-primary ml-1">(current)</span></span>
              <button onClick={() => onCopy(person.currentAddress!, "Address")} className="text-muted-foreground hover:text-foreground">
                <Copy className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
          {person.previousAddresses.map((addr, i) => (
            <div key={i} className="font-mono text-sm bg-muted/50 rounded-lg px-3 py-2 mb-1 text-muted-foreground">
              {addr}
            </div>
          ))}
          {person.moreAddresses > 0 && (
            <p className="text-xs text-muted-foreground mt-1">+{person.moreAddresses} more addresses</p>
          )}
        </div>
      )}

      {/* Emails */}
      {person.emails.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Mail className="h-4 w-4 text-primary" /> Emails ({person.emails.length})
            </div>
            <Button variant="ghost" size="sm" onClick={() => onCopy(person.emails.join("\n"), "Emails")} className="h-7 text-xs gap-1">
              <Copy className="h-3 w-3" /> Copy All
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
            {person.morePhones > 0 && <span className="text-xs text-muted-foreground">+{person.morePhones} more</span>}
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
                      ph.type === "Voip" ? "bg-info/10 text-info" :
                      ph.type === "Landline" ? "bg-warning/10 text-warning" : "bg-muted text-muted-foreground"
                    }`}>{ph.type || "—"}</span>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{ph.carrier || "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Aliases */}
      {person.aliases.length > 0 && (
        <div>
          <div className="flex items-center gap-2 text-sm font-medium mb-2">
            <User className="h-4 w-4 text-primary" /> Aliases
          </div>
          <div className="flex flex-wrap gap-2">
            {person.aliases.map((alias, i) => (
              <span key={i} className="text-xs bg-muted rounded-full px-3 py-1 text-muted-foreground">{alias}</span>
            ))}
          </div>
        </div>
      )}

      {/* Relatives */}
      {person.relatives.length > 0 && (
        <div>
          <div className="flex items-center gap-2 text-sm font-medium mb-2">
            <Users className="h-4 w-4 text-primary" /> Relatives ({person.relatives.length})
          </div>
          <div className="flex flex-wrap gap-2">
            {person.relatives.map((rel, i) => (
              <span key={i} className="text-xs bg-muted rounded-full px-3 py-1 text-muted-foreground">{rel}</span>
            ))}
          </div>
        </div>
      )}

      {/* Associates */}
      {person.associates.length > 0 && (
        <div>
          <div className="flex items-center gap-2 text-sm font-medium mb-2">
            <Users className="h-4 w-4 text-muted-foreground" /> Associates ({person.associates.length})
          </div>
          <div className="flex flex-wrap gap-2">
            {person.associates.map((assoc, i) => (
              <span key={i} className="text-xs bg-muted rounded-full px-3 py-1 text-muted-foreground">{assoc}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  </div>
);

export default PersonCard;
