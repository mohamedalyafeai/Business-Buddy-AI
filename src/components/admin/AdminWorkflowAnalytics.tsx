import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { BarChart3, Zap, CheckCircle, XCircle, Clock, Loader2, Activity } from "lucide-react";
import { format, subDays } from "date-fns";

interface WorkflowStats {
  totalWorkflows: number;
  activeWorkflows: number;
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  avgExecutionTime: number;
}

interface RecentExecution {
  id: string;
  workflow_id: string;
  workflow_name: string;
  status: string;
  started_at: string;
  completed_at: string | null;
  error: string | null;
}

export const AdminWorkflowAnalytics = () => {
  const [stats, setStats] = useState<WorkflowStats>({
    totalWorkflows: 0,
    activeWorkflows: 0,
    totalExecutions: 0,
    successfulExecutions: 0,
    failedExecutions: 0,
    avgExecutionTime: 0,
  });
  const [recentExecutions, setRecentExecutions] = useState<RecentExecution[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      // Fetch workflows
      const { data: workflows, error: workflowsError } = await supabase
        .from("workflows")
        .select("id, name, is_active");

      if (workflowsError) throw workflowsError;

      // Fetch executions
      const { data: executions, error: executionsError } = await supabase
        .from("workflow_executions")
        .select("id, workflow_id, status, started_at, completed_at, error")
        .order("started_at", { ascending: false })
        .limit(100);

      if (executionsError) throw executionsError;

      // Calculate stats
      const totalWorkflows = workflows?.length || 0;
      const activeWorkflows = workflows?.filter((w) => w.is_active).length || 0;
      const totalExecutions = executions?.length || 0;
      const successfulExecutions = executions?.filter((e) => e.status === "completed").length || 0;
      const failedExecutions = executions?.filter((e) => e.status === "failed").length || 0;

      // Calculate average execution time
      const completedExecs = executions?.filter((e) => e.completed_at) || [];
      const avgTime =
        completedExecs.length > 0
          ? completedExecs.reduce((acc, e) => {
              const start = new Date(e.started_at).getTime();
              const end = new Date(e.completed_at!).getTime();
              return acc + (end - start);
            }, 0) / completedExecs.length
          : 0;

      setStats({
        totalWorkflows,
        activeWorkflows,
        totalExecutions,
        successfulExecutions,
        failedExecutions,
        avgExecutionTime: Math.round(avgTime / 1000), // Convert to seconds
      });

      // Map recent executions with workflow names
      const recentExecsWithNames: RecentExecution[] = (executions || []).slice(0, 10).map((exec) => {
        const workflow = workflows?.find((w) => w.id === exec.workflow_id);
        return {
          ...exec,
          workflow_name: workflow?.name || "Unknown Workflow",
        };
      });

      setRecentExecutions(recentExecsWithNames);
    } catch (error) {
      console.error("Error fetching analytics:", error);
      toast.error("Failed to load workflow analytics");
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "failed":
        return <XCircle className="h-4 w-4 text-destructive" />;
      case "running":
        return <Loader2 className="h-4 w-4 animate-spin text-primary" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-green-500/20 text-green-500 border-green-500/30">Completed</Badge>;
      case "failed":
        return <Badge variant="destructive">Failed</Badge>;
      case "running":
        return <Badge variant="default">Running</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const successRate = stats.totalExecutions > 0 
    ? Math.round((stats.successfulExecutions / stats.totalExecutions) * 100) 
    : 0;

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Workflows
            </CardTitle>
            <Zap className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">{stats.totalWorkflows}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.activeWorkflows} active
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Executions
            </CardTitle>
            <Activity className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">{stats.totalExecutions}</div>
            <p className="text-xs text-muted-foreground mt-1">All time</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Success Rate
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">{successRate}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.successfulExecutions} successful
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Avg Execution Time
            </CardTitle>
            <Clock className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">{stats.avgExecutionTime}s</div>
            <p className="text-xs text-muted-foreground mt-1">Per workflow</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Executions */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            Recent Executions
          </CardTitle>
          <CardDescription>Latest workflow execution history across all users</CardDescription>
        </CardHeader>
        <CardContent>
          {recentExecutions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No executions yet
            </div>
          ) : (
            <div className="space-y-3">
              {recentExecutions.map((exec) => (
                <div
                  key={exec.id}
                  className="flex items-center justify-between p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    {getStatusIcon(exec.status)}
                    <div>
                      <div className="font-medium text-foreground">{exec.workflow_name}</div>
                      <div className="text-sm text-muted-foreground">
                        Started {format(new Date(exec.started_at), "MMM d, yyyy h:mm a")}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {getStatusBadge(exec.status)}
                    {exec.completed_at && (
                      <span className="text-sm text-muted-foreground">
                        {Math.round(
                          (new Date(exec.completed_at).getTime() -
                            new Date(exec.started_at).getTime()) /
                            1000
                        )}
                        s
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
