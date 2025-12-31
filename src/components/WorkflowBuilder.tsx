import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Plus, Trash2, Play, Mail, FileText, Calendar, CheckSquare, 
  MessageSquare, Zap, ArrowRight, Settings, Loader2, Bot,
  Clock, Filter, Send, Database, Webhook, Save, RefreshCw
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
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface WorkflowNode {
  id: string;
  type: "trigger" | "action" | "ai";
  nodeType: string;
  config: Record<string, string>;
  label: string;
}

interface Workflow {
  id: string;
  name: string;
  nodes: WorkflowNode[];
  isActive: boolean;
  isSaved?: boolean;
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
  is_active: boolean;
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
};

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
  
  if (dbWorkflow.ai_action_type) {
    nodes.push({
      id: `ai-${dbWorkflow.id}`,
      type: "ai",
      nodeType: dbWorkflow.ai_action_type,
      config: dbWorkflow.ai_config as Record<string, string> || {},
      label: nodeTypes.ai.find(a => a.id === dbWorkflow.ai_action_type)?.label || dbWorkflow.ai_action_type,
    });
  }
  
  if (dbWorkflow.output_action_type) {
    nodes.push({
      id: `action-${dbWorkflow.id}`,
      type: "action",
      nodeType: dbWorkflow.output_action_type,
      config: dbWorkflow.output_config as Record<string, string> || {},
      label: nodeTypes.actions.find(a => a.id === dbWorkflow.output_action_type)?.label || dbWorkflow.output_action_type,
    });
  }
  
  return {
    id: dbWorkflow.id,
    name: dbWorkflow.name,
    nodes,
    isActive: dbWorkflow.is_active,
    isSaved: true,
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

      const uiWorkflows = (data as DbWorkflow[]).map(dbToUiWorkflow);
      setWorkflows(uiWorkflows);
    } catch (error) {
      console.error('Error loading workflows:', error);
      toast.error('Failed to load workflows');
    } finally {
      setIsLoading(false);
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
      isActive: false,
      isSaved: false,
    };
    
    setWorkflows([newWorkflow, ...workflows]);
    setSelectedWorkflow(newWorkflow);
    setNewWorkflowName("");
    setIsCreating(false);
    toast.success("Workflow created! Add nodes and save to persist.");
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

      const workflowData = {
        user_id: user.id,
        name: workflow.name,
        trigger_type: triggerNode?.nodeType || "manual",
        trigger_config: triggerNode?.config || {},
        ai_action_type: aiNode?.nodeType || "none",
        ai_config: aiNode?.config || {},
        output_action_type: actionNode?.nodeType || "none",
        output_config: actionNode?.config || {},
        is_active: workflow.isActive,
      };

      if (workflow.isSaved) {
        // Update existing workflow
        const { error } = await supabase
          .from('workflows')
          .update(workflowData)
          .eq('id', workflow.id);

        if (error) throw error;
      } else {
        // Insert new workflow
        const { data, error } = await supabase
          .from('workflows')
          .insert(workflowData)
          .select()
          .single();

        if (error) throw error;

        // Update local state with the new ID
        const updatedWorkflow = { ...workflow, id: data.id, isSaved: true };
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

  const addNode = (type: "trigger" | "action" | "ai", nodeType: string, label: string) => {
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
    
    setSelectedWorkflow(updatedWorkflow);
    setWorkflows(workflows.map(w => w.id === updatedWorkflow.id ? updatedWorkflow : w));
    setAddNodeDialogOpen(false);
  };

  const removeNode = (nodeId: string) => {
    if (!selectedWorkflow) return;
    
    const updatedWorkflow = {
      ...selectedWorkflow,
      nodes: selectedWorkflow.nodes.filter(n => n.id !== nodeId),
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
        },
      });

      if (error) throw error;

      if (data.success) {
        toast.success("Workflow executed successfully!", {
          description: `Processed ${data.results?.length || 0} nodes`,
        });
        
        // Show detailed results
        const failedNodes = data.results?.filter((r: { success: boolean }) => !r.success) || [];
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
    const allNodes = [...nodeTypes.triggers, ...nodeTypes.actions, ...nodeTypes.ai];
    const node = allNodes.find(n => n.id === nodeType);
    return node?.icon || Zap;
  };

  const getNodeColor = (type: "trigger" | "action" | "ai") => {
    switch (type) {
      case "trigger": return "bg-blue-500/10 border-blue-500/30 text-blue-500";
      case "action": return "bg-green-500/10 border-green-500/30 text-green-500";
      case "ai": return "bg-violet-500/10 border-violet-500/30 text-violet-500";
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
              <Label>Time</Label>
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
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
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
                  onClick={() => setSelectedWorkflow(workflow)}
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
                      return (
                        <div key={node.id} className="flex items-center gap-4">
                          <motion.div
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className={`relative group p-4 rounded-xl border-2 cursor-pointer hover:scale-105 transition-transform ${getNodeColor(node.type)}`}
                            onClick={() => {
                              setSelectedNodeForConfig(node);
                              setConfigDialogOpen(true);
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
                              {Object.keys(node.config).length > 0 && (
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
    </div>
  );
};
