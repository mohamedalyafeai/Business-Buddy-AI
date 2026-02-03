import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  BarChart3, TrendingUp, Clock, CheckCircle2, XCircle,
  Activity, Download, Calendar, ArrowUpRight, ArrowDownRight
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "react-i18next";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { ar, enUS } from "date-fns/locale";
import jsPDF from "jspdf";

interface AnalyticsData {
  totalWorkflows: number;
  activeWorkflows: number;
  totalExecutions: number;
  successRate: number;
  avgExecutionTime: number;
  executionsByDay: { date: string; count: number; success: number; failed: number }[];
  workflowDistribution: { name: string; value: number }[];
  recentExecutions: any[];
}

export const AdvancedAnalytics = () => {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<"7d" | "30d" | "90d">("7d");
  const { user } = useAuth();
  const { i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';

  useEffect(() => {
    if (!user) return;
    fetchAnalytics();
  }, [user, dateRange]);

  const fetchAnalytics = async () => {
    if (!user) return;
    setLoading(true);

    const days = dateRange === "7d" ? 7 : dateRange === "30d" ? 30 : 90;
    const startDate = subDays(new Date(), days);

    try {
      // Fetch workflows
      const { data: workflows } = await supabase
        .from('workflows')
        .select('*')
        .eq('user_id', user.id);

      // Fetch executions
      const { data: executions } = await supabase
        .from('workflow_executions')
        .select('*')
        .eq('user_id', user.id)
        .gte('started_at', startDate.toISOString())
        .order('started_at', { ascending: false });

      if (!workflows || !executions) {
        setData(null);
        setLoading(false);
        return;
      }

      // Calculate metrics
      const successCount = executions.filter(e => e.status === 'completed').length;
      const successRate = executions.length > 0 
        ? Math.round((successCount / executions.length) * 100) 
        : 0;

      // Calculate avg execution time
      const completedExecutions = executions.filter(e => e.completed_at);
      const avgTime = completedExecutions.length > 0
        ? completedExecutions.reduce((acc, e) => {
            const start = new Date(e.started_at).getTime();
            const end = new Date(e.completed_at!).getTime();
            return acc + (end - start);
          }, 0) / completedExecutions.length / 1000
        : 0;

      // Group executions by day
      const executionsByDay: Record<string, { count: number; success: number; failed: number }> = {};
      for (let i = 0; i < days; i++) {
        const date = format(subDays(new Date(), i), 'yyyy-MM-dd');
        executionsByDay[date] = { count: 0, success: 0, failed: 0 };
      }

      executions.forEach(e => {
        const date = format(new Date(e.started_at), 'yyyy-MM-dd');
        if (executionsByDay[date]) {
          executionsByDay[date].count++;
          if (e.status === 'completed') {
            executionsByDay[date].success++;
          } else if (e.status === 'failed') {
            executionsByDay[date].failed++;
          }
        }
      });

      // Workflow distribution by trigger type
      const triggerCounts: Record<string, number> = {};
      workflows.forEach(w => {
        triggerCounts[w.trigger_type] = (triggerCounts[w.trigger_type] || 0) + 1;
      });

      setData({
        totalWorkflows: workflows.length,
        activeWorkflows: workflows.filter(w => w.is_active).length,
        totalExecutions: executions.length,
        successRate,
        avgExecutionTime: Math.round(avgTime * 10) / 10,
        executionsByDay: Object.entries(executionsByDay)
          .map(([date, data]) => ({ date, ...data }))
          .reverse(),
        workflowDistribution: Object.entries(triggerCounts)
          .map(([name, value]) => ({ name, value })),
        recentExecutions: executions.slice(0, 10),
      });
    } catch (error) {
      console.error("Failed to fetch analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  const exportToPDF = () => {
    if (!data) return;

    const doc = new jsPDF();
    const isArabic = i18n.language === 'ar';

    doc.setFontSize(20);
    doc.text(isArabic ? "تقرير التحليلات" : "Analytics Report", 105, 20, { align: 'center' });
    
    doc.setFontSize(12);
    doc.text(format(new Date(), 'PPP', { locale: isArabic ? ar : enUS }), 105, 30, { align: 'center' });

    doc.setFontSize(14);
    let y = 50;

    doc.text(isArabic ? "ملخص:" : "Summary:", 20, y);
    y += 10;

    doc.setFontSize(11);
    doc.text(`${isArabic ? "إجمالي العمليات" : "Total Workflows"}: ${data.totalWorkflows}`, 25, y);
    y += 7;
    doc.text(`${isArabic ? "العمليات النشطة" : "Active Workflows"}: ${data.activeWorkflows}`, 25, y);
    y += 7;
    doc.text(`${isArabic ? "إجمالي التنفيذات" : "Total Executions"}: ${data.totalExecutions}`, 25, y);
    y += 7;
    doc.text(`${isArabic ? "معدل النجاح" : "Success Rate"}: ${data.successRate}%`, 25, y);
    y += 7;
    doc.text(`${isArabic ? "متوسط وقت التنفيذ" : "Avg Execution Time"}: ${data.avgExecutionTime}s`, 25, y);

    doc.save('analytics-report.pdf');
  };

  const COLORS = ['#8B5CF6', '#F59E0B', '#10B981', '#EF4444', '#3B82F6'];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Activity className="w-8 h-8 animate-pulse text-primary" />
      </div>
    );
  }

  if (!data) {
    return (
      <Card className="p-8 text-center">
        <BarChart3 className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
        <p className="text-muted-foreground">
          {isRTL ? "لا توجد بيانات كافية للتحليل" : "Not enough data for analytics"}
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-primary" />
            {isRTL ? "التحليلات المتقدمة" : "Advanced Analytics"}
          </h2>
          <p className="text-muted-foreground">
            {isRTL ? "رؤى تفصيلية حول أداء عملياتك" : "Detailed insights into your workflow performance"}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Tabs value={dateRange} onValueChange={(v) => setDateRange(v as any)}>
            <TabsList>
              <TabsTrigger value="7d">{isRTL ? "7 أيام" : "7 Days"}</TabsTrigger>
              <TabsTrigger value="30d">{isRTL ? "30 يوم" : "30 Days"}</TabsTrigger>
              <TabsTrigger value="90d">{isRTL ? "90 يوم" : "90 Days"}</TabsTrigger>
            </TabsList>
          </Tabs>

          <Button variant="outline" onClick={exportToPDF}>
            <Download className="w-4 h-4 me-2" />
            {isRTL ? "تصدير PDF" : "Export PDF"}
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="bg-gradient-to-br from-violet-500/10 to-purple-500/10 border-violet-500/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">
                    {isRTL ? "إجمالي العمليات" : "Total Workflows"}
                  </p>
                  <p className="text-3xl font-bold">{data.totalWorkflows}</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-violet-500/20 flex items-center justify-center">
                  <Activity className="w-6 h-6 text-violet-500" />
                </div>
              </div>
              <div className="mt-4 flex items-center text-sm">
                <Badge variant="secondary" className="bg-green-500/20 text-green-500">
                  {data.activeWorkflows} {isRTL ? "نشط" : "active"}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border-blue-500/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">
                    {isRTL ? "إجمالي التنفيذات" : "Total Executions"}
                  </p>
                  <p className="text-3xl font-bold">{data.totalExecutions}</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-blue-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">
                    {isRTL ? "معدل النجاح" : "Success Rate"}
                  </p>
                  <p className="text-3xl font-bold">{data.successRate}%</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6 text-green-500" />
                </div>
              </div>
              <div className="mt-4 flex items-center text-sm text-green-500">
                <ArrowUpRight className="w-4 h-4 me-1" />
                {isRTL ? "أداء ممتاز" : "Excellent performance"}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 border-amber-500/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">
                    {isRTL ? "متوسط الوقت" : "Avg Time"}
                  </p>
                  <p className="text-3xl font-bold">{data.avgExecutionTime}s</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center">
                  <Clock className="w-6 h-6 text-amber-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Executions Over Time */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              {isRTL ? "التنفيذات عبر الزمن" : "Executions Over Time"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={data.executionsByDay}>
                <defs>
                  <linearGradient id="colorSuccess" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorFailed" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#EF4444" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#EF4444" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={(value) => format(new Date(value), 'MMM d')}
                  className="text-muted-foreground"
                />
                <YAxis className="text-muted-foreground" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="success" 
                  stroke="#10B981" 
                  fillOpacity={1} 
                  fill="url(#colorSuccess)" 
                  name={isRTL ? "ناجح" : "Success"}
                />
                <Area 
                  type="monotone" 
                  dataKey="failed" 
                  stroke="#EF4444" 
                  fillOpacity={1} 
                  fill="url(#colorFailed)" 
                  name={isRTL ? "فاشل" : "Failed"}
                />
                <Legend />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Workflow Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" />
              {isRTL ? "توزيع العمليات" : "Workflow Distribution"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={data.workflowDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {data.workflowDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
