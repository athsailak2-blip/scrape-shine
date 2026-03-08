import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, Loader2, CheckCircle2, XCircle, Clock, RefreshCw } from "lucide-react";

interface BulkJob {
  id: string;
  status: string;
  total_items: number;
  completed_items: number;
  failed_items: number;
  created_at: string;
  updated_at: string;
}

interface JobsDashboardProps {
  onExportJob: (jobId: string) => void;
}

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: typeof Clock }> = {
  pending: { label: "Queued", variant: "outline", icon: Clock },
  processing: { label: "Processing", variant: "default", icon: Loader2 },
  complete: { label: "Complete", variant: "secondary", icon: CheckCircle2 },
  failed: { label: "Failed", variant: "destructive", icon: XCircle },
  cancelled: { label: "Cancelled", variant: "outline", icon: XCircle },
};

const JobsDashboard = ({ onExportJob }: JobsDashboardProps) => {
  const [jobs, setJobs] = useState<BulkJob[]>([]);
  const [loading, setLoading] = useState(true);

  const loadJobs = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("bulk_jobs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
    if (data) setJobs(data as BulkJob[]);
    setLoading(false);
  };

  useEffect(() => {
    loadJobs();

    // Subscribe to realtime updates
    const channel = supabase
      .channel("bulk-jobs-updates")
      .on("postgres_changes", { event: "*", schema: "public", table: "bulk_jobs" }, () => {
        loadJobs();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin mr-2" />Loading jobs...
      </div>
    );
  }

  if (jobs.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p className="text-sm">No bulk jobs yet. Upload a CSV or Excel file to get started.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Bulk Jobs</h3>
        <Button variant="ghost" size="sm" onClick={loadJobs} className="gap-1.5 text-xs">
          <RefreshCw className="h-3.5 w-3.5" />Refresh
        </Button>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {jobs.map(job => {
          const config = statusConfig[job.status] || statusConfig.pending;
          const Icon = config.icon;
          const progress = job.total_items > 0
            ? Math.round(((job.completed_items + job.failed_items) / job.total_items) * 100)
            : 0;

          return (
            <div key={job.id} className="flex items-center gap-3 px-4 py-3 border-b border-border last:border-b-0 hover:bg-muted/30">
              <Icon className={`h-4 w-4 flex-shrink-0 ${job.status === "processing" ? "animate-spin text-primary" : job.status === "complete" ? "text-primary" : "text-muted-foreground"}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{job.total_items} people</span>
                  <Badge variant={config.variant} className="text-[10px] px-1.5 py-0">{config.label}</Badge>
                </div>
                <div className="flex gap-3 text-xs text-muted-foreground mt-0.5">
                  <span>{job.completed_items} done</span>
                  {job.failed_items > 0 && <span className="text-destructive">{job.failed_items} failed</span>}
                  {job.status === "processing" && <span>{progress}%</span>}
                  <span>{new Date(job.created_at).toLocaleDateString()}</span>
                </div>
              </div>
              {(job.status === "complete" || job.completed_items > 0) && (
                <Button variant="outline" size="sm" onClick={() => onExportJob(job.id)} className="gap-1.5 text-xs h-7">
                  <Download className="h-3.5 w-3.5" />Export
                </Button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default JobsDashboard;
