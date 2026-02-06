import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { MessageSquare, Calendar, TrendingUp, Clock, Loader2, Trash2, Download, FileJson, FileText, Zap, Sparkles, Shield, BarChart3, Users } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useAdminRole } from "@/hooks/useAdminRole";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { format, subDays, startOfDay } from "date-fns";
import { useChatNotifications } from "@/hooks/useChatNotifications";
import { exportAsJSON, exportAsPDF } from "@/lib/exportChat";
import { ProductivityInsights } from "@/components/ProductivityInsights";
import { WorkflowBuilder } from "@/components/WorkflowBuilder";
import { AdminUserManagement } from "@/components/admin/AdminUserManagement";
import { AdminWorkflowAnalytics } from "@/components/admin/AdminWorkflowAnalytics";
import { AdminSystemSettings } from "@/components/admin/AdminSystemSettings";
import { AdminAuditLogs } from "@/components/admin/AdminAuditLogs";
import { AdvancedAnalytics } from "@/components/AdvancedAnalytics";
import { AIWorkflowAssistant } from "@/components/AIWorkflowAssistant";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Conversation {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  message_count: number;
}

interface Analytics {
  totalConversations: number;
  totalMessages: number;
  conversationsToday: number;
  messagesThisWeek: number;
}

const Dashboard = () => {
  const { t } = useTranslation();
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdminRole();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [analytics, setAnalytics] = useState<Analytics>({
    totalConversations: 0,
    totalMessages: 0,
    conversationsToday: 0,
    messagesThisWeek: 0,
  });
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [exporting, setExporting] = useState<string | null>(null);

  // Enable real-time notifications
  useChatNotifications();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;

      try {
        // Fetch conversations with message count
        const { data: convData, error: convError } = await supabase
          .from("chat_conversations")
          .select("id, title, created_at, updated_at")
          .eq("user_id", user.id)
          .order("updated_at", { ascending: false });

        if (convError) throw convError;

        // Fetch message counts for each conversation
        const conversationsWithCounts = await Promise.all(
          (convData || []).map(async (conv) => {
            const { count } = await supabase
              .from("chat_messages")
              .select("*", { count: "exact", head: true })
              .eq("conversation_id", conv.id);
            return { ...conv, message_count: count || 0 };
          })
        );

        setConversations(conversationsWithCounts);

        // Calculate analytics
        const today = new Date();
        const todayStart = startOfDay(today);
        const weekAgo = subDays(today, 7);

        const { count: totalMessages } = await supabase
          .from("chat_messages")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id);

        const conversationsToday = conversationsWithCounts.filter(
          (c) => new Date(c.created_at) >= todayStart
        ).length;

        const { count: messagesThisWeek } = await supabase
          .from("chat_messages")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id)
          .gte("created_at", weekAgo.toISOString());

        setAnalytics({
          totalConversations: conversationsWithCounts.length,
          totalMessages: totalMessages || 0,
          conversationsToday,
          messagesThisWeek: messagesThisWeek || 0,
        });
      } catch (error) {
        console.error("Error fetching data:", error);
        toast.error(t("dashboard.failedToLoad"));
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchData();
    }
  }, [user]);

  const handleDeleteConversation = async (conversationId: string) => {
    setDeleting(conversationId);
    try {
      const { error } = await supabase
        .from("chat_conversations")
        .delete()
        .eq("id", conversationId);

      if (error) throw error;

      setConversations((prev) => prev.filter((c) => c.id !== conversationId));
      setAnalytics((prev) => ({
        ...prev,
        totalConversations: prev.totalConversations - 1,
      }));
      toast.success(t("dashboard.conversationDeleted"));
    } catch (error) {
      console.error("Error deleting conversation:", error);
      toast.error(t("dashboard.failedToDelete"));
    } finally {
      setDeleting(null);
    }
  };

  const handleExport = async (conversationId: string, exportType: "json" | "pdf") => {
    setExporting(conversationId);
    try {
      const conversation = conversations.find((c) => c.id === conversationId);
      if (!conversation) throw new Error("Conversation not found");

      const { data: messages, error } = await supabase
        .from("chat_messages")
        .select("role, content, created_at")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });

      if (error) throw error;

      const exportData = {
        conversation,
        messages: messages || [],
      };

      if (exportType === "json") {
        exportAsJSON(exportData);
        toast.success(t("dashboard.exportedAsJson"));
      } else {
        exportAsPDF(exportData);
        toast.success(t("dashboard.exportedAsPdf"));
      }
    } catch (error) {
      console.error("Error exporting:", error);
      toast.error(t("dashboard.failedToExport"));
    } finally {
      setExporting(null);
    }
  };

  if (authLoading || loading || adminLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 pt-24 sm:pt-32 pb-8 sm:pb-16">
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-6 sm:mb-8">{t("dashboard.title")}</h1>

        <Tabs defaultValue="overview" className="space-y-6 sm:space-y-8">
          <TabsList className={`grid w-full ${isAdmin ? 'grid-cols-3 sm:grid-cols-5 max-w-3xl' : 'grid-cols-2 sm:grid-cols-4 max-w-2xl'} h-auto`}>
            <TabsTrigger value="overview" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm py-2">
              <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden xs:inline">{t("dashboard.overview")}</span>
              <span className="xs:hidden">{t("dashboard.overview")}</span>
            </TabsTrigger>
            <TabsTrigger value="insights" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm py-2">
              <Sparkles className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">{t("dashboard.aiInsights")}</span>
              <span className="sm:hidden">AI</span>
            </TabsTrigger>
            <TabsTrigger value="workflows" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm py-2">
              <Zap className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">{t("dashboard.workflows")}</span>
              <span className="sm:hidden">{t("dashboard.workflows")}</span>
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm py-2">
              <BarChart3 className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">{t("dashboard.analytics")}</span>
              <span className="sm:hidden">{t("dashboard.analytics")}</span>
            </TabsTrigger>
            {isAdmin && (
              <TabsTrigger value="admin" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm py-2">
                <Shield className="w-3 h-3 sm:w-4 sm:h-4" />
                {t("dashboard.admin")}
              </TabsTrigger>
            )}
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6 sm:space-y-8">
            {/* Analytics Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
              <Card className="bg-card border-border">
                <CardHeader className="flex flex-row items-center justify-between pb-2 p-3 sm:p-6">
                  <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
                    {t("dashboard.conversations")}
                  </CardTitle>
                  <MessageSquare className="h-3 w-3 sm:h-4 sm:w-4 text-primary" />
                </CardHeader>
                <CardContent className="p-3 sm:p-6 pt-0">
                  <div className="text-2xl sm:text-3xl font-bold text-foreground">
                    {analytics.totalConversations}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card border-border">
                <CardHeader className="flex flex-row items-center justify-between pb-2 p-3 sm:p-6">
                  <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
                    {t("dashboard.messages")}
                  </CardTitle>
                  <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-primary" />
                </CardHeader>
                <CardContent className="p-3 sm:p-6 pt-0">
                  <div className="text-2xl sm:text-3xl font-bold text-foreground">
                    {analytics.totalMessages}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card border-border">
                <CardHeader className="flex flex-row items-center justify-between pb-2 p-3 sm:p-6">
                  <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
                    {t("dashboard.today")}
                  </CardTitle>
                  <Calendar className="h-3 w-3 sm:h-4 sm:w-4 text-primary" />
                </CardHeader>
                <CardContent className="p-3 sm:p-6 pt-0">
                  <div className="text-2xl sm:text-3xl font-bold text-foreground">
                    {analytics.conversationsToday}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card border-border">
                <CardHeader className="flex flex-row items-center justify-between pb-2 p-3 sm:p-6">
                  <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
                    {t("dashboard.thisWeek")}
                  </CardTitle>
                  <Clock className="h-3 w-3 sm:h-4 sm:w-4 text-primary" />
                </CardHeader>
                <CardContent className="p-3 sm:p-6 pt-0">
                  <div className="text-2xl sm:text-3xl font-bold text-foreground">
                    {analytics.messagesThisWeek}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Chat History */}
            <Card className="bg-card border-border">
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="text-foreground text-lg sm:text-xl">{t("dashboard.chatHistory")}</CardTitle>
                <CardDescription className="text-sm">{t("dashboard.chatHistoryDesc")}</CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 pt-0">
                {conversations.length === 0 ? (
                  <div className="text-center py-8 sm:py-12">
                    <MessageSquare className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">{t("dashboard.noConversations")}</p>
                    <p className="text-xs sm:text-sm text-muted-foreground mt-2">
                      {t("dashboard.noConversationsDesc")}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3 sm:space-y-4">
                    {conversations.map((conversation) => (
                      <div
                        key={conversation.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors gap-2 sm:gap-4"
                      >
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-foreground truncate text-sm sm:text-base">
                            {conversation.title}
                          </h3>
                          <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-1 text-xs sm:text-sm text-muted-foreground">
                            <span>{conversation.message_count} {t("dashboard.messages").toLowerCase()}</span>
                            <span className="hidden sm:inline">•</span>
                            <span>
                              {format(new Date(conversation.updated_at), "MMM d, yyyy")}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 justify-end">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-muted-foreground hover:text-primary h-8 w-8 sm:h-10 sm:w-10"
                                disabled={exporting === conversation.id}
                              >
                                {exporting === conversation.id ? (
                                  <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
                                ) : (
                                  <Download className="h-3 w-3 sm:h-4 sm:w-4" />
                                )}
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleExport(conversation.id, "json")}>
                                <FileJson className="h-4 w-4 mr-2" />
                                {t("dashboard.exportAsJson")}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleExport(conversation.id, "pdf")}>
                                <FileText className="h-4 w-4 mr-2" />
                                {t("dashboard.exportAsPdf")}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-muted-foreground hover:text-destructive h-8 w-8 sm:h-10 sm:w-10"
                            onClick={() => handleDeleteConversation(conversation.id)}
                            disabled={deleting === conversation.id}
                          >
                            {deleting === conversation.id ? (
                              <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* AI Insights Tab */}
          <TabsContent value="insights">
            <ProductivityInsights />
          </TabsContent>

          {/* Workflows Tab */}
          <TabsContent value="workflows">
            <WorkflowBuilder />
            <AIWorkflowAssistant />
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics">
            <AdvancedAnalytics />
          </TabsContent>

          {/* Admin Tab - Only visible to admins */}
          {isAdmin && (
            <TabsContent value="admin" className="space-y-6 sm:space-y-8">
              <div className="flex items-center gap-2 mb-4">
                <Shield className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                <h2 className="text-xl sm:text-2xl font-bold text-foreground">{t("dashboard.adminPanel")}</h2>
              </div>
              
              <Tabs defaultValue="users" className="space-y-4 sm:space-y-6">
                <TabsList className="grid w-full max-w-lg grid-cols-2 sm:grid-cols-4 h-auto">
                  <TabsTrigger value="users" className="text-xs sm:text-sm py-2">{t("dashboard.users")}</TabsTrigger>
                  <TabsTrigger value="analytics" className="text-xs sm:text-sm py-2">{t("dashboard.analytics")}</TabsTrigger>
                  <TabsTrigger value="settings" className="text-xs sm:text-sm py-2">{t("dashboard.settings")}</TabsTrigger>
                  <TabsTrigger value="audit" className="text-xs sm:text-sm py-2">{t("dashboard.audit")}</TabsTrigger>
                </TabsList>
                
                <TabsContent value="users">
                  <AdminUserManagement />
                </TabsContent>
                
                <TabsContent value="analytics">
                  <AdminWorkflowAnalytics />
                </TabsContent>
                
                <TabsContent value="settings">
                  <AdminSystemSettings />
                </TabsContent>

                <TabsContent value="audit">
                  <AdminAuditLogs />
                </TabsContent>
              </Tabs>
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
};

export default Dashboard;
