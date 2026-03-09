import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Settings, Key, Eye, EyeOff, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  apiKey: string;
  onApiKeySaved: (key: string) => void;
  disabled?: boolean;
  disabledReason?: string;
}

const SettingsDialog = ({ open, onOpenChange, apiKey, onApiKeySaved, disabled, disabledReason }: SettingsDialogProps) => {
  const [apiKeyInput, setApiKeyInput] = useState(apiKey);
  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [validating, setValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<"valid" | "invalid" | null>(null);
  const { toast } = useToast();

  const validateApiKey = async (key: string): Promise<boolean> => {
    setValidating(true);
    setValidationResult(null);
    try {
      // Validate through edge function to avoid CORS issues
      const { data, error } = await supabase.functions.invoke("scrape", {
        body: { url: "https://httpbin.org/get", apiKey: key, validateOnly: true },
      });
      const isValid = !error && data?.status === 200;
      setValidationResult(isValid ? "valid" : "invalid");
      return isValid;
    } catch {
      setValidationResult("invalid");
      return false;
    } finally {
      setValidating(false);
    }
  };

  const handleSave = async () => {
    const trimmed = apiKeyInput.trim();
    if (!trimmed) {
      toast({ title: "API key is required", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      // Validate the key first
      const isValid = await validateApiKey(trimmed);
      if (!isValid) {
        toast({ title: "Invalid API key", description: "The key could not be verified with scrape.do. Please check and try again.", variant: "destructive" });
        setSaving(false);
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("user_api_keys").upsert(
        { user_id: user.id, api_key: trimmed, updated_at: new Date().toISOString() },
        { onConflict: "user_id" }
      );
      if (error) throw error;

      onApiKeySaved(trimmed);
      onOpenChange(false);
      toast({ title: "API key saved & verified ✓" });
    } catch (error: any) {
      toast({ title: "Failed to save API key", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1.5" disabled={disabled} title={disabledReason}>
          <Settings className="h-4 w-4" /><span className="hidden sm:inline">Settings</span>
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-heading">API Key Settings</DialogTitle>
          <DialogDescription>
            Enter your scrape.do API key. Get one at{" "}
            <a href="https://scrape.do" target="_blank" rel="noopener noreferrer" className="text-primary underline">scrape.do</a>.
            The key will be validated before saving.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="relative">
            <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={apiKeyInput}
              onChange={(e) => { setApiKeyInput(e.target.value); setValidationResult(null); }}
              placeholder="Enter your scrape.do API key"
              type={showKey ? "text" : "password"}
              className="pl-10 pr-10 font-mono text-sm"
            />
            <button type="button" onClick={() => setShowKey(!showKey)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>

          {validationResult === "valid" && (
            <div className="flex items-center gap-2 text-sm text-primary">
              <CheckCircle2 className="h-4 w-4" /> Key is valid
            </div>
          )}
          {validationResult === "invalid" && (
            <div className="flex items-center gap-2 text-sm text-destructive">
              <XCircle className="h-4 w-4" /> Key is invalid or could not be verified
            </div>
          )}

          <Button onClick={handleSave} disabled={saving || validating} className="w-full" variant="hero">
            {saving || validating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                {validating ? "Validating..." : "Saving..."}
              </>
            ) : (
              "Validate & Save"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SettingsDialog;
