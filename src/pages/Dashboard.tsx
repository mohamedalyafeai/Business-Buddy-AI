import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { MessageSquare, Calendar, TrendingUp, Clock, Loader2, Trash2, Download, FileJson, FileText, Zap, Sparkles } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
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
  const { user, loading: authLoading } = useAuth();
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
        toast.error("Failed to load dashboard data");
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
      toast.success("Conversation deleted");
    } catch (error) {
      console.error("Error deleting conversation:", error);
      toast.error("Failed to delete conversation");
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
        toast.success("Exported as JSON");
      } else {
        exportAsPDF(exportData);
        toast.success("Exported as PDF");
      }
    } catch (error) {
      console.error("Error exporting:", error);
      toast.error("Failed to export conversation");
    } finally {
      setExporting(null);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 pt-32 pb-16">
        <h1 className="text-3xl font-bold text-foreground mb-8">Dashboard</h1>

        <Tabs defaultValue="overview" className="space-y-8">
          <TabsList className="grid w-full max-w-md grid-cols-3">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="insights" className="flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              AI Insights
            </TabsTrigger>
            <TabsTrigger value="workflows" className="flex items-center gap-2">
              <Zap className="w-4 h-4" />
              Workflows
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-8">
            {/* Analytics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="bg-card border-border">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total Conversations
                  </CardTitle>
                  <MessageSquare className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-foreground">
                    {analytics.totalConversations}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card border-border">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total Messages
                  </CardTitle>
                  <TrendingUp className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-foreground">
                    {analytics.totalMessages}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card border-border">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Conversations Today
                  </CardTitle>
                  <Calendar className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-foreground">
                    {analytics.conversationsToday}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card border-border">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Messages This Week
                  </CardTitle>
                  <Clock className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-foreground">
                    {analytics.messagesThisWeek}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Chat History */}
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-foreground">Chat History</CardTitle>
                <CardDescription>Your recent conversations with AgentAI</CardDescription>
              </CardHeader>
              <CardContent>
                {conversations.length === 0 ? (
                  <div className="text-center py-12">
                    <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No conversations yet</p>
                    <p className="text-sm text-muted-foreground mt-2">
                      Start chatting with AgentAI to see your history here
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {conversations.map((conversation) => (
                      <div
                        key={conversation.id}
                        className="flex items-center justify-between p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-foreground truncate">
                            {conversation.title}
                          </h3>
                          <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                            <span>{conversation.message_count} messages</span>
                            <span>•</span>
                            <span>
                              {format(new Date(conversation.updated_at), "MMM d, yyyy h:mm a")}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-muted-foreground hover:text-primary"
                                disabled={exporting === conversation.id}
                              >
                                {exporting === conversation.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Download className="h-4 w-4" />
                                )}
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleExport(conversation.id, "json")}>
                                <FileJson className="h-4 w-4 mr-2" />
                                Export as JSON
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleExport(conversation.id, "pdf")}>
                                <FileText className="h-4 w-4 mr-2" />
                                Export as PDF
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-muted-foreground hover:text-destructive"
                            onClick={() => handleDeleteConversation(conversation.id)}
                            disabled={deleting === conversation.id}
                          >
                            {deleting === conversation.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
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
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Dashboard;
