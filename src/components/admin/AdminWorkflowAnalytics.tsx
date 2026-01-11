import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { BarChart3, Zap, CheckCircle, XCircle, Clock, Loader2, Activity, TrendingUp, PieChart } from "lucide-react";
import { format, subDays, startOfDay, eachDayOfInterval } from "date-fns";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts";

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

interface DailyExecution {
  date: string;
  successful: number;
  failed: number;
  total: number;
}

interface WorkflowPerformance {
  name: string;
  executions: number;
  successRate: number;
  avgTime: number;
}

const chartConfig = {
  successful: {
    label: "Successful",
    color: "hsl(var(--chart-2))",
  },
  failed: {
    label: "Failed",
    color: "hsl(var(--destructive))",
  },
  total: {
    label: "Total",
    color: "hsl(var(--primary))",
  },
};

const COLORS = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"];

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
  const [dailyExecutions, setDailyExecutions] = useState<DailyExecution[]>([]);
  const [workflowPerformance, setWorkflowPerformance] = useState<WorkflowPerformance[]>([]);
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
        .limit(500);

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
        avgExecutionTime: Math.round(avgTime / 1000),
      });

      // Calculate daily executions for the last 7 days
      const last7Days = eachDayOfInterval({
        start: subDays(new Date(), 6),
        end: new Date(),
      });

      const dailyData: DailyExecution[] = last7Days.map((day) => {
        const dayStart = startOfDay(day);
        const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
        
        const dayExecs = executions?.filter((e) => {
          const execDate = new Date(e.started_at);
          return execDate >= dayStart && execDate < dayEnd;
        }) || [];

        return {
          date: format(day, "MMM dd"),
          successful: dayExecs.filter((e) => e.status === "completed").length,
          failed: dayExecs.filter((e) => e.status === "failed").length,
          total: dayExecs.length,
        };
      });

      setDailyExecutions(dailyData);

      // Calculate workflow performance
      const workflowPerfMap = new Map<string, { name: string; total: number; successful: number; totalTime: number; completedCount: number }>();
      
      workflows?.forEach((w) => {
        workflowPerfMap.set(w.id, { name: w.name, total: 0, successful: 0, totalTime: 0, completedCount: 0 });
      });

      executions?.forEach((exec) => {
        const perf = workflowPerfMap.get(exec.workflow_id);
        if (perf) {
          perf.total++;
          if (exec.status === "completed") {
            perf.successful++;
          }
          if (exec.completed_at) {
            perf.totalTime += new Date(exec.completed_at).getTime() - new Date(exec.started_at).getTime();
            perf.completedCount++;
          }
        }
      });

      const perfData: WorkflowPerformance[] = Array.from(workflowPerfMap.values())
        .filter((p) => p.total > 0)
        .map((p) => ({
          name: p.name.length > 15 ? p.name.substring(0, 15) + "..." : p.name,
          executions: p.total,
          successRate: p.total > 0 ? Math.round((p.successful / p.total) * 100) : 0,
          avgTime: p.completedCount > 0 ? Math.round(p.totalTime / p.completedCount / 1000) : 0,
        }))
        .sort((a, b) => b.executions - a.executions)
        .slice(0, 5);

      setWorkflowPerformance(perfData);

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

  const pieData = [
    { name: "Successful", value: stats.successfulExecutions, fill: "hsl(var(--chart-2))" },
    { name: "Failed", value: stats.failedExecutions, fill: "hsl(var(--destructive))" },
    { name: "Running", value: stats.totalExecutions - stats.successfulExecutions - stats.failedExecutions, fill: "hsl(var(--primary))" },
  ].filter((d) => d.value > 0);

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

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Executions Chart */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Daily Executions (Last 7 Days)
            </CardTitle>
            <CardDescription>Workflow execution trends over the past week</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[300px] w-full">
              <AreaChart data={dailyExecutions} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorSuccessful" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0.1}/>
                  </linearGradient>
                  <linearGradient id="colorFailed" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--destructive))" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="hsl(var(--destructive))" stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" className="text-xs fill-muted-foreground" />
                <YAxis className="text-xs fill-muted-foreground" />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Area
                  type="monotone"
                  dataKey="successful"
                  stroke="hsl(var(--chart-2))"
                  fillOpacity={1}
                  fill="url(#colorSuccessful)"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="failed"
                  stroke="hsl(var(--destructive))"
                  fillOpacity={1}
                  fill="url(#colorFailed)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Execution Status Pie Chart */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5 text-primary" />
              Execution Status Distribution
            </CardTitle>
            <CardDescription>Overall success vs failure rate</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full flex items-center justify-center">
              {pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      labelLine={false}
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <ChartTooltip />
                  </RechartsPieChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center text-muted-foreground">
                  No execution data available
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Workflow Performance Bar Chart */}
      {workflowPerformance.length > 0 && (
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              Top Workflow Performance
            </CardTitle>
            <CardDescription>Most executed workflows and their success rates</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[300px] w-full">
              <BarChart data={workflowPerformance} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="name" className="text-xs fill-muted-foreground" />
                <YAxis className="text-xs fill-muted-foreground" />
                <ChartTooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-popover border border-border rounded-lg p-3 shadow-lg">
                          <p className="font-medium text-foreground">{data.name}</p>
                          <p className="text-sm text-muted-foreground">Executions: {data.executions}</p>
                          <p className="text-sm text-muted-foreground">Success Rate: {data.successRate}%</p>
                          <p className="text-sm text-muted-foreground">Avg Time: {data.avgTime}s</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="executions" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      )}

      {/* Recent Executions */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
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