import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-webhook-secret",
};

interface WebhookPayload {
  workflowId?: string;
  webhookId?: string;
  data?: Record<string, unknown>;
  variables?: Record<string, unknown>;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/').filter(Boolean);
    
    // Support both /webhook-trigger/workflow-id and body-based workflow ID
    let workflowId = pathParts[pathParts.length - 1];
    if (workflowId === 'webhook-trigger') {
      workflowId = '';
    }

    let payload: WebhookPayload = {};
    
    if (req.method === "POST" && req.headers.get("content-type")?.includes("application/json")) {
      try {
        payload = await req.json();
      } catch {
        payload = {};
      }
    }

    // Get workflow ID from path, body, or query param
    const finalWorkflowId = workflowId || payload.workflowId || url.searchParams.get('workflowId');
    
    if (!finalWorkflowId) {
      console.log("No workflow ID provided");
      return new Response(
        JSON.stringify({
          success: false,
          error: "Workflow ID required. Pass via URL path, query param, or request body.",
          usage: {
            pathExample: "/webhook-trigger/{workflow-id}",
            queryExample: "/webhook-trigger?workflowId={workflow-id}",
            bodyExample: { workflowId: "your-workflow-id", data: {} }
          }
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Webhook triggered for workflow: ${finalWorkflowId}`);

    // Fetch the workflow
    const { data: workflow, error: workflowError } = await supabase
      .from('workflows')
      .select('*')
      .eq('id', finalWorkflowId)
      .maybeSingle();

    if (workflowError) {
      console.error("Error fetching workflow:", workflowError);
      throw new Error(`Failed to fetch workflow: ${workflowError.message}`);
    }

    if (!workflow) {
      return new Response(
        JSON.stringify({ success: false, error: "Workflow not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!workflow.is_active) {
      return new Response(
        JSON.stringify({ success: false, error: "Workflow is not active" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify webhook secret if configured
    const webhookSecret = workflow.trigger_config?.webhookSecret;
    if (webhookSecret) {
      const providedSecret = req.headers.get("x-webhook-secret") || url.searchParams.get("secret");
      if (providedSecret !== webhookSecret) {
        console.log("Invalid webhook secret");
        return new Response(
          JSON.stringify({ success: false, error: "Invalid webhook secret" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Build nodes from workflow
    const nodes = [];
    
    if (workflow.trigger_type) {
      nodes.push({
        id: `trigger-${workflow.id}`,
        type: "trigger",
        nodeType: workflow.trigger_type,
        config: workflow.trigger_config || {},
        label: workflow.trigger_type,
      });
    }
    
    if (workflow.ai_action_type && workflow.ai_action_type !== "none") {
      nodes.push({
        id: `ai-${workflow.id}`,
        type: "ai",
        nodeType: workflow.ai_action_type,
        config: workflow.ai_config || {},
        label: workflow.ai_action_type,
      });
    }
    
    if (workflow.output_action_type && workflow.output_action_type !== "none") {
      nodes.push({
        id: `action-${workflow.id}`,
        type: "action",
        nodeType: workflow.output_action_type,
        config: workflow.output_config || {},
        label: workflow.output_action_type,
      });
    }

    // Merge incoming variables with workflow variables
    const variables = {
      ...(workflow.trigger_config?.variables || {}),
      ...(payload.variables || {}),
    };

    // Call the execute-workflow function
    const executeResponse = await fetch(`${supabaseUrl}/functions/v1/execute-workflow`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify({
        workflowId: workflow.id,
        workflowName: workflow.name,
        nodes,
        conditions: workflow.conditions || [],
        triggerData: {
          source: "webhook",
          method: req.method,
          timestamp: new Date().toISOString(),
          payload: payload.data || {},
          variables,
          headers: Object.fromEntries(
            [...req.headers.entries()].filter(([key]) => 
              !key.toLowerCase().includes('authorization') && 
              !key.toLowerCase().includes('secret')
            )
          ),
        },
        userId: workflow.user_id,
      }),
    });

    const executeResult = await executeResponse.json();

    console.log(`Webhook execution result:`, executeResult.success);

    return new Response(
      JSON.stringify({
        success: executeResult.success,
        workflowId: workflow.id,
        workflowName: workflow.name,
        executionId: executeResult.executionId,
        message: executeResult.success 
          ? "Workflow triggered successfully" 
          : "Workflow execution failed",
        results: executeResult.results,
        context: executeResult.context,
      }),
      {
        status: executeResult.success ? 200 : 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error) {
    console.error("Webhook trigger error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
