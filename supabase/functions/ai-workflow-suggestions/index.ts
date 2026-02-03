import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { workflows, type, context } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log(`Processing AI workflow suggestion request: type=${type}`);

    let systemPrompt = "";
    let userPrompt = "";

    if (type === "improve") {
      systemPrompt = `You are an expert workflow automation consultant. Analyze the user's workflow and provide specific, actionable improvements to make it more efficient, reliable, and powerful.

Focus on:
- Performance optimization
- Error handling improvements
- Better trigger conditions
- More effective AI actions
- Enhanced output configurations

Respond in the same language as the workflow name (Arabic or English).`;
      
      userPrompt = `Analyze this workflow and suggest 3-5 specific improvements:
${JSON.stringify(workflows, null, 2)}`;

    } else if (type === "generate") {
      systemPrompt = `You are an expert workflow automation designer. Based on the user's description, generate a complete workflow configuration that can be used directly.

The workflow should include:
- Appropriate trigger type and configuration
- Smart AI action with relevant prompt
- Suitable output action
- Optional conditions

Return ONLY a valid JSON object with this structure:
{
  "name": "Workflow Name",
  "description": "Brief description",
  "trigger_type": "email|schedule|webhook|manual",
  "trigger_config": {},
  "ai_action_type": "analyze|summarize|generate|classify",
  "ai_config": { "prompt": "...", "model": "..." },
  "output_action_type": "email|webhook|notification|slack",
  "output_config": {},
  "conditions": []
}`;
      
      userPrompt = `Create a workflow for: ${context}`;

    } else if (type === "analyze") {
      systemPrompt = `You are a workflow analytics expert. Analyze the user's workflows and provide insights about:
- Usage patterns
- Potential bottlenecks
- Optimization opportunities
- Success rate predictions
- Recommended automations based on patterns

Respond in the same language as the workflow names (Arabic or English). Be concise and actionable.`;
      
      userPrompt = `Analyze these workflows and provide insights:
${JSON.stringify(workflows, null, 2)}`;
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Service temporarily unavailable." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      return new Response(JSON.stringify({ error: "Failed to get AI suggestions" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Streaming AI suggestions response");

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("AI workflow suggestions error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
