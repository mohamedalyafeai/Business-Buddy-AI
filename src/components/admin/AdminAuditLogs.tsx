import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Search, FileText, Shield, Settings, Users, AlertCircle } from "lucide-react";
import { format } from "date-fns";

interface AuditLog {
  id: string;
  admin_id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  details: Record<string, unknown>;
  created_at: string;
}

const getActionIcon = (action: string) => {
  if (action.includes("role")) return <Shield className="h-4 w-4" />;
  if (action.includes("settings")) return <Settings className="h-4 w-4" />;
  if (action.includes("user")) return <Users className="h-4 w-4" />;
  return <FileText className="h-4 w-4" />;
};

const getActionBadgeVariant = (action: string): "default" | "secondary" | "destructive" | "outline" => {
  if (action.includes("delete") || action.includes("remove")) return "destructive";
  if (action.includes("create") || action.includes("add")) return "default";
  if (action.includes("update") || action.includes("change")) return "secondary";
  return "outline";
};

export const AdminAuditLogs = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterAction, setFilterAction] = useState<string>("all");

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      const { data, error } = await supabase
        .from("audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;
      setLogs((data as AuditLog[]) || []);
    } catch (error) {
      console.error("Error fetching audit logs:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.entity_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      JSON.stringify(log.details).toLowerCase().includes(searchQuery.toLowerCase());

    const matchesFilter = filterAction === "all" || log.action.includes(filterAction);

    return matchesSearch && matchesFilter;
  });

  const uniqueActions = [...new Set(logs.map((log) => log.action.split("_")[0]))];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Audit Logs
          </CardTitle>
          <CardDescription>
            Track all admin actions and system changes
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Filters */}
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search logs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filterAction} onValueChange={setFilterAction}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Filter by action" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                {uniqueActions.map((action) => (
                  <SelectItem key={action} value={action}>
                    {action.charAt(0).toUpperCase() + action.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-lg bg-muted/50">
              <div className="text-2xl font-bold text-foreground">{logs.length}</div>
              <div className="text-sm text-muted-foreground">Total Logs</div>
            </div>
            <div className="p-4 rounded-lg bg-muted/50">
              <div className="text-2xl font-bold text-foreground">
                {logs.filter((l) => l.action.includes("role")).length}
              </div>
              <div className="text-sm text-muted-foreground">Role Changes</div>
            </div>
            <div className="p-4 rounded-lg bg-muted/50">
              <div className="text-2xl font-bold text-foreground">
                {logs.filter((l) => l.action.includes("settings")).length}
              </div>
              <div className="text-sm text-muted-foreground">Settings Updates</div>
            </div>
            <div className="p-4 rounded-lg bg-muted/50">
              <div className="text-2xl font-bold text-foreground">
                {logs.filter((l) => {
                  const date = new Date(l.created_at);
                  const today = new Date();
                  return date.toDateString() === today.toDateString();
                }).length}
              </div>
              <div className="text-sm text-muted-foreground">Today</div>
            </div>
          </div>

          {/* Log List */}
          <div className="space-y-3">
            {filteredLogs.length === 0 ? (
              <div className="text-center py-12">
                <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No audit logs found</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Admin actions will appear here once performed
                </p>
              </div>
            ) : (
              filteredLogs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-start justify-between p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                      {getActionIcon(log.action)}
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground">
                          {log.action.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                        </span>
                        <Badge variant={getActionBadgeVariant(log.action)}>
                          {log.entity_type}
                        </Badge>
                      </div>
                      {log.details && Object.keys(log.details).length > 0 && (
                        <div className="text-sm text-muted-foreground">
                          {Object.entries(log.details).map(([key, value]) => (
                            <span key={key} className="mr-3">
                              <span className="text-foreground/70">{key}:</span>{" "}
                              {String(value)}
                            </span>
                          ))}
                        </div>
                      )}
                      {log.entity_id && (
                        <div className="text-xs text-muted-foreground font-mono">
                          ID: {log.entity_id}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground whitespace-nowrap">
                    {format(new Date(log.created_at), "MMM d, h:mm a")}
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
