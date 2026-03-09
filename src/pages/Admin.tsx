import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Search, ArrowLeft, Users, BarChart3, Ban, CheckCircle2, Loader2, Download, History,
} from "lucide-react";

type UserProfile = {
  id: string;
  email: string;
  disabled: boolean;
  created_at: string;
  search_count: number;
  role: string;
};

type UserHistoryItem = {
  id: string;
  search_first: string;
  search_last: string;
  search_city: string;
  search_state: string;
  total_results: number;
  created_at: string;
};

const Admin = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyEmail, setHistoryEmail] = useState("");
  const [historyItems, setHistoryItems] = useState<UserHistoryItem[]>([]);
  const [stats, setStats] = useState({ totalUsers: 0, totalSearches: 0, searchesToday: 0, activeUsers7d: 0 });
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkAdminAndLoad();
  }, []);

  const checkAdminAndLoad = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { navigate("/auth"); return; }

    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      toast({ title: "Access denied", variant: "destructive" });
      navigate("/dashboard");
      return;
    }

    await Promise.all([loadUsers(), loadStats()]);
    setLoading(false);
  };

  const loadUsers = async () => {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, email, disabled, created_at")
      .order("created_at", { ascending: false });

    if (!profiles) return;

    // Get search counts
    const { data: searchData } = await supabase
      .from("search_results")
      .select("user_id");

    const countMap: Record<string, number> = {};
    searchData?.forEach((r: any) => {
      countMap[r.user_id] = (countMap[r.user_id] || 0) + 1;
    });

    // Get roles
    const { data: roles } = await supabase.from("user_roles").select("user_id, role");
    const roleMap: Record<string, string> = {};
    roles?.forEach((r: any) => { roleMap[r.user_id] = r.role; });

    setUsers(profiles.map((p: any) => ({
      ...p,
      search_count: countMap[p.id] || 0,
      role: roleMap[p.id] || "user",
    })));
  };

  const loadStats = async () => {
    const { count: totalUsers } = await supabase.from("profiles").select("*", { count: "exact", head: true });
    const { count: totalSearches } = await supabase.from("search_results").select("*", { count: "exact", head: true });

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const { count: searchesToday } = await supabase
      .from("search_results")
      .select("*", { count: "exact", head: true })
      .gte("created_at", today.toISOString());

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const { data: activeData } = await supabase
      .from("search_results")
      .select("user_id")
      .gte("created_at", sevenDaysAgo.toISOString());

    const activeUsers7d = new Set(activeData?.map((r: any) => r.user_id)).size;

    setStats({
      totalUsers: totalUsers || 0,
      totalSearches: totalSearches || 0,
      searchesToday: searchesToday || 0,
      activeUsers7d,
    });
  };

  const toggleDisabled = async (userId: string, currentlyDisabled: boolean) => {
    setToggling(userId);
    const { error } = await supabase
      .from("profiles")
      .update({ disabled: !currentlyDisabled })
      .eq("id", userId);

    if (error) {
      toast({ title: "Failed to update user", variant: "destructive" });
    } else {
      setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, disabled: !currentlyDisabled } : u));
      toast({ title: currentlyDisabled ? "User enabled" : "User disabled" });
    }
    setToggling(null);
  };

  const exportUsersCsv = () => {
    const esc = (value: string | number | boolean) => `"${String(value ?? "").replace(/"/g, '""')}"`;
    const rows = [
      ["email", "role", "search_count", "status", "joined_at"].map(esc).join(","),
      ...filteredUsers.map((u) => [
        esc(u.email || ""),
        esc(u.role),
        esc(u.search_count),
        esc(u.disabled ? "disabled" : "active"),
        esc(new Date(u.created_at).toISOString()),
      ].join(",")),
    ];

    const blob = new Blob([rows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ownertrace-users-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const loadUserHistory = async (userId: string, email: string) => {
    setHistoryOpen(true);
    setHistoryLoading(true);
    setHistoryEmail(email || "Unknown user");

    const { data, error } = await supabase
      .from("search_results")
      .select("id, search_first, search_last, search_city, search_state, total_results, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      toast({ title: "Failed to load user history", variant: "destructive" });
      setHistoryItems([]);
    } else {
      setHistoryItems((data || []) as UserHistoryItem[]);
    }

    setHistoryLoading(false);
  };

  const filteredUsers = users.filter((u) => {
    if (!query.trim()) return true;
    const q = query.trim().toLowerCase();
    return (u.email || "").toLowerCase().includes(q) || u.role.toLowerCase().includes(q);
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container flex items-center justify-between h-14 px-4">
          <div className="flex items-center gap-2">
            <Search className="h-5 w-5 text-primary" />
            <span className="font-bold font-heading">OwnerTrace</span>
            <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">Admin</span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")} className="gap-1.5">
            <ArrowLeft className="h-4 w-4" /> Dashboard
          </Button>
        </div>
      </header>

      <main className="container px-4 py-8 max-w-5xl">
        <h1 className="text-3xl font-bold font-heading mb-6">Admin Panel</h1>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Total Users", value: stats.totalUsers, icon: Users },
            { label: "Total Searches", value: stats.totalSearches, icon: BarChart3 },
            { label: "Searches Today", value: stats.searchesToday, icon: BarChart3 },
            { label: "Active (7d)", value: stats.activeUsers7d, icon: Users },
          ].map((stat) => (
            <div key={stat.label} className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                <stat.icon className="h-3.5 w-3.5" /> {stat.label}
              </div>
              <p className="text-2xl font-bold font-heading">{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Users Table */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="p-4 border-b border-border flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <h2 className="font-semibold font-heading flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" /> Users ({filteredUsers.length})
              </h2>
              <div className="flex gap-2 w-full md:w-auto">
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Filter by email or role"
                  className="md:w-64"
                />
                <Button variant="outline" size="sm" onClick={exportUsersCsv} className="gap-1.5">
                  <Download className="h-4 w-4" /> Export CSV
                </Button>
              </div>
            </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Searches</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-mono text-sm">{user.email}</TableCell>
                  <TableCell>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      user.role === "admin" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                    }`}>{user.role}</span>
                  </TableCell>
                  <TableCell>{user.search_count}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(user.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    {user.disabled ? (
                      <span className="text-xs text-destructive flex items-center gap-1"><Ban className="h-3 w-3" /> Disabled</span>
                    ) : (
                      <span className="text-xs text-primary flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> Active</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {user.role !== "admin" && (
                      <Button
                        variant={user.disabled ? "outline" : "destructive"}
                        size="sm"
                        disabled={toggling === user.id}
                        onClick={() => toggleDisabled(user.id, user.disabled)}
                        className="text-xs h-7"
                      >
                        {toggling === user.id ? <Loader2 className="h-3 w-3 animate-spin" /> : user.disabled ? "Enable" : "Disable"}
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </main>
    </div>
  );
};

export default Admin;
