import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch recent conversations and messages
    const { data: conversations } = await supabaseClient
      .from('chat_conversations')
      .select('id, title, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10);

    const { data: messages } = await supabaseClient
      .from('chat_messages')
      .select('content, role, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const chatSummary = messages?.map(m => `${m.role}: ${m.content.substring(0, 100)}`).join('\n') || 'No chat history';
    const conversationTitles = conversations?.map(c => c.title).join(', ') || 'No conversations';

    console.log("Generating productivity insights for user:", user.id);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are a productivity analyst AI. Analyze the user's chat history and provide actionable insights.
Return a JSON object with this exact structure:
{
  "productivityScore": <number 1-100>,
  "topTopics": ["topic1", "topic2", "topic3"],
  "suggestions": [
    {"title": "suggestion title", "description": "brief description", "priority": "high|medium|low"},
    ...
  ],
  "weeklyGoal": "A specific, actionable goal for the week",
  "insight": "A brief insight about their work patterns"
}
Only return valid JSON, no other text.`
          },
          {
            role: "user",
            content: `Analyze this user's productivity based on their chat history:
            
Conversation topics: ${conversationTitles}

Recent messages summary:
${chatSummary}

Total conversations: ${conversations?.length || 0}
Total messages: ${messages?.length || 0}`
          }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      throw new Error("Failed to generate insights");
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content;
    
    let insights;
    try {
      insights = JSON.parse(content);
    } catch {
      console.error("Failed to parse AI response:", content);
      insights = {
        productivityScore: 75,
        topTopics: ["General tasks", "Work planning", "Communication"],
        suggestions: [
          { title: "Start using task lists", description: "Break down your work into manageable tasks", priority: "high" },
          { title: "Schedule focus time", description: "Block time for deep work", priority: "medium" }
        ],
        weeklyGoal: "Complete 3 major tasks this week",
        insight: "You're making good progress. Keep it up!"
      };
    }

    return new Response(JSON.stringify(insights), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error("Productivity insights error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
