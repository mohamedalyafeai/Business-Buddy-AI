import { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  ArrowLeft, Clock, Mail, FileText, Calendar, CheckSquare, 
  MessageSquare, Zap, Bot, Webhook, Send, Database, 
  GitBranch, Loader2, Eye, Copy, Download, AlertCircle
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

interface WorkflowNode {
  id: string;
  type: "trigger" | "action" | "ai" | "condition";
  nodeType: string;
  config: Record<string, string>;
  label: string;
}

interface Condition {
  id: string;
  field: string;
  operator: string;
  value: string;
  thenAction: string;
  elseAction: string;
}

interface SharedWorkflowData {
  id: string;
  name: string;
  trigger_type: string;
  trigger_config: Record<string, unknown>;
  ai_action_type: string;
  ai_config: Record<string, unknown>;
  output_action_type: string;
  output_config: Record<string, unknown>;
  conditions: Condition[];
  created_at: string;
}

const nodeTypes = {
  triggers: [
    { id: "schedule", label: "Schedule", icon: Clock },
    { id: "webhook", label: "Webhook", icon: Webhook },
    { id: "email_received", label: "Email Received", icon: Mail },
  ],
  actions: [
    { id: "send_email", label: "Send Email", icon: Send },
    { id: "create_task", label: "Create Task", icon: CheckSquare },
    { id: "save_data", label: "Save Data", icon: Database },
    { id: "calendar_event", label: "Calendar Event", icon: Calendar },
  ],
  ai: [
    { id: "ai_summarize", label: "AI Summarize", icon: Bot },
    { id: "ai_draft", label: "AI Draft", icon: FileText },
    { id: "ai_analyze", label: "AI Analyze", icon: Zap },
    { id: "ai_respond", label: "AI Respond", icon: MessageSquare },
  ],
  conditions: [
    { id: "condition", label: "Condition", icon: GitBranch },
  ],
};

const getNodeIcon = (nodeType: string) => {
  const allNodes = [
    ...nodeTypes.triggers,
    ...nodeTypes.actions,
    ...nodeTypes.ai,
    ...nodeTypes.conditions,
  ];
  return allNodes.find(n => n.id === nodeType)?.icon || Zap;
};

const getNodeLabel = (nodeType: string) => {
  const allNodes = [
    ...nodeTypes.triggers,
    ...nodeTypes.actions,
    ...nodeTypes.ai,
    ...nodeTypes.conditions,
  ];
  return allNodes.find(n => n.id === nodeType)?.label || nodeType;
};

const dbToNodes = (workflow: SharedWorkflowData): WorkflowNode[] => {
  const nodes: WorkflowNode[] = [];
  
  if (workflow.trigger_type) {
    nodes.push({
      id: `trigger-${workflow.id}`,
      type: "trigger",
      nodeType: workflow.trigger_type,
      config: workflow.trigger_config as Record<string, string> || {},
      label: getNodeLabel(workflow.trigger_type),
    });
  }
  
  if (workflow.ai_action_type && workflow.ai_action_type !== "none") {
    nodes.push({
      id: `ai-${workflow.id}`,
      type: "ai",
      nodeType: workflow.ai_action_type,
      config: workflow.ai_config as Record<string, string> || {},
      label: getNodeLabel(workflow.ai_action_type),
    });
  }
  
  if (workflow.output_action_type && workflow.output_action_type !== "none") {
    nodes.push({
      id: `action-${workflow.id}`,
      type: "action",
      nodeType: workflow.output_action_type,
      config: workflow.output_config as Record<string, string> || {},
      label: getNodeLabel(workflow.output_action_type),
    });
  }
  
  return nodes;
};

export default function SharedWorkflow() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const { user } = useAuth();
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [workflow, setWorkflow] = useState<SharedWorkflowData | null>(null);
  const [shareInfo, setShareInfo] = useState<{ created_at: string; view_count: number } | null>(null);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    if (token) {
      fetchSharedWorkflow();
    } else {
      setError("رابط المشاركة غير صالح");
      setIsLoading(false);
    }
  }, [token]);

  const fetchSharedWorkflow = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("get-shared-workflow", {
        body: null,
        method: "GET",
      });

      // Use fetch directly since we need query params
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-shared-workflow?token=${token}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to fetch workflow");
      }

      setWorkflow(result.workflow);
      setShareInfo(result.share);
    } catch (err: unknown) {
      console.error("Error fetching shared workflow:", err);
      setError(err instanceof Error ? err.message : "حدث خطأ في تحميل سير العمل");
    } finally {
      setIsLoading(false);
    }
  };

  const handleImport = async () => {
    if (!user) {
      toast.error("يجب تسجيل الدخول لاستيراد سير العمل");
      return;
    }

    if (!workflow) return;

    setImporting(true);
    try {
      const { error } = await supabase.from("workflows").insert([{
        user_id: user.id,
        name: `${workflow.name} (نسخة)`,
        trigger_type: workflow.trigger_type,
        trigger_config: workflow.trigger_config as unknown as Record<string, never>,
        ai_action_type: workflow.ai_action_type,
        ai_config: workflow.ai_config as unknown as Record<string, never>,
        output_action_type: workflow.output_action_type,
        output_config: workflow.output_config as unknown as Record<string, never>,
        conditions: workflow.conditions as unknown as Record<string, never>[],
        is_active: false,
      }]);

      if (error) throw error;

      toast.success("تم استيراد سير العمل بنجاح!");
    } catch (err) {
      console.error("Error importing workflow:", err);
      toast.error("فشل في استيراد سير العمل");
    } finally {
      setImporting(false);
    }
  };

  const handleExportJSON = () => {
    if (!workflow) return;

    const nodes = dbToNodes(workflow);
    const exportData = {
      name: workflow.name,
      nodes: nodes.map(({ id, ...rest }) => rest),
      conditions: workflow.conditions?.map(({ id, ...rest }) => rest) || [],
      exportedAt: new Date().toISOString(),
      version: "1.0",
    };

    const jsonString = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `workflow-${workflow.name.replace(/\s+/g, "-").toLowerCase()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success("تم تصدير سير العمل");
  };

  const copyShareLink = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success("تم نسخ الرابط!");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">جاري تحميل سير العمل...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="w-16 h-16 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">خطأ في التحميل</h2>
            <p className="text-muted-foreground mb-6">{error}</p>
            <Link to="/">
              <Button>
                <ArrowLeft className="w-4 h-4 mr-2" />
                العودة للرئيسية
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!workflow) return null;

  const nodes = dbToNodes(workflow);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="w-4 h-4" />
              <span>الرئيسية</span>
            </Link>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={copyShareLink}>
                <Copy className="w-4 h-4 mr-2" />
                نسخ الرابط
              </Button>
              <Button variant="outline" size="sm" onClick={handleExportJSON}>
                <Download className="w-4 h-4 mr-2" />
                تصدير JSON
              </Button>
              {user && (
                <Button size="sm" onClick={handleImport} disabled={importing}>
                  {importing ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Zap className="w-4 h-4 mr-2" />
                  )}
                  استيراد إلى حسابي
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Workflow Info */}
          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-2xl mb-2">{workflow.name}</CardTitle>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Eye className="w-4 h-4" />
                      {shareInfo?.view_count || 0} مشاهدة
                    </span>
                    <span>
                      تم الإنشاء: {format(new Date(workflow.created_at), "dd MMMM yyyy", { locale: ar })}
                    </span>
                  </div>
                </div>
                <Badge variant="secondary" className="text-lg px-4 py-1">
                  {nodes.length} عقد
                </Badge>
              </div>
            </CardHeader>
          </Card>

          {/* Workflow Nodes */}
          <Card>
            <CardHeader>
              <CardTitle>مكونات سير العمل</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap items-center gap-4">
                {nodes.map((node, index) => {
                  const Icon = getNodeIcon(node.nodeType);
                  return (
                    <motion.div
                      key={node.id}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.1 }}
                      className="flex items-center"
                    >
                      <div className={`
                        p-4 rounded-xl border-2 transition-all
                        ${node.type === "trigger" ? "border-blue-500 bg-blue-500/10" : ""}
                        ${node.type === "ai" ? "border-purple-500 bg-purple-500/10" : ""}
                        ${node.type === "action" ? "border-green-500 bg-green-500/10" : ""}
                        ${node.type === "condition" ? "border-yellow-500 bg-yellow-500/10" : ""}
                      `}>
                        <div className="flex items-center gap-3">
                          <Icon className={`w-6 h-6 ${
                            node.type === "trigger" ? "text-blue-500" : ""
                          } ${node.type === "ai" ? "text-purple-500" : ""
                          } ${node.type === "action" ? "text-green-500" : ""
                          } ${node.type === "condition" ? "text-yellow-500" : ""
                          }`} />
                          <div>
                            <p className="font-medium">{node.label}</p>
                            <p className="text-xs text-muted-foreground capitalize">{node.type}</p>
                          </div>
                        </div>
                      </div>
                      {index < nodes.length - 1 && (
                        <div className="w-8 h-0.5 bg-border mx-2" />
                      )}
                    </motion.div>
                  );
                })}
              </div>

              {/* Conditions */}
              {workflow.conditions && workflow.conditions.length > 0 && (
                <div className="mt-8 pt-6 border-t border-border">
                  <h4 className="text-sm font-medium text-muted-foreground mb-4">الشروط</h4>
                  <div className="space-y-2">
                    {workflow.conditions.map((condition, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 text-sm"
                      >
                        <GitBranch className="w-4 h-4 text-yellow-500" />
                        <span>
                          إذا كان <strong>{condition.field}</strong> {condition.operator}{" "}
                          <strong>"{condition.value}"</strong>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Call to Action */}
          {!user && (
            <Card className="mt-6 bg-gradient-to-r from-primary/10 to-accent/10 border-primary/20">
              <CardContent className="py-8 text-center">
                <h3 className="text-xl font-semibold mb-2">هل تريد إنشاء سير عمل مشابه؟</h3>
                <p className="text-muted-foreground mb-4">
                  سجل الدخول لاستيراد سير العمل هذا أو إنشاء سير عمل خاص بك
                </p>
                <Link to="/auth">
                  <Button size="lg">
                    البدء مجاناً
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}
        </motion.div>
      </main>
    </div>
  );
}
