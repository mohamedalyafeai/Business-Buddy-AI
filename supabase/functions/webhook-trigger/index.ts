import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-webhook-secret, x-timestamp, x-signature",
};

interface WebhookPayload {
  workflowId?: string;
  webhookId?: string;
  data?: Record<string, unknown>;
  variables?: Record<string, unknown>;
}

// Rate limiting store (in-memory, resets on function cold start)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 100; // requests per minute
const RATE_LIMIT_WINDOW = 60000; // 1 minute in ms

function checkRateLimit(identifier: string): boolean {
  const now = Date.now();
  const record = rateLimitStore.get(identifier);
  
  if (!record || now > record.resetTime) {
    rateLimitStore.set(identifier, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return true;
  }
  
  if (record.count >= RATE_LIMIT) {
    return false;
  }
  
  record.count++;
  return true;
}

// HMAC signature verification
async function verifySignature(payload: string, signature: string, secret: string): Promise<boolean> {
  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const signatureBuffer = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
    const computedSignature = Array.from(new Uint8Array(signatureBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    return computedSignature === signature;
  } catch {
    return false;
  }
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
    
    // Get client IP for rate limiting
    const clientIP = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || 
                     req.headers.get("x-real-ip") || 
                     "unknown";
    
    // Check rate limit
    if (!checkRateLimit(clientIP)) {
      console.log(`Rate limit exceeded for IP: ${clientIP}`);
      return new Response(
        JSON.stringify({
          success: false,
          error: "Rate limit exceeded. Please try again later.",
        }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Support both /webhook-trigger/workflow-id and body-based workflow ID
    let workflowId = pathParts[pathParts.length - 1];
    if (workflowId === 'webhook-trigger') {
      workflowId = '';
    }

    let payload: WebhookPayload = {};
    let rawBody = "";
    
    if (req.method === "POST" && req.headers.get("content-type")?.includes("application/json")) {
      try {
        rawBody = await req.text();
        payload = JSON.parse(rawBody);
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

    console.log(`Webhook triggered for workflow: ${finalWorkflowId} from IP: ${clientIP}`);

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

    // Security: Verify webhook secret (REQUIRED if configured)
    const webhookSecret = workflow.trigger_config?.webhookSecret;
    const requireSecret = workflow.trigger_config?.requireSecret !== false; // Default to true
    
    if (webhookSecret && requireSecret) {
      const providedSecret = req.headers.get("x-webhook-secret") || url.searchParams.get("secret");
      const providedSignature = req.headers.get("x-signature");
      
      // Try signature-based authentication first
      if (providedSignature && rawBody) {
        const isValidSignature = await verifySignature(rawBody, providedSignature, webhookSecret);
        if (!isValidSignature) {
          console.log(`Invalid signature for workflow: ${finalWorkflowId}`);
          return new Response(
            JSON.stringify({ success: false, error: "Invalid webhook signature" }),
            { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      } else if (providedSecret !== webhookSecret) {
        console.log(`Invalid webhook secret for workflow: ${finalWorkflowId}`);
        return new Response(
          JSON.stringify({ success: false, error: "Invalid webhook secret" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } else if (!webhookSecret && requireSecret) {
      // If no secret configured but required, warn in logs
      console.warn(`WARNING: Workflow ${finalWorkflowId} has no webhook secret configured!`);
    }

    // Timestamp validation (prevent replay attacks)
    const timestamp = req.headers.get("x-timestamp");
    if (timestamp) {
      const requestTime = parseInt(timestamp, 10);
      const now = Date.now();
      const fiveMinutes = 5 * 60 * 1000;
      
      if (isNaN(requestTime) || Math.abs(now - requestTime) > fiveMinutes) {
        console.log(`Stale or invalid timestamp for workflow: ${finalWorkflowId}`);
        return new Response(
          JSON.stringify({ success: false, error: "Request timestamp is invalid or too old" }),
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
          clientIP,
          payload: payload.data || {},
          variables,
          headers: Object.fromEntries(
            [...req.headers.entries()].filter(([key]) => 
              !key.toLowerCase().includes('authorization') && 
              !key.toLowerCase().includes('secret') &&
              !key.toLowerCase().includes('signature')
            )
          ),
        },
        userId: workflow.user_id,
      }),
    });

    const executeResult = await executeResponse.json();

    console.log(`Webhook execution completed for workflow ${finalWorkflowId}:`, {
      success: executeResult.success,
      clientIP,
    });

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