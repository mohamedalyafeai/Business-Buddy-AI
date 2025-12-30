import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Plus, Trash2, Play, Mail, FileText, Calendar, CheckSquare, 
  MessageSquare, Zap, ArrowRight, Settings, Loader2, Bot,
  Clock, Filter, Send, Database, Webhook
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

const defaultWorkflows: Workflow[] = [
  {
    id: "1",
    name: "Daily Email Summary",
    isActive: true,
    nodes: [
      { id: "n1", type: "trigger", nodeType: "schedule", config: { time: "09:00" }, label: "Daily at 9 AM" },
      { id: "n2", type: "ai", nodeType: "ai_summarize", config: { source: "emails" }, label: "Summarize Emails" },
      { id: "n3", type: "action", nodeType: "send_email", config: { to: "me" }, label: "Send Summary" },
    ],
  },
  {
    id: "2",
    name: "Auto Task Creator",
    isActive: false,
    nodes: [
      { id: "n1", type: "trigger", nodeType: "email_received", config: { filter: "urgent" }, label: "Urgent Email" },
      { id: "n2", type: "ai", nodeType: "ai_analyze", config: {}, label: "Extract Tasks" },
      { id: "n3", type: "action", nodeType: "create_task", config: {}, label: "Create Task" },
    ],
  },
];

export const WorkflowBuilder = () => {
  const [workflows, setWorkflows] = useState<Workflow[]>(defaultWorkflows);
  const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newWorkflowName, setNewWorkflowName] = useState("");
  const [addNodeDialogOpen, setAddNodeDialogOpen] = useState(false);
  const [runningWorkflow, setRunningWorkflow] = useState<string | null>(null);

  const createWorkflow = () => {
    if (!newWorkflowName.trim()) {
      toast.error("Please enter a workflow name");
      return;
    }
    
    const newWorkflow: Workflow = {
      id: Date.now().toString(),
      name: newWorkflowName,
      nodes: [],
      isActive: false,
    };
    
    setWorkflows([...workflows, newWorkflow]);
    setSelectedWorkflow(newWorkflow);
    setNewWorkflowName("");
    setIsCreating(false);
    toast.success("Workflow created!");
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
    };
    
    setSelectedWorkflow(updatedWorkflow);
    setWorkflows(workflows.map(w => w.id === updatedWorkflow.id ? updatedWorkflow : w));
  };

  const toggleWorkflow = (workflowId: string) => {
    setWorkflows(workflows.map(w => 
      w.id === workflowId ? { ...w, isActive: !w.isActive } : w
    ));
    toast.success("Workflow status updated");
  };

  const runWorkflow = async (workflowId: string) => {
    setRunningWorkflow(workflowId);
    // Simulate workflow execution
    await new Promise(resolve => setTimeout(resolve, 2000));
    setRunningWorkflow(null);
    toast.success("Workflow executed successfully!");
  };

  const deleteWorkflow = (workflowId: string) => {
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-semibold text-foreground">AI Workflow Builder</h2>
        </div>
        <Button onClick={() => setIsCreating(true)} size="sm">
          <Plus className="w-4 h-4 mr-2" />
          New Workflow
        </Button>
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
                            runWorkflow(workflow.id);
                          }}
                          disabled={runningWorkflow === workflow.id}
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
                  <CardTitle>{selectedWorkflow.name}</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Build your automation by adding nodes
                  </p>
                </div>
                <div className="flex gap-2">
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
                            className={`relative group p-4 rounded-xl border-2 ${getNodeColor(node.type)}`}
                          >
                            <button
                              onClick={() => removeNode(node.id)}
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
                            </div>
                          </motion.div>
                          {index < selectedWorkflow.nodes.length - 1 && (
                            <ArrowRight className="w-6 h-6 text-muted-foreground" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card className="bg-card border-border">
              <CardContent className="py-16 text-center">
                <Settings className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Select a workflow to edit</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Or create a new one to get started
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};
