import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Plus, Trash2, Play, Mail, FileText, Calendar, CheckSquare, 
  MessageSquare, Zap, ArrowRight, Settings, Loader2, Bot,
  Clock, Filter, Send, Database, Webhook, Save, RefreshCw,
  GitBranch, History, CheckCircle, XCircle, AlertCircle
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";

interface WorkflowVariable {
  key: string;
  value: string;
  description?: string;
}

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
  operator: "contains" | "equals" | "not_equals" | "greater_than" | "less_than" | "greater_than_or_equal" | "less_than_or_equal" | "is_empty" | "is_not_empty" | "regex_match" | "starts_with" | "ends_with";
  value: string;
  thenAction: string;
  elseAction: string;
}

interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  nodes: Omit<WorkflowNode, "id">[];
  conditions: Omit<Condition, "id">[];
}

interface Workflow {
  id: string;
  name: string;
  nodes: WorkflowNode[];
  conditions: Condition[];
  variables: WorkflowVariable[];
  isActive: boolean;
  isSaved?: boolean;
  webhookUrl?: string;
}

interface DbWorkflow {
  id: string;
  name: string;
  trigger_type: string;
  trigger_config: Record<string, unknown>;
  ai_action_type: string;
  ai_config: Record<string, unknown>;
  output_action_type: string;
  output_config: Record<string, unknown>;
  conditions: Condition[];
  is_active: boolean;
}

interface WorkflowExecution {
  id: string;
  workflow_id: string;
  status: string;
  started_at: string;
  completed_at: string | null;
  results: unknown[];
  error: string | null;
  context: Record<string, unknown>;
}

const nodeTypes = {
  triggers: [
    { id: "schedule", label: "Schedule", icon: Clock, description: "Run on a schedule" },
    { id: "webhook", label: "Webhook", icon: Webhook, description: "Trigger via HTTP" },
    { id: "email_received", label: "Email Received", icon: Mail, description: "When email arrives" },
  ],
  actions: [
    { id: "send_email", label: "Send Email", icon: Send, description: "Send an email" },
    { id: "create_task", label: "Create Task", icon: CheckSquare, description: "Create a new task" },
    { id: "save_data", label: "Save Data", icon: Database, description: "Save to database" },
    { id: "calendar_event", label: "Calendar Event", icon: Calendar, description: "Create event" },
  ],
  ai: [
    { id: "ai_summarize", label: "AI Summarize", icon: Bot, description: "Summarize content" },
    { id: "ai_draft", label: "AI Draft", icon: FileText, description: "Draft content" },
    { id: "ai_analyze", label: "AI Analyze", icon: Zap, description: "Analyze data" },
    { id: "ai_respond", label: "AI Respond", icon: MessageSquare, description: "Generate response" },
  ],
  conditions: [
    { id: "condition", label: "Condition", icon: GitBranch, description: "Branch based on data" },
  ],
};

const workflowTemplates: WorkflowTemplate[] = [
  {
    id: "email_digest",
    name: "Email Digest",
    description: "Summarize content and send a daily digest email",
    icon: Mail,
    nodes: [
      { type: "trigger", nodeType: "schedule", config: { time: "09:00", frequency: "daily" }, label: "Schedule" },
      { type: "ai", nodeType: "ai_summarize", config: { prompt: "Create a concise digest summary of the following content. Include key highlights and action items." }, label: "AI Summarize" },
      { type: "action", nodeType: "send_email", config: { subject: "Your Daily Digest" }, label: "Send Email" },
    ],
    conditions: [],
  },
  {
    id: "task_reminder",
    name: "Task Reminder",
    description: "Analyze priorities and create task reminders",
    icon: CheckSquare,
    nodes: [
      { type: "trigger", nodeType: "schedule", config: { time: "08:00", frequency: "daily" }, label: "Schedule" },
      { type: "ai", nodeType: "ai_analyze", config: { prompt: "Analyze the current tasks and identify high-priority items that need immediate attention. Suggest a priority order." }, label: "AI Analyze" },
      { type: "action", nodeType: "create_task", config: { priority: "high", title: "Priority Tasks Review" }, label: "Create Task" },
    ],
    conditions: [],
  },
  {
    id: "content_summarizer",
    name: "Content Summarizer",
    description: "Summarize long content with sentiment-based routing",
    icon: FileText,
    nodes: [
      { type: "trigger", nodeType: "webhook", config: {}, label: "Webhook" },
      { type: "ai", nodeType: "ai_summarize", config: { prompt: "Provide a comprehensive summary of this content, extracting the main points and key insights." }, label: "AI Summarize" },
      { type: "condition", nodeType: "condition", config: {}, label: "Condition" },
      { type: "action", nodeType: "save_data", config: {}, label: "Save Data" },
    ],
    conditions: [
      { field: "sentiment", operator: "equals", value: "positive", thenAction: "continue", elseAction: "skip" },
    ],
  },
  {
    id: "smart_responder",
    name: "Smart Auto-Responder",
    description: "AI-powered email response with urgency detection",
    icon: MessageSquare,
    nodes: [
      { type: "trigger", nodeType: "email_received", config: {}, label: "Email Received" },
      { type: "ai", nodeType: "ai_analyze", config: { prompt: "Analyze this email for urgency level (1-10) and sentiment. Extract key questions that need answers." }, label: "AI Analyze" },
      { type: "condition", nodeType: "condition", config: {}, label: "Condition" },
      { type: "ai", nodeType: "ai_respond", config: { prompt: "Draft a professional and helpful response addressing the key points." }, label: "AI Respond" },
      { type: "action", nodeType: "send_email", config: { subject: "Re: Your Message" }, label: "Send Email" },
    ],
    conditions: [
      { field: "lastAiOutput", operator: "regex_match", value: "urgency.*[7-9]|urgency.*10", thenAction: "continue", elseAction: "skip" },
    ],
  },
  {
    id: "weekly_report",
    name: "Weekly Report Generator",
    description: "Generate and email weekly performance reports",
    icon: Calendar,
    nodes: [
      { type: "trigger", nodeType: "schedule", config: { time: "17:00", frequency: "weekly" }, label: "Schedule" },
      { type: "ai", nodeType: "ai_draft", config: { prompt: "Create a professional weekly report summarizing achievements, metrics, and areas for improvement. Format with clear sections." }, label: "AI Draft" },
      { type: "action", nodeType: "send_email", config: { subject: "Weekly Performance Report" }, label: "Send Email" },
    ],
    conditions: [],
  },
];

// Convert DB workflow to UI workflow
const dbToUiWorkflow = (dbWorkflow: DbWorkflow): Workflow => {
  const nodes: WorkflowNode[] = [];
  
  if (dbWorkflow.trigger_type) {
    nodes.push({
      id: `trigger-${dbWorkflow.id}`,
      type: "trigger",
      nodeType: dbWorkflow.trigger_type,
      config: dbWorkflow.trigger_config as Record<string, string> || {},
      label: nodeTypes.triggers.find(t => t.id === dbWorkflow.trigger_type)?.label || dbWorkflow.trigger_type,
    });
  }
  
  if (dbWorkflow.ai_action_type && dbWorkflow.ai_action_type !== "none") {
    nodes.push({
      id: `ai-${dbWorkflow.id}`,
      type: "ai",
      nodeType: dbWorkflow.ai_action_type,
      config: dbWorkflow.ai_config as Record<string, string> || {},
      label: nodeTypes.ai.find(a => a.id === dbWorkflow.ai_action_type)?.label || dbWorkflow.ai_action_type,
    });
  }
  
  if (dbWorkflow.output_action_type && dbWorkflow.output_action_type !== "none") {
    nodes.push({
      id: `action-${dbWorkflow.id}`,
      type: "action",
      nodeType: dbWorkflow.output_action_type,
      config: dbWorkflow.output_config as Record<string, string> || {},
      label: nodeTypes.actions.find(a => a.id === dbWorkflow.output_action_type)?.label || dbWorkflow.output_action_type,
    });
  }
  
  // Extract variables from trigger_config
  const variables: WorkflowVariable[] = (dbWorkflow.trigger_config as Record<string, unknown>)?.variables as WorkflowVariable[] || [];
  
  // Generate webhook URL for webhook triggers
  const webhookUrl = dbWorkflow.trigger_type === 'webhook' 
    ? `https://zyediimmjjssdbfekaiu.supabase.co/functions/v1/webhook-trigger/${dbWorkflow.id}`
    : undefined;

  return {
    id: dbWorkflow.id,
    name: dbWorkflow.name,
    nodes,
    conditions: (dbWorkflow.conditions as Condition[]) || [],
    variables,
    isActive: dbWorkflow.is_active,
    isSaved: true,
    webhookUrl,
  };
};

export const WorkflowBuilder = () => {
  const { user } = useAuth();
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newWorkflowName, setNewWorkflowName] = useState("");
  const [addNodeDialogOpen, setAddNodeDialogOpen] = useState(false);
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [selectedNodeForConfig, setSelectedNodeForConfig] = useState<WorkflowNode | null>(null);
  const [runningWorkflow, setRunningWorkflow] = useState<string | null>(null);
  const [savingWorkflow, setSavingWorkflow] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [executions, setExecutions] = useState<WorkflowExecution[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [conditionDialogOpen, setConditionDialogOpen] = useState(false);
  const [editingCondition, setEditingCondition] = useState<Condition | null>(null);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);

  // Load workflows from database
  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }
    
    loadWorkflows();
  }, [user]);

  const loadWorkflows = async () => {
    try {
      const { data, error } = await supabase
        .from('workflows')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const uiWorkflows = (data as unknown as DbWorkflow[]).map(dbToUiWorkflow);
      setWorkflows(uiWorkflows);
    } catch (error) {
      console.error('Error loading workflows:', error);
      toast.error('Failed to load workflows');
    } finally {
      setIsLoading(false);
    }
  };

  const loadExecutionHistory = async (workflowId: string) => {
    try {
      const { data, error } = await supabase
        .from('workflow_executions')
        .select('*')
        .eq('workflow_id', workflowId)
        .order('started_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setExecutions(data as WorkflowExecution[]);
    } catch (error) {
      console.error('Error loading execution history:', error);
    }
  };

  const createWorkflow = async () => {
    if (!newWorkflowName.trim()) {
      toast.error("Please enter a workflow name");
      return;
    }
    
    if (!user) {
      toast.error("Please sign in to create workflows");
      return;
    }
    
    const newWorkflow: Workflow = {
      id: Date.now().toString(),
      name: newWorkflowName,
      nodes: [],
      conditions: [],
      variables: [],
      isActive: false,
      isSaved: false,
    };
    
    setWorkflows([newWorkflow, ...workflows]);
    setSelectedWorkflow(newWorkflow);
    setNewWorkflowName("");
    setIsCreating(false);
    toast.success("Workflow created! Add nodes and save to persist.");
  };

  const createFromTemplate = (template: WorkflowTemplate) => {
    if (!user) {
      toast.error("Please sign in to create workflows");
      return;
    }

    const timestamp = Date.now();
    const nodes: WorkflowNode[] = template.nodes.map((node, index) => ({
      ...node,
      id: `${timestamp}-${index}`,
    }));

    const conditions: Condition[] = template.conditions.map((condition, index) => ({
      ...condition,
      id: nodes.find(n => n.type === "condition")?.id || `condition-${timestamp}-${index}`,
    }));

    const newWorkflow: Workflow = {
      id: timestamp.toString(),
      name: template.name,
      nodes,
      conditions,
      variables: [],
      isActive: false,
      isSaved: false,
    };

    setWorkflows([newWorkflow, ...workflows]);
    setSelectedWorkflow(newWorkflow);
    setTemplateDialogOpen(false);
    toast.success(`Created workflow from "${template.name}" template!`);
  };

  const saveWorkflow = async (workflow: Workflow) => {
    if (!user) {
      toast.error("Please sign in to save workflows");
      return;
    }

    setSavingWorkflow(workflow.id);

    try {
      const triggerNode = workflow.nodes.find(n => n.type === "trigger");
      const aiNode = workflow.nodes.find(n => n.type === "ai");
      const actionNode = workflow.nodes.find(n => n.type === "action");

      const triggerConfig = JSON.parse(JSON.stringify({
        ...(triggerNode?.config || {}),
        variables: workflow.variables || [],
      }));

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const workflowData: any = {
        user_id: user.id,
        name: workflow.name,
        trigger_type: triggerNode?.nodeType || "manual",
        trigger_config: triggerConfig,
        ai_action_type: aiNode?.nodeType || "none",
        ai_config: JSON.parse(JSON.stringify(aiNode?.config || {})),
        output_action_type: actionNode?.nodeType || "none",
        output_config: JSON.parse(JSON.stringify(actionNode?.config || {})),
        conditions: JSON.parse(JSON.stringify(workflow.conditions)),
        is_active: workflow.isActive,
      };

      if (workflow.isSaved) {
        const { error } = await supabase
          .from('workflows')
          .update(workflowData)
          .eq('id', workflow.id);

        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('workflows')
          .insert(workflowData)
          .select()
          .single();

        if (error) throw error;

        const webhookUrl = triggerNode?.nodeType === 'webhook' 
          ? `https://zyediimmjjssdbfekaiu.supabase.co/functions/v1/webhook-trigger/${data.id}`
          : undefined;

        const updatedWorkflow = { ...workflow, id: data.id, isSaved: true, webhookUrl };
        setWorkflows(workflows.map(w => w.id === workflow.id ? updatedWorkflow : w));
        if (selectedWorkflow?.id === workflow.id) {
          setSelectedWorkflow(updatedWorkflow);
        }
      }

      toast.success("Workflow saved!");
    } catch (error) {
      console.error('Error saving workflow:', error);
      toast.error('Failed to save workflow');
    } finally {
      setSavingWorkflow(null);
    }
  };

  const addNode = (type: "trigger" | "action" | "ai" | "condition", nodeType: string, label: string) => {
    if (!selectedWorkflow) return;
    
    const newNode: WorkflowNode = {
      id: Date.now().toString(),
      type,
      nodeType,
      config: {},
      label,
    };
    
    const updatedWorkflow = {
      ...selectedWorkflow,
      nodes: [...selectedWorkflow.nodes, newNode],
      isSaved: false,
    };

    // If adding a condition node, also add a default condition
    if (type === "condition") {
      const newCondition: Condition = {
        id: newNode.id,
        field: "sentiment",
        operator: "equals",
        value: "positive",
        thenAction: "continue",
        elseAction: "skip",
      };
      updatedWorkflow.conditions = [...(updatedWorkflow.conditions || []), newCondition];
    }
    
    setSelectedWorkflow(updatedWorkflow);
    setWorkflows(workflows.map(w => w.id === updatedWorkflow.id ? updatedWorkflow : w));
    setAddNodeDialogOpen(false);
  };

  const removeNode = (nodeId: string) => {
    if (!selectedWorkflow) return;
    
    const updatedWorkflow = {
      ...selectedWorkflow,
      nodes: selectedWorkflow.nodes.filter(n => n.id !== nodeId),
      conditions: selectedWorkflow.conditions.filter(c => c.id !== nodeId),
      isSaved: false,
    };
    
    setSelectedWorkflow(updatedWorkflow);
    setWorkflows(workflows.map(w => w.id === updatedWorkflow.id ? updatedWorkflow : w));
  };

  const updateNodeConfig = (nodeId: string, config: Record<string, string>) => {
    if (!selectedWorkflow) return;
    
    const updatedWorkflow = {
      ...selectedWorkflow,
      nodes: selectedWorkflow.nodes.map(n => 
        n.id === nodeId ? { ...n, config } : n
      ),
      isSaved: false,
    };
    
    setSelectedWorkflow(updatedWorkflow);
    setWorkflows(workflows.map(w => w.id === updatedWorkflow.id ? updatedWorkflow : w));
    setConfigDialogOpen(false);
    setSelectedNodeForConfig(null);
  };

  const updateCondition = (condition: Condition) => {
    if (!selectedWorkflow) return;

    const updatedWorkflow = {
      ...selectedWorkflow,
      conditions: selectedWorkflow.conditions.map(c => 
        c.id === condition.id ? condition : c
      ),
      isSaved: false,
    };

    setSelectedWorkflow(updatedWorkflow);
    setWorkflows(workflows.map(w => w.id === updatedWorkflow.id ? updatedWorkflow : w));
    setConditionDialogOpen(false);
    setEditingCondition(null);
  };

  const toggleWorkflow = async (workflowId: string) => {
    const workflow = workflows.find(w => w.id === workflowId);
    if (!workflow) return;

    const updatedWorkflow = { ...workflow, isActive: !workflow.isActive };
    setWorkflows(workflows.map(w => w.id === workflowId ? updatedWorkflow : w));
    
    if (workflow.isSaved) {
      try {
        await supabase
          .from('workflows')
          .update({ is_active: updatedWorkflow.isActive })
          .eq('id', workflowId);
      } catch (error) {
        console.error('Error updating workflow:', error);
      }
    }
    
    toast.success("Workflow status updated");
  };

  const runWorkflow = async (workflow: Workflow) => {
    if (workflow.nodes.length === 0) {
      toast.error("Add nodes to your workflow before running");
      return;
    }

    setRunningWorkflow(workflow.id);
    
    try {
      const { data, error } = await supabase.functions.invoke('execute-workflow', {
        body: {
          workflowId: workflow.id,
          workflowName: workflow.name,
          nodes: workflow.nodes,
          conditions: workflow.conditions,
          userId: user?.id,
        },
      });

      if (error) throw error;

      if (data.success) {
        toast.success("Workflow executed successfully!", {
          description: `Processed ${data.results?.length || 0} nodes`,
        });
        
        // Reload execution history
        if (workflow.isSaved) {
          loadExecutionHistory(workflow.id);
        }
        
        const failedNodes = data.results?.filter((r: { success: boolean; skipped?: boolean }) => !r.success && !r.skipped) || [];
        if (failedNodes.length > 0) {
          toast.warning(`${failedNodes.length} node(s) had issues`, {
            description: failedNodes.map((n: { nodeType: string }) => n.nodeType).join(", "),
          });
        }
      } else {
        toast.error("Workflow execution failed", {
          description: data.error || "Unknown error",
        });
      }
    } catch (error) {
      console.error('Error running workflow:', error);
      toast.error("Failed to execute workflow");
    } finally {
      setRunningWorkflow(null);
    }
  };

  const deleteWorkflow = async (workflowId: string) => {
    const workflow = workflows.find(w => w.id === workflowId);
    
    if (workflow?.isSaved) {
      try {
        const { error } = await supabase
          .from('workflows')
          .delete()
          .eq('id', workflowId);

        if (error) throw error;
      } catch (error) {
        console.error('Error deleting workflow:', error);
        toast.error('Failed to delete workflow');
        return;
      }
    }

    setWorkflows(workflows.filter(w => w.id !== workflowId));
    if (selectedWorkflow?.id === workflowId) {
      setSelectedWorkflow(null);
    }
    toast.success("Workflow deleted");
  };

  const getNodeIcon = (nodeType: string) => {
    const allNodes = [...nodeTypes.triggers, ...nodeTypes.actions, ...nodeTypes.ai, ...nodeTypes.conditions];
    const node = allNodes.find(n => n.id === nodeType);
    return node?.icon || Zap;
  };

  const getNodeColor = (type: "trigger" | "action" | "ai" | "condition") => {
    switch (type) {
      case "trigger": return "bg-blue-500/10 border-blue-500/30 text-blue-500";
      case "action": return "bg-green-500/10 border-green-500/30 text-green-500";
      case "ai": return "bg-violet-500/10 border-violet-500/30 text-violet-500";
      case "condition": return "bg-amber-500/10 border-amber-500/30 text-amber-500";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed": return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "failed": return <XCircle className="w-4 h-4 text-destructive" />;
      case "running": return <Loader2 className="w-4 h-4 animate-spin text-blue-500" />;
      default: return <AlertCircle className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const renderNodeConfigFields = (node: WorkflowNode) => {
    switch (node.nodeType) {
      case "send_email":
        return (
          <div className="space-y-4">
            <div>
              <Label>To Email</Label>
              <Input
                placeholder="recipient@example.com"
                value={node.config.to || ""}
                onChange={(e) => setSelectedNodeForConfig({ ...node, config: { ...node.config, to: e.target.value } })}
              />
            </div>
            <div>
              <Label>Subject</Label>
              <Input
                placeholder="Email subject..."
                value={node.config.subject || ""}
                onChange={(e) => setSelectedNodeForConfig({ ...node, config: { ...node.config, subject: e.target.value } })}
              />
            </div>
            <div>
              <Label>Body (optional - uses AI output if empty)</Label>
              <Textarea
                placeholder="Email body..."
                value={node.config.body || ""}
                onChange={(e) => setSelectedNodeForConfig({ ...node, config: { ...node.config, body: e.target.value } })}
              />
            </div>
          </div>
        );
      case "schedule":
        return (
          <div className="space-y-4">
            <div>
              <Label>Time (UTC)</Label>
              <Input
                type="time"
                value={node.config.time || "09:00"}
                onChange={(e) => setSelectedNodeForConfig({ ...node, config: { ...node.config, time: e.target.value } })}
              />
            </div>
            <div>
              <Label>Frequency</Label>
              <Select
                value={node.config.frequency || "daily"}
                onValueChange={(value) => setSelectedNodeForConfig({ ...node, config: { ...node.config, frequency: value } })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hourly">Hourly</SelectItem>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {node.config.frequency === "weekly" && (
              <div>
                <Label>Day of Week</Label>
                <Select
                  value={node.config.dayOfWeek || "1"}
                  onValueChange={(value) => setSelectedNodeForConfig({ ...node, config: { ...node.config, dayOfWeek: value } })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Sunday</SelectItem>
                    <SelectItem value="1">Monday</SelectItem>
                    <SelectItem value="2">Tuesday</SelectItem>
                    <SelectItem value="3">Wednesday</SelectItem>
                    <SelectItem value="4">Thursday</SelectItem>
                    <SelectItem value="5">Friday</SelectItem>
                    <SelectItem value="6">Saturday</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            {node.config.frequency === "monthly" && (
              <div>
                <Label>Day of Month</Label>
                <Input
                  type="number"
                  min="1"
                  max="31"
                  value={node.config.dayOfMonth || "1"}
                  onChange={(e) => setSelectedNodeForConfig({ ...node, config: { ...node.config, dayOfMonth: e.target.value } })}
                />
              </div>
            )}
            <div>
              <Label>Cron Expression (optional, overrides above)</Label>
              <Input
                placeholder="* * * * * (minute hour day month weekday)"
                value={node.config.cron || ""}
                onChange={(e) => setSelectedNodeForConfig({ ...node, config: { ...node.config, cron: e.target.value } })}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Advanced: Use cron format for precise scheduling
              </p>
            </div>
          </div>
        );
      case "webhook":
        return (
          <div className="space-y-4">
            {selectedWorkflow?.webhookUrl && (
              <div className="p-3 rounded-lg bg-muted/50 border border-border">
                <Label className="text-xs text-muted-foreground">Webhook URL</Label>
                <div className="flex items-center gap-2 mt-1">
                  <code className="flex-1 text-xs bg-background p-2 rounded overflow-x-auto">
                    {selectedWorkflow.webhookUrl}
                  </code>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      navigator.clipboard.writeText(selectedWorkflow.webhookUrl || "");
                      toast.success("Webhook URL copied!");
                    }}
                  >
                    Copy
                  </Button>
                </div>
              </div>
            )}
            <div>
              <Label>Webhook Secret (optional)</Label>
              <Input
                placeholder="my-secret-key"
                value={node.config.webhookSecret || ""}
                onChange={(e) => setSelectedNodeForConfig({ ...node, config: { ...node.config, webhookSecret: e.target.value } })}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Pass via x-webhook-secret header or ?secret= query param
              </p>
            </div>
            {!selectedWorkflow?.webhookUrl && (
              <p className="text-sm text-amber-500">
                Save the workflow to generate your webhook URL
              </p>
            )}
          </div>
        );
      case "ai_summarize":
      case "ai_draft":
      case "ai_analyze":
      case "ai_respond":
        return (
          <div className="space-y-4">
            <div>
              <Label>Custom Prompt (optional)</Label>
              <Textarea
                placeholder="Enter a custom prompt for the AI..."
                value={node.config.prompt || ""}
                onChange={(e) => setSelectedNodeForConfig({ ...node, config: { ...node.config, prompt: e.target.value } })}
              />
            </div>
          </div>
        );
      case "create_task":
        return (
          <div className="space-y-4">
            <div>
              <Label>Task Title (uses AI output if empty)</Label>
              <Input
                placeholder="Task title..."
                value={node.config.title || ""}
                onChange={(e) => setSelectedNodeForConfig({ ...node, config: { ...node.config, title: e.target.value } })}
              />
            </div>
            <div>
              <Label>Priority</Label>
              <Select
                value={node.config.priority || "medium"}
                onValueChange={(value) => setSelectedNodeForConfig({ ...node, config: { ...node.config, priority: value } })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );
      default:
        return (
          <p className="text-muted-foreground">No configuration needed for this node.</p>
        );
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-semibold text-foreground">AI Workflow Builder</h2>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={loadWorkflows}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Dialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <FileText className="w-4 h-4 mr-2" />
                Templates
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl">
              <DialogHeader>
                <DialogTitle>Workflow Templates</DialogTitle>
              </DialogHeader>
              <p className="text-sm text-muted-foreground mb-4">
                Choose a template to quickly create a pre-configured workflow
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {workflowTemplates.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => createFromTemplate(template)}
                    className="flex items-start gap-4 p-4 rounded-lg border border-border hover:border-primary/50 hover:bg-primary/5 transition-all text-left"
                  >
                    <div className="p-3 rounded-lg bg-primary/10">
                      <template.icon className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-foreground">{template.name}</h4>
                      <p className="text-sm text-muted-foreground mt-1">{template.description}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="secondary" className="text-xs">
                          {template.nodes.length} nodes
                        </Badge>
                        {template.conditions.length > 0 && (
                          <Badge variant="outline" className="text-xs">
                            {template.conditions.length} conditions
                          </Badge>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </DialogContent>
          </Dialog>
          <Button onClick={() => setIsCreating(true)} size="sm">
            <Plus className="w-4 h-4 mr-2" />
            New Workflow
          </Button>
        </div>
      </div>

      {/* Create Workflow Dialog */}
      <AnimatePresence>
        {isCreating && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
          >
            <Card className="bg-card border-border">
              <CardContent className="pt-6">
                <div className="flex gap-4">
                  <Input
                    placeholder="Workflow name..."
                    value={newWorkflowName}
                    onChange={(e) => setNewWorkflowName(e.target.value)}
                    className="flex-1"
                  />
                  <Button onClick={createWorkflow}>Create</Button>
                  <Button variant="ghost" onClick={() => setIsCreating(false)}>Cancel</Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Workflow List */}
        <div className="lg:col-span-1 space-y-4">
          <h3 className="text-sm font-medium text-muted-foreground">Your Workflows</h3>
          {workflows.length === 0 ? (
            <Card className="bg-card border-border">
              <CardContent className="py-8 text-center">
                <Zap className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No workflows yet</p>
                <p className="text-sm text-muted-foreground mt-1">Create your first AI automation</p>
              </CardContent>
            </Card>
          ) : (
            workflows.map((workflow) => (
              <motion.div
                key={workflow.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
              >
                <Card 
                  className={`bg-card border-border cursor-pointer transition-all hover:border-primary/50 ${
                    selectedWorkflow?.id === workflow.id ? 'border-primary' : ''
                  }`}
                  onClick={() => {
                    setSelectedWorkflow(workflow);
                    if (workflow.isSaved) {
                      loadExecutionHistory(workflow.id);
                    }
                  }}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium text-foreground">{workflow.name}</h4>
                          <Badge variant={workflow.isActive ? "default" : "secondary"}>
                            {workflow.isActive ? "Active" : "Inactive"}
                          </Badge>
                          {!workflow.isSaved && (
                            <Badge variant="outline" className="text-yellow-500 border-yellow-500">
                              Unsaved
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {workflow.nodes.length} nodes
                          {workflow.conditions.length > 0 && ` · ${workflow.conditions.length} conditions`}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            saveWorkflow(workflow);
                          }}
                          disabled={savingWorkflow === workflow.id}
                          title="Save workflow"
                        >
                          {savingWorkflow === workflow.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Save className="w-4 h-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            runWorkflow(workflow);
                          }}
                          disabled={runningWorkflow === workflow.id}
                          title="Run workflow"
                        >
                          {runningWorkflow === workflow.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Play className="w-4 h-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteWorkflow(workflow.id);
                          }}
                          title="Delete workflow"
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))
          )}
        </div>

        {/* Workflow Editor */}
        <div className="lg:col-span-2">
          {selectedWorkflow ? (
            <Tabs defaultValue="editor" className="space-y-4">
              <TabsList>
                <TabsTrigger value="editor">Editor</TabsTrigger>
                <TabsTrigger value="history" className="flex items-center gap-2">
                  <History className="w-4 h-4" />
                  History
                </TabsTrigger>
              </TabsList>

              <TabsContent value="editor">
                <Card className="bg-card border-border">
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {selectedWorkflow.name}
                        {!selectedWorkflow.isSaved && (
                          <Badge variant="outline" className="text-yellow-500 border-yellow-500 text-xs">
                            Unsaved
                          </Badge>
                        )}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        Build your automation by adding nodes. Click a node to configure it.
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => saveWorkflow(selectedWorkflow)}
                        disabled={savingWorkflow === selectedWorkflow.id}
                      >
                        {savingWorkflow === selectedWorkflow.id ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Save className="w-4 h-4 mr-2" />
                        )}
                        Save
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleWorkflow(selectedWorkflow.id)}
                      >
                        {selectedWorkflow.isActive ? "Deactivate" : "Activate"}
                      </Button>
                      <Dialog open={addNodeDialogOpen} onOpenChange={setAddNodeDialogOpen}>
                        <DialogTrigger asChild>
                          <Button size="sm">
                            <Plus className="w-4 h-4 mr-2" />
                            Add Node
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                          <DialogHeader>
                            <DialogTitle>Add Node</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-6">
                            <div>
                              <h4 className="text-sm font-medium mb-3 text-blue-500">Triggers</h4>
                              <div className="grid grid-cols-3 gap-3">
                                {nodeTypes.triggers.map((node) => (
                                  <button
                                    key={node.id}
                                    onClick={() => addNode("trigger", node.id, node.label)}
                                    className="flex flex-col items-center gap-2 p-4 rounded-lg border border-border hover:border-blue-500/50 hover:bg-blue-500/5 transition-all"
                                  >
                                    <node.icon className="w-6 h-6 text-blue-500" />
                                    <span className="text-sm font-medium">{node.label}</span>
                                    <span className="text-xs text-muted-foreground">{node.description}</span>
                                  </button>
                                ))}
                              </div>
                            </div>
                            <div>
                              <h4 className="text-sm font-medium mb-3 text-violet-500">AI Actions</h4>
                              <div className="grid grid-cols-4 gap-3">
                                {nodeTypes.ai.map((node) => (
                                  <button
                                    key={node.id}
                                    onClick={() => addNode("ai", node.id, node.label)}
                                    className="flex flex-col items-center gap-2 p-4 rounded-lg border border-border hover:border-violet-500/50 hover:bg-violet-500/5 transition-all"
                                  >
                                    <node.icon className="w-6 h-6 text-violet-500" />
                                    <span className="text-sm font-medium">{node.label}</span>
                                    <span className="text-xs text-muted-foreground text-center">{node.description}</span>
                                  </button>
                                ))}
                              </div>
                            </div>
                            <div>
                              <h4 className="text-sm font-medium mb-3 text-amber-500">Conditions</h4>
                              <div className="grid grid-cols-3 gap-3">
                                {nodeTypes.conditions.map((node) => (
                                  <button
                                    key={node.id}
                                    onClick={() => addNode("condition", node.id, node.label)}
                                    className="flex flex-col items-center gap-2 p-4 rounded-lg border border-border hover:border-amber-500/50 hover:bg-amber-500/5 transition-all"
                                  >
                                    <node.icon className="w-6 h-6 text-amber-500" />
                                    <span className="text-sm font-medium">{node.label}</span>
                                    <span className="text-xs text-muted-foreground">{node.description}</span>
                                  </button>
                                ))}
                              </div>
                            </div>
                            <div>
                              <h4 className="text-sm font-medium mb-3 text-green-500">Actions</h4>
                              <div className="grid grid-cols-4 gap-3">
                                {nodeTypes.actions.map((node) => (
                                  <button
                                    key={node.id}
                                    onClick={() => addNode("action", node.id, node.label)}
                                    className="flex flex-col items-center gap-2 p-4 rounded-lg border border-border hover:border-green-500/50 hover:bg-green-500/5 transition-all"
                                  >
                                    <node.icon className="w-6 h-6 text-green-500" />
                                    <span className="text-sm font-medium">{node.label}</span>
                                    <span className="text-xs text-muted-foreground text-center">{node.description}</span>
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {selectedWorkflow.nodes.length === 0 ? (
                      <div className="text-center py-12 border-2 border-dashed border-border rounded-lg">
                        <Zap className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                        <p className="text-muted-foreground">No nodes yet</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Click "Add Node" to start building
                        </p>
                      </div>
                    ) : (
                      <div className="flex flex-wrap items-center gap-4">
                        {selectedWorkflow.nodes.map((node, index) => {
                          const NodeIcon = getNodeIcon(node.nodeType);
                          const condition = selectedWorkflow.conditions.find(c => c.id === node.id);
                          return (
                            <div key={node.id} className="flex items-center gap-4">
                              <motion.div
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className={`relative group p-4 rounded-xl border-2 cursor-pointer hover:scale-105 transition-transform ${getNodeColor(node.type)}`}
                                onClick={() => {
                                  if (node.type === "condition") {
                                    setEditingCondition(condition || null);
                                    setConditionDialogOpen(true);
                                  } else {
                                    setSelectedNodeForConfig(node);
                                    setConfigDialogOpen(true);
                                  }
                                }}
                              >
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    removeNode(node.id);
                                  }}
                                  className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-destructive text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                                <div className="flex flex-col items-center gap-2">
                                  <NodeIcon className="w-6 h-6" />
                                  <span className="text-sm font-medium">{node.label}</span>
                                  <Badge variant="outline" className="text-xs">
                                    {node.type}
                                  </Badge>
                                  {(Object.keys(node.config).length > 0 || condition) && (
                                    <Settings className="w-3 h-3 text-muted-foreground" />
                                  )}
                                </div>
                              </motion.div>
                              {index < selectedWorkflow.nodes.length - 1 && (
                                <ArrowRight className="w-5 h-5 text-muted-foreground" />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {selectedWorkflow.nodes.length > 0 && (
                      <div className="mt-6 pt-6 border-t border-border">
                        <Button
                          onClick={() => runWorkflow(selectedWorkflow)}
                          disabled={runningWorkflow === selectedWorkflow.id}
                          className="w-full"
                        >
                          {runningWorkflow === selectedWorkflow.id ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Running...
                            </>
                          ) : (
                            <>
                              <Play className="w-4 h-4 mr-2" />
                              Run Workflow Now
                            </>
                          )}
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="history">
                <Card className="bg-card border-border">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <History className="w-5 h-5" />
                      Execution History
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {executions.length === 0 ? (
                      <div className="text-center py-8">
                        <History className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                        <p className="text-muted-foreground">No executions yet</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Run your workflow to see the history
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {executions.map((execution) => (
                          <div
                            key={execution.id}
                            className="p-4 rounded-lg border border-border bg-background/50"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                {getStatusIcon(execution.status)}
                                <div>
                                  <p className="font-medium capitalize">{execution.status}</p>
                                  <p className="text-sm text-muted-foreground">
                                    {format(new Date(execution.started_at), "MMM d, yyyy HH:mm:ss")}
                                  </p>
                                </div>
                              </div>
                              <div className="text-right">
                                {execution.completed_at && (
                                  <p className="text-sm text-muted-foreground">
                                    Duration: {Math.round((new Date(execution.completed_at).getTime() - new Date(execution.started_at).getTime()) / 1000)}s
                                  </p>
                                )}
                                {Array.isArray(execution.results) && (
                                  <p className="text-xs text-muted-foreground">
                                    {execution.results.length} nodes processed
                                  </p>
                                )}
                              </div>
                            </div>
                            {execution.error && (
                              <p className="text-sm text-destructive mt-2">{execution.error}</p>
                            )}
                            {execution.context && typeof execution.context === 'object' && 'sentiment' in execution.context && (
                              <Badge variant="outline" className="mt-2">
                                Sentiment: {String(execution.context.sentiment)}
                              </Badge>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          ) : (
            <Card className="bg-card border-border">
              <CardContent className="py-12 text-center">
                <Zap className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">Select a Workflow</h3>
                <p className="text-muted-foreground">
                  Choose a workflow from the list or create a new one to get started
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Node Configuration Dialog */}
      <Dialog open={configDialogOpen} onOpenChange={setConfigDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Configure {selectedNodeForConfig?.label}</DialogTitle>
          </DialogHeader>
          {selectedNodeForConfig && (
            <div className="space-y-4">
              {renderNodeConfigFields(selectedNodeForConfig)}
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setConfigDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={() => updateNodeConfig(selectedNodeForConfig.id, selectedNodeForConfig.config)}>
                  Save Configuration
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Condition Configuration Dialog */}
      <Dialog open={conditionDialogOpen} onOpenChange={setConditionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Configure Condition</DialogTitle>
          </DialogHeader>
          {editingCondition && (
            <div className="space-y-4">
              <div>
                <Label>Field to Check</Label>
                <Select
                  value={editingCondition.field}
                  onValueChange={(value) => setEditingCondition({ ...editingCondition, field: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sentiment">AI Sentiment</SelectItem>
                    <SelectItem value="lastAiOutput">AI Output</SelectItem>
                    <SelectItem value="lastOutput">Last Output</SelectItem>
                    <SelectItem value="urgency">Urgency Score</SelectItem>
                    <SelectItem value="wordCount">Word Count</SelectItem>
                    <SelectItem value="category">Category</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Operator</Label>
                <Select
                  value={editingCondition.operator}
                  onValueChange={(value) => setEditingCondition({ ...editingCondition, operator: value as Condition["operator"] })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="contains">Contains</SelectItem>
                    <SelectItem value="equals">Equals</SelectItem>
                    <SelectItem value="not_equals">Not Equals</SelectItem>
                    <SelectItem value="starts_with">Starts With</SelectItem>
                    <SelectItem value="ends_with">Ends With</SelectItem>
                    <SelectItem value="regex_match">Regex Match</SelectItem>
                    <SelectItem value="greater_than">Greater Than (&gt;)</SelectItem>
                    <SelectItem value="less_than">Less Than (&lt;)</SelectItem>
                    <SelectItem value="greater_than_or_equal">Greater Than or Equal (≥)</SelectItem>
                    <SelectItem value="less_than_or_equal">Less Than or Equal (≤)</SelectItem>
                    <SelectItem value="is_empty">Is Empty</SelectItem>
                    <SelectItem value="is_not_empty">Is Not Empty</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {editingCondition.operator === "regex_match" && (
                <p className="text-xs text-muted-foreground">
                  Enter a valid JavaScript regex pattern (e.g., <code className="bg-muted px-1 rounded">urgent|critical</code> or <code className="bg-muted px-1 rounded">[0-9]+</code>)
                </p>
              )}
              {["greater_than", "less_than", "greater_than_or_equal", "less_than_or_equal"].includes(editingCondition.operator) && (
                <p className="text-xs text-muted-foreground">
                  Enter a numeric value for comparison
                </p>
              )}
              <div>
                <Label>Value</Label>
                <Input
                  placeholder={
                    editingCondition.operator === "regex_match" 
                      ? "Regex pattern..." 
                      : ["greater_than", "less_than", "greater_than_or_equal", "less_than_or_equal"].includes(editingCondition.operator)
                        ? "Numeric value..."
                        : "Value to compare..."
                  }
                  value={editingCondition.value}
                  onChange={(e) => setEditingCondition({ ...editingCondition, value: e.target.value })}
                />
              </div>
              <div>
                <Label>If True</Label>
                <Select
                  value={editingCondition.thenAction}
                  onValueChange={(value) => setEditingCondition({ ...editingCondition, thenAction: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="continue">Continue to next node</SelectItem>
                    <SelectItem value="skip">Skip remaining nodes</SelectItem>
                    <SelectItem value="send_email">Jump to Send Email</SelectItem>
                    <SelectItem value="create_task">Jump to Create Task</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>If False</Label>
                <Select
                  value={editingCondition.elseAction}
                  onValueChange={(value) => setEditingCondition({ ...editingCondition, elseAction: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="continue">Continue to next node</SelectItem>
                    <SelectItem value="skip">Skip remaining nodes</SelectItem>
                    <SelectItem value="send_email">Jump to Send Email</SelectItem>
                    <SelectItem value="create_task">Jump to Create Task</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setConditionDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={() => updateCondition(editingCondition)}>
                  Save Condition
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
