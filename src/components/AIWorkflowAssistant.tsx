import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Sparkles, X, Lightbulb, Wand2, BarChart3, 
  Loader2, Copy, Check, ChevronDown, Bot
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import ReactMarkdown from 'react-markdown';

type SuggestionType = "improve" | "generate" | "analyze";

interface AIWorkflowAssistantProps {
  workflows?: any[];
  onApplySuggestion?: (workflow: any) => void;
}

const AI_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-workflow-suggestions`;

export const AIWorkflowAssistant = ({ workflows = [], onApplySuggestion }: AIWorkflowAssistantProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeType, setActiveType] = useState<SuggestionType>("improve");
  const [context, setContext] = useState("");
  const [response, setResponse] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const { i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';

  const types: { type: SuggestionType; icon: React.ElementType; label: string; labelAr: string }[] = [
    { type: "improve", icon: Lightbulb, label: "Improve Workflows", labelAr: "تحسين العمليات" },
    { type: "generate", icon: Wand2, label: "Generate Workflow", labelAr: "إنشاء عملية" },
    { type: "analyze", icon: BarChart3, label: "Analyze Patterns", labelAr: "تحليل الأنماط" },
  ];

  const getSuggestions = async () => {
    if (activeType === "generate" && !context.trim()) {
      toast.error(isRTL ? "يرجى وصف العملية المطلوبة" : "Please describe the workflow you want");
      return;
    }

    if ((activeType === "improve" || activeType === "analyze") && workflows.length === 0) {
      toast.error(isRTL ? "لا توجد عمليات لتحليلها" : "No workflows to analyze");
      return;
    }

    setIsLoading(true);
    setResponse("");

    try {
      const resp = await fetch(AI_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          workflows,
          type: activeType,
          context,
        }),
      });

      if (!resp.ok) {
        const errorData = await resp.json();
        throw new Error(errorData.error || "Failed to get suggestions");
      }

      const reader = resp.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let fullResponse = "";

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
                fullResponse += content;
                setResponse(fullResponse);
              }
            } catch {
              // Skip invalid JSON
            }
          }
        }
      }
    } catch (error) {
      console.error("AI suggestions error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to get suggestions");
    } finally {
      setIsLoading(false);
    }
  };

  const copyResponse = () => {
    navigator.clipboard.writeText(response);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success(isRTL ? "تم النسخ" : "Copied!");
  };

  return (
    <>
      {/* Floating Button */}
      <motion.button
        className="fixed bottom-6 left-6 z-50 w-14 h-14 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg flex items-center justify-center hover:scale-110 transition-transform"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(true)}
        aria-label="AI Workflow Assistant"
      >
        <Sparkles className="w-6 h-6" />
      </motion.button>

      {/* Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, x: -20, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -20, scale: 0.95 }}
            className="fixed bottom-6 left-6 z-50 w-[450px] h-[600px] bg-card border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="p-4 border-b border-border bg-gradient-to-r from-amber-500/10 to-orange-500/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 flex items-center justify-center">
                    <Bot className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">
                      {isRTL ? "مساعد الذكاء الاصطناعي" : "AI Workflow Assistant"}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {isRTL ? "اقتراحات ذكية للعمليات" : "Smart workflow suggestions"}
                    </p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)}>
                  <X className="w-5 h-5" />
                </Button>
              </div>

              {/* Type Selector */}
              <div className="flex gap-2 mt-4">
                {types.map(({ type, icon: Icon, label, labelAr }) => (
                  <button
                    key={type}
                    onClick={() => setActiveType(type)}
                    className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                      activeType === type
                        ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white'
                        : 'bg-muted hover:bg-muted/80 text-foreground'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="hidden sm:inline">{isRTL ? labelAr : label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4">
              {activeType === "generate" && (
                <div className="mb-4">
                  <label className="text-sm font-medium mb-2 block">
                    {isRTL ? "صف العملية المطلوبة:" : "Describe the workflow you need:"}
                  </label>
                  <Textarea
                    value={context}
                    onChange={(e) => setContext(e.target.value)}
                    placeholder={isRTL 
                      ? "مثال: عملية تحلل رسائل البريد الواردة وترسل ردود تلقائية..."
                      : "Example: A workflow that analyzes incoming emails and sends automated responses..."
                    }
                    className="min-h-[100px]"
                  />
                </div>
              )}

              {response && (
                <div className="bg-muted/50 rounded-xl p-4 relative">
                  <div className="absolute top-2 right-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={copyResponse}
                    >
                      {copied ? (
                        <Check className="w-4 h-4 text-green-500" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <ReactMarkdown>{response}</ReactMarkdown>
                  </div>
                </div>
              )}

              {!response && !isLoading && (
                <div className="h-full flex flex-col items-center justify-center text-center px-4">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-r from-amber-500/20 to-orange-500/20 flex items-center justify-center mb-4">
                    <Sparkles className="w-8 h-8 text-amber-500" />
                  </div>
                  <h4 className="font-semibold text-foreground mb-2">
                    {isRTL ? "احصل على اقتراحات ذكية" : "Get Smart Suggestions"}
                  </h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    {activeType === "improve" && (isRTL 
                      ? "سأحلل عملياتك وأقترح تحسينات" 
                      : "I'll analyze your workflows and suggest improvements"
                    )}
                    {activeType === "generate" && (isRTL 
                      ? "صف ما تحتاجه وسأنشئ عملية كاملة" 
                      : "Describe what you need and I'll generate a complete workflow"
                    )}
                    {activeType === "analyze" && (isRTL 
                      ? "سأحلل أنماط استخدامك وأقدم رؤى" 
                      : "I'll analyze your usage patterns and provide insights"
                    )}
                  </p>
                </div>
              )}

              {isLoading && !response && (
                <div className="h-full flex items-center justify-center">
                  <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-border">
              <Button
                onClick={getSuggestions}
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin me-2" />
                    {isRTL ? "جاري التحليل..." : "Analyzing..."}
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 me-2" />
                    {activeType === "improve" && (isRTL ? "تحسين العمليات" : "Improve Workflows")}
                    {activeType === "generate" && (isRTL ? "إنشاء العملية" : "Generate Workflow")}
                    {activeType === "analyze" && (isRTL ? "تحليل الأنماط" : "Analyze Patterns")}
                  </>
                )}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
