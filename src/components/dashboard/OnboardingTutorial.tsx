import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, ChevronLeft, ChevronRight, Flag } from "lucide-react";

type TutorialStep = {
  id: string;
  title: string;
  description: string;
  cta: string;
  action: () => void;
};

interface OnboardingTutorialProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenSettings: () => void;
  onSelectSingleTab: () => void;
  onSelectBulkTab: () => void;
}

const STORAGE_KEY = "ownertrace_onboarding_done_v1";

export const hasCompletedOnboarding = () => localStorage.getItem(STORAGE_KEY) === "1";

const OnboardingTutorial = ({
  open,
  onOpenChange,
  onOpenSettings,
  onSelectSingleTab,
  onSelectBulkTab,
}: OnboardingTutorialProps) => {
  const [stepIndex, setStepIndex] = useState(0);

  const steps = useMemo<TutorialStep[]>(
    () => [
      {
        id: "apikey",
        title: "1) Add your API key",
        description: "Open Settings and save your scrape.do key so searches can run.",
        cta: "Open Settings",
        action: onOpenSettings,
      },
      {
        id: "single",
        title: "2) Run a single search",
        description: "Use the Single tab to verify one person search end-to-end.",
        cta: "Go to Single Search",
        action: onSelectSingleTab,
      },
      {
        id: "bulk",
        title: "3) Try bulk upload",
        description: "Upload CSV/XLSX in Bulk Upload and track progress in Jobs.",
        cta: "Go to Bulk Upload",
        action: onSelectBulkTab,
      },
    ],
    [onOpenSettings, onSelectSingleTab, onSelectBulkTab]
  );

  const current = steps[stepIndex];
  const progress = Math.round(((stepIndex + 1) / steps.length) * 100);

  const completeTutorial = () => {
    localStorage.setItem(STORAGE_KEY, "1");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Flag className="h-4 w-4 text-primary" /> Quick Start Tutorial
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <Progress value={progress} />

          <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-sm font-semibold mb-1">{current.title}</p>
            <p className="text-sm text-muted-foreground">{current.description}</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="hero" onClick={current.action} className="flex-1 min-w-40">
              {current.cta}
            </Button>
            {stepIndex < steps.length - 1 ? (
              <Button variant="outline" onClick={() => setStepIndex((i) => i + 1)}>
                Next <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <Button variant="secondary" onClick={completeTutorial}>
                <CheckCircle2 className="h-4 w-4 mr-1" /> Finish
              </Button>
            )}
            {stepIndex > 0 && (
              <Button variant="ghost" onClick={() => setStepIndex((i) => i - 1)}>
                <ChevronLeft className="h-4 w-4 mr-1" /> Back
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default OnboardingTutorial;
