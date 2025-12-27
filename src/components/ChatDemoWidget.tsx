import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Bot, User, Sparkles, X, MessageCircle, History, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Message = { role: "user" | "assistant"; content: string };
type Conversation = { id: string; title: string; created_at: string };

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat-demo`;

const suggestedQuestions = [
  "How can AI help my business?",
  "What tasks can you automate?",
  "Tell me about 24/7 support",
];

export const ChatDemoWidget = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load conversations when user logs in
  useEffect(() => {
    if (user) {
      loadConversations();
    } else {
      setConversations([]);
      setCurrentConversationId(null);
    }
  }, [user]);

  const loadConversations = async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from("chat_conversations")
      .select("id, title, created_at")
      .order("updated_at", { ascending: false });
    
    if (error) {
      console.error("Error loading conversations:", error);
      return;
    }
    
    setConversations(data || []);
  };

  const loadConversation = async (conversationId: string) => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from("chat_messages")
      .select("role, content")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });
    
    if (error) {
      console.error("Error loading messages:", error);
      return;
    }
    
    setMessages(data as Message[] || []);
    setCurrentConversationId(conversationId);
    setShowHistory(false);
  };

  const createNewConversation = async (): Promise<string | null> => {
    if (!user) return null;
    
    const { data, error } = await supabase
      .from("chat_conversations")
      .insert({ user_id: user.id, title: "New Chat" })
      .select("id")
      .single();
    
    if (error) {
      console.error("Error creating conversation:", error);
      return null;
    }
    
    await loadConversations();
    return data.id;
  };

  const saveMessage = async (conversationId: string, role: "user" | "assistant", content: string) => {
    if (!user) return;
    
    await supabase.from("chat_messages").insert({
      conversation_id: conversationId,
      user_id: user.id,
      role,
      content,
    });

    // Update conversation title based on first user message
    if (role === "user" && messages.length === 0) {
      const title = content.slice(0, 50) + (content.length > 50 ? "..." : "");
      await supabase
        .from("chat_conversations")
        .update({ title })
        .eq("id", conversationId);
      await loadConversations();
    }
  };

  const deleteConversation = async (conversationId: string) => {
    if (!user) return;
    
    const { error } = await supabase
      .from("chat_conversations")
      .delete()
      .eq("id", conversationId);
    
    if (error) {
      toast.error("Failed to delete conversation");
      return;
    }
    
    if (currentConversationId === conversationId) {
      setMessages([]);
      setCurrentConversationId(null);
    }
    
    await loadConversations();
    toast.success("Conversation deleted");
  };

  const startNewChat = () => {
    setMessages([]);
    setCurrentConversationId(null);
    setShowHistory(false);
  };

  const streamChat = async (userMessage: string) => {
    const userMsg: Message = { role: "user", content: userMessage };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setIsLoading(true);
    setInput("");

    let conversationId = currentConversationId;
    
    // Create new conversation if user is logged in and no current conversation
    if (user && !conversationId) {
      conversationId = await createNewConversation();
      setCurrentConversationId(conversationId);
    }

    // Save user message
    if (user && conversationId) {
      await saveMessage(conversationId, "user", userMessage);
    }

    let assistantContent = "";

    try {
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ messages: newMessages }),
      });

      if (!resp.ok || !resp.body) {
        throw new Error("Failed to get response");
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";

      // Add empty assistant message
      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              assistantContent += content;
              setMessages((prev) => {
                const updated = [...prev];
                updated[updated.length - 1] = {
                  role: "assistant",
                  content: assistantContent,
                };
                return updated;
              });
            }
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }

      // Save assistant message
      if (user && conversationId && assistantContent) {
        await saveMessage(conversationId, "assistant", assistantContent);
      }
    } catch (error) {
      console.error("Chat error:", error);
      setMessages((prev) => [
        ...prev.slice(0, -1),
        {
          role: "assistant",
          content: "Sorry, I encountered an error. Please try again!",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    streamChat(input.trim());
  };

  const handleSuggestion = (question: string) => {
    if (isLoading) return;
    streamChat(question);
  };

  return (
    <>
      {/* Floating trigger button for mobile */}
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.5 }}
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg glow-primary"
      >
        {isOpen ? <X className="w-6 h-6" /> : <MessageCircle className="w-6 h-6" />}
      </motion.button>

      {/* Desktop widget (always visible) / Mobile popup */}
      <AnimatePresence>
        {(isOpen || typeof window !== "undefined" && window.innerWidth >= 1024) && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ duration: 0.3 }}
            className="fixed lg:relative lg:block bottom-24 right-4 left-4 lg:bottom-auto lg:right-auto lg:left-auto z-40 lg:z-0 w-auto lg:w-full max-w-md mx-auto"
          >
            <div className="glass rounded-2xl border border-border/50 overflow-hidden shadow-2xl">
              {/* Header */}
              <div className="bg-gradient-to-r from-primary/20 to-accent/20 px-4 py-3 border-b border-border/30">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-sm">AI Agent Demo</h3>
                    <p className="text-xs text-muted-foreground">
                      {user ? "Your chats are saved" : "Sign in to save chats"}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    {user && (
                      <>
                        <button
                          onClick={startNewChat}
                          className="p-1.5 rounded-lg hover:bg-background/50 transition-colors"
                          title="New chat"
                        >
                          <Plus className="w-4 h-4 text-muted-foreground" />
                        </button>
                        <button
                          onClick={() => setShowHistory(!showHistory)}
                          className={`p-1.5 rounded-lg hover:bg-background/50 transition-colors ${showHistory ? "bg-background/50" : ""}`}
                          title="Chat history"
                        >
                          <History className="w-4 h-4 text-muted-foreground" />
                        </button>
                      </>
                    )}
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse ml-2" />
                  </div>
                </div>
              </div>

              {/* History panel */}
              <AnimatePresence>
                {showHistory && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="border-b border-border/30 overflow-hidden"
                  >
                    <div className="p-3 max-h-40 overflow-y-auto space-y-1">
                      {conversations.length === 0 ? (
                        <p className="text-xs text-muted-foreground text-center py-2">
                          No saved conversations yet
                        </p>
                      ) : (
                        conversations.map((conv) => (
                          <div
                            key={conv.id}
                            className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer hover:bg-background/50 transition-colors ${
                              currentConversationId === conv.id ? "bg-background/50" : ""
                            }`}
                          >
                            <button
                              onClick={() => loadConversation(conv.id)}
                              className="flex-1 text-left text-sm truncate"
                            >
                              {conv.title}
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteConversation(conv.id);
                              }}
                              className="p-1 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Messages area */}
              <div className="h-64 lg:h-72 overflow-y-auto p-4 space-y-3">
                {messages.length === 0 ? (
                  <div className="text-center py-6">
                    <Bot className="w-12 h-12 text-primary/50 mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground mb-4">
                      Hi! I'm your AI business assistant. Ask me anything about automation!
                    </p>
                    <div className="flex flex-wrap gap-2 justify-center">
                      {suggestedQuestions.map((q) => (
                        <button
                          key={q}
                          onClick={() => handleSuggestion(q)}
                          className="text-xs px-3 py-1.5 rounded-full glass border border-border/50 hover:border-primary/50 hover:bg-primary/10 transition-colors"
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  messages.map((msg, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      {msg.role === "assistant" && (
                        <div className="w-7 h-7 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
                          <Bot className="w-4 h-4 text-primary" />
                        </div>
                      )}
                      <div
                        className={`max-w-[80%] px-3 py-2 rounded-xl text-sm ${
                          msg.role === "user"
                            ? "bg-primary text-primary-foreground"
                            : "glass border border-border/30"
                        }`}
                      >
                        {msg.content || (
                          <span className="inline-flex gap-1">
                            <span className="w-2 h-2 bg-primary/50 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                            <span className="w-2 h-2 bg-primary/50 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                            <span className="w-2 h-2 bg-primary/50 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                          </span>
                        )}
                      </div>
                      {msg.role === "user" && (
                        <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                          <User className="w-4 h-4 text-muted-foreground" />
                        </div>
                      )}
                    </motion.div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input area */}
              <form onSubmit={handleSubmit} className="p-3 border-t border-border/30">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Type your message..."
                    disabled={isLoading}
                    className="flex-1 bg-background/50 border border-border/50 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-primary/50 disabled:opacity-50"
                  />
                  <Button
                    type="submit"
                    size="sm"
                    disabled={!input.trim() || isLoading}
                    className="rounded-xl px-4"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
