import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  Sparkles, TrendingUp, Target, Lightbulb, RefreshCw, 
  AlertCircle, CheckCircle2, Clock
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Suggestion {
  title: string;
  description: string;
  priority: "high" | "medium" | "low";
}

interface Insights {
  productivityScore: number;
  topTopics: string[];
  suggestions: Suggestion[];
  weeklyGoal: string;
  insight: string;
}

const priorityColors = {
  high: "bg-red-500/10 text-red-500 border-red-500/20",
  medium: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  low: "bg-green-500/10 text-green-500 border-green-500/20",
};

const priorityIcons = {
  high: AlertCircle,
  medium: Clock,
  low: CheckCircle2,
};

export const ProductivityInsights = () => {
  const [insights, setInsights] = useState<Insights | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchInsights = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError("Please log in to view insights");
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/productivity-insights`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${session.access_token}`,
          },
        }
      );

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error("Rate limit exceeded. Try again later.");
        }
        throw new Error("Failed to fetch insights");
      }

      const data = await response.json();
      setInsights(data);
    } catch (err) {
      console.error("Error fetching insights:", err);
      setError(err instanceof Error ? err.message : "Failed to load insights");
      toast.error("Failed to load productivity insights");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInsights();
  }, []);

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-500";
    if (score >= 60) return "text-yellow-500";
    return "text-red-500";
  };

  if (error && !insights) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">{error}</p>
            <Button onClick={fetchInsights} variant="outline" className="mt-4">
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with refresh */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-semibold text-foreground">AI Productivity Insights</h2>
        </div>
        <Button 
          onClick={fetchInsights} 
          variant="ghost" 
          size="sm"
          disabled={loading}
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Productivity Score */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" />
                Productivity Score
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="animate-pulse h-20 bg-muted rounded" />
              ) : (
                <>
                  <div className={`text-5xl font-bold ${getScoreColor(insights?.productivityScore || 0)}`}>
                    {insights?.productivityScore || 0}
                  </div>
                  <Progress 
                    value={insights?.productivityScore || 0} 
                    className="mt-3 h-2"
                  />
                  <p className="text-sm text-muted-foreground mt-2">
                    {insights?.insight || "Analyzing your productivity..."}
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Weekly Goal */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="bg-card border-border h-full">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Target className="w-4 h-4 text-violet-500" />
                Weekly Goal
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="animate-pulse h-16 bg-muted rounded" />
              ) : (
                <p className="text-foreground font-medium">
                  {insights?.weeklyGoal || "Set your first goal by chatting with the assistant"}
                </p>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Top Topics */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="bg-card border-border h-full">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-yellow-500" />
                Top Focus Areas
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="animate-pulse h-16 bg-muted rounded" />
              ) : (
                <div className="flex flex-wrap gap-2">
                  {insights?.topTopics?.map((topic, index) => (
                    <Badge key={index} variant="secondary">
                      {topic}
                    </Badge>
                  )) || <span className="text-muted-foreground">No topics yet</span>}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Suggestions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              AI Suggestions
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="animate-pulse h-16 bg-muted rounded" />
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {insights?.suggestions?.map((suggestion, index) => {
                  const PriorityIcon = priorityIcons[suggestion.priority];
                  return (
                    <div
                      key={index}
                      className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                    >
                      <div className={`p-2 rounded-full ${priorityColors[suggestion.priority]}`}>
                        <PriorityIcon className="w-4 h-4" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium text-foreground">{suggestion.title}</h4>
                          <Badge 
                            variant="outline" 
                            className={priorityColors[suggestion.priority]}
                          >
                            {suggestion.priority}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {suggestion.description}
                        </p>
                      </div>
                    </div>
                  );
                }) || (
                  <p className="text-muted-foreground text-center py-4">
                    Start chatting to get personalized suggestions
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};
