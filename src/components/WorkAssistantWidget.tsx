import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Bot, X, Send, Mail, Calendar, FileText, CheckSquare, 
  Loader2, Sparkles, Briefcase, ChevronDown
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface Message {
  role: "user" | "assistant";
  content: string;
}

type AssistantMode = "general" | "email" | "tasks" | "calendar" | "documents";

const modeConfig: Record<AssistantMode, { icon: React.ElementType; label: string; prompt: string }> = {
  general: {
    icon: Briefcase,
    label: "General",
    prompt: "You are a professional AI work assistant. Help users with general work tasks, answer questions, and provide productivity tips. Be concise and helpful."
  },
  email: {
    icon: Mail,
    label: "Email",
    prompt: "You are an AI email assistant. Help users draft professional emails, respond to messages, summarize email threads, and manage their inbox efficiently. Always provide well-structured, professional email templates when asked."
  },
  tasks: {
    icon: CheckSquare,
    label: "Tasks",
    prompt: "You are an AI task management assistant. Help users organize tasks, prioritize work, break down projects into actionable items, and track progress. Provide clear, actionable task lists."
  },
  calendar: {
    icon: Calendar,
    label: "Calendar",
    prompt: "You are an AI calendar assistant. Help users schedule meetings, manage their time, plan their day/week, and avoid scheduling conflicts. Suggest optimal meeting times and help with time blocking."
  },
  documents: {
    icon: FileText,
    label: "Documents",
    prompt: "You are an AI document assistant. Help users draft documents, summarize content, create outlines, and improve writing. Provide clear structure and professional language."
  }
};

const quickActions = [
  { mode: "email" as AssistantMode, text: "Draft a professional email" },
  { mode: "tasks" as AssistantMode, text: "Create a task list for today" },
  { mode: "calendar" as AssistantMode, text: "Help me plan my week" },
  { mode: "documents" as AssistantMode, text: "Write a meeting summary" },
];

const WORK_ASSISTANT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/work-assistant`;

export const WorkAssistantWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [mode, setMode] = useState<AssistantMode>("general");
  const [showModeSelector, setShowModeSelector] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const streamWorkAssistant = async (userMessage: string) => {
    setIsLoading(true);
    const newMessages: Message[] = [...messages, { role: "user", content: userMessage }];
    setMessages(newMessages);
    setInput("");

    try {
      const response = await fetch(WORK_ASSISTANT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: newMessages,
          mode: mode,
          systemPrompt: modeConfig[mode].prompt,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to get response");
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let assistantMessage = "";

      setMessages([...newMessages, { role: "assistant", content: "" }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") continue;

            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                assistantMessage += content;
                setMessages([...newMessages, { role: "assistant", content: assistantMessage }]);
              }
            } catch {
              // Skip invalid JSON
            }
          }
        }
      }
    } catch (error) {
      console.error("Work assistant error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to get response");
      setMessages(newMessages);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    streamWorkAssistant(input.trim());
  };

  const handleQuickAction = (action: typeof quickActions[0]) => {
    setMode(action.mode);
    streamWorkAssistant(action.text);
  };

  const clearChat = () => {
    setMessages([]);
  };

  const ModeIcon = modeConfig[mode].icon;

  return (
    <>
      {/* Floating Trigger Button */}
      <motion.button
        className="fixed bottom-6 right-24 z-50 w-14 h-14 rounded-full bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-lg flex items-center justify-center hover:scale-110 transition-transform"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(true)}
        aria-label="Open Work Assistant"
      >
        <Briefcase className="w-6 h-6" />
      </motion.button>

      {/* Widget Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-6 right-6 z-50 w-[420px] h-[600px] bg-card border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="p-4 border-b border-border bg-gradient-to-r from-violet-600/10 to-purple-600/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-r from-violet-600 to-purple-600 flex items-center justify-center">
                    <Briefcase className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">Work Assistant</h3>
                    <p className="text-xs text-muted-foreground">AI-powered productivity helper</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {messages.length > 0 && (
                    <Button variant="ghost" size="sm" onClick={clearChat} className="text-xs">
                      Clear
                    </Button>
                  )}
                  <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)}>
                    <X className="w-5 h-5" />
                  </Button>
                </div>
              </div>

              {/* Mode Selector */}
              <div className="mt-3 relative">
                <button
                  onClick={() => setShowModeSelector(!showModeSelector)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-background/50 hover:bg-background transition-colors text-sm"
                >
                  <ModeIcon className="w-4 h-4 text-violet-500" />
                  <span className="text-foreground">{modeConfig[mode].label} Mode</span>
                  <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${showModeSelector ? 'rotate-180' : ''}`} />
                </button>

                <AnimatePresence>
                  {showModeSelector && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="absolute top-full left-0 mt-2 w-48 bg-popover border border-border rounded-lg shadow-lg overflow-hidden z-10"
                    >
                      {Object.entries(modeConfig).map(([key, config]) => {
                        const Icon = config.icon;
                        return (
                          <button
                            key={key}
                            onClick={() => {
                              setMode(key as AssistantMode);
                              setShowModeSelector(false);
                            }}
                            className={`w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-muted transition-colors ${
                              mode === key ? 'bg-violet-500/10 text-violet-500' : 'text-foreground'
                            }`}
                          >
                            <Icon className="w-4 h-4" />
                            <span className="text-sm">{config.label}</span>
                          </button>
                        );
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center px-4">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-r from-violet-600/20 to-purple-600/20 flex items-center justify-center mb-4">
                    <Sparkles className="w-8 h-8 text-violet-500" />
                  </div>
                  <h4 className="font-semibold text-foreground mb-2">How can I help you today?</h4>
                  <p className="text-sm text-muted-foreground mb-6">
                    I can help with emails, tasks, scheduling, and documents.
                  </p>
                  
                  {/* Quick Actions */}
                  <div className="w-full space-y-2">
                    {quickActions.map((action, index) => {
                      const ActionIcon = modeConfig[action.mode].icon;
                      return (
                        <button
                          key={index}
                          onClick={() => handleQuickAction(action)}
                          className="w-full flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors text-left group"
                        >
                          <ActionIcon className="w-5 h-5 text-violet-500" />
                          <span className="text-sm text-foreground group-hover:text-violet-500 transition-colors">
                            {action.text}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                messages.map((message, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                        message.role === "user"
                          ? "bg-gradient-to-r from-violet-600 to-purple-600 text-white"
                          : "bg-muted text-foreground"
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    </div>
                  </motion.div>
                ))
              )}
              {isLoading && messages[messages.length - 1]?.role === "user" && (
                <div className="flex justify-start">
                  <div className="bg-muted rounded-2xl px-4 py-3">
                    <Loader2 className="w-5 h-5 animate-spin text-violet-500" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <form onSubmit={handleSubmit} className="p-4 border-t border-border">
              <div className="flex gap-2">
                <Textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={`Ask about ${modeConfig[mode].label.toLowerCase()}...`}
                  className="flex-1 min-h-[44px] max-h-[120px] resize-none"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSubmit(e);
                    }
                  }}
                />
                <Button
                  type="submit"
                  disabled={!input.trim() || isLoading}
                  className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700"
                >
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                </Button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
