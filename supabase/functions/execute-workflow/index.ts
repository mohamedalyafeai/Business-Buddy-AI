import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface WorkflowNode {
  id: string;
  type: "trigger" | "action" | "ai" | "condition";
  nodeType: string;
  config: Record<string, string>;
  label: string;
}

interface Condition {
  id: string;
  field: string;
  operator: "contains" | "equals" | "not_equals" | "greater_than" | "less_than" | "is_empty" | "is_not_empty";
  value: string;
  thenAction: string;
  elseAction: string;
}

interface WorkflowRequest {
  workflowId: string;
  workflowName: string;
  nodes: WorkflowNode[];
  conditions?: Condition[];
  triggerData?: Record<string, unknown>;
  userId?: string;
}

const evaluateCondition = (condition: Condition, context: Record<string, unknown>): boolean => {
  const fieldValue = String(context[condition.field] || context.lastAiOutput || context.lastOutput || "");
  const compareValue = condition.value;

  switch (condition.operator) {
    case "contains":
      return fieldValue.toLowerCase().includes(compareValue.toLowerCase());
    case "equals":
      return fieldValue.toLowerCase() === compareValue.toLowerCase();
    case "not_equals":
      return fieldValue.toLowerCase() !== compareValue.toLowerCase();
    case "greater_than":
      return parseFloat(fieldValue) > parseFloat(compareValue);
    case "less_than":
      return parseFloat(fieldValue) < parseFloat(compareValue);
    case "is_empty":
      return !fieldValue || fieldValue.trim() === "";
    case "is_not_empty":
      return !!fieldValue && fieldValue.trim() !== "";
    default:
      return false;
  }
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  let executionId: string | null = null;

  try {
    const { workflowId, workflowName, nodes, conditions, triggerData, userId } = await req.json() as WorkflowRequest;
    
    console.log(`Executing workflow: ${workflowName} (${workflowId})`);
    console.log(`Nodes: ${nodes.length}, Conditions: ${conditions?.length || 0}`);

    // Create execution record
    if (userId) {
      const { data: execution, error: execError } = await supabase
        .from('workflow_executions')
        .insert({
          workflow_id: workflowId,
          user_id: userId,
          status: 'running',
          context: { triggerData },
        })
        .select()
        .single();

      if (!execError && execution) {
        executionId = execution.id;
        console.log(`Created execution record: ${executionId}`);
      }
    }

    const results: { nodeId: string; nodeType: string; success: boolean; output?: unknown; error?: string; skipped?: boolean; conditionResult?: boolean }[] = [];
    let context: Record<string, unknown> = { triggerData };
    let skipRemainingNodes = false;
    let skipUntilAction: string | null = null;

    // Process nodes in order
    for (const node of nodes) {
      // Check if we should skip this node based on condition
      if (skipUntilAction && node.nodeType !== skipUntilAction) {
        results.push({
          nodeId: node.id,
          nodeType: node.nodeType,
          success: true,
          skipped: true,
          output: { message: "Skipped due to condition" },
        });
        continue;
      }
      
      if (skipUntilAction && node.nodeType === skipUntilAction) {
        skipUntilAction = null; // Reset, we found our target action
      }

      console.log(`Processing node: ${node.label} (${node.nodeType})`);
      
      try {
        let nodeOutput: unknown = null;

        // Handle condition nodes
        if (node.type === "condition") {
          const condition = conditions?.find(c => c.id === node.id);
          if (condition) {
            const conditionMet = evaluateCondition(condition, context);
            console.log(`Condition evaluated: ${conditionMet}`);
            
            nodeOutput = { conditionMet, field: condition.field, operator: condition.operator };
            context.lastConditionResult = conditionMet;
            
            // Set which action to skip to based on condition result
            if (!conditionMet && condition.elseAction && condition.elseAction !== "skip") {
              skipUntilAction = condition.elseAction;
            } else if (conditionMet && condition.thenAction === "skip") {
              skipRemainingNodes = true;
            }

            results.push({
              nodeId: node.id,
              nodeType: node.nodeType,
              success: true,
              output: nodeOutput,
              conditionResult: conditionMet,
            });
            continue;
          }
        }

        switch (node.nodeType) {
          // AI Actions
          case "ai_summarize":
          case "ai_draft":
          case "ai_analyze":
          case "ai_respond": {
            const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
            if (!LOVABLE_API_KEY) {
              throw new Error("LOVABLE_API_KEY not configured");
            }

            const systemPrompts: Record<string, string> = {
              ai_summarize: "You are an expert summarizer. Provide concise, clear summaries of the given content.",
              ai_draft: "You are a professional writer. Draft clear, engaging content based on the given context.",
              ai_analyze: "You are a data analyst. Analyze the given content and extract key insights and patterns. Return a sentiment score (positive/negative/neutral) at the start.",
              ai_respond: "You are a helpful assistant. Generate appropriate responses based on the given context.",
            };

            const userPrompt = node.config.prompt || context.lastOutput || "Analyze the following context and provide insights.";

            const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${LOVABLE_API_KEY}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                model: "google/gemini-2.5-flash",
                messages: [
                  { role: "system", content: systemPrompts[node.nodeType] },
                  { role: "user", content: String(userPrompt) },
                ],
              }),
            });

            if (!aiResponse.ok) {
              const errorText = await aiResponse.text();
              throw new Error(`AI API error: ${errorText}`);
            }

            const aiData = await aiResponse.json();
            nodeOutput = aiData.choices?.[0]?.message?.content || "No response generated";
            context.lastAiOutput = nodeOutput;
            context.lastOutput = nodeOutput;
            
            // Extract sentiment for conditional logic
            const outputStr = String(nodeOutput).toLowerCase();
            if (outputStr.includes("positive")) {
              context.sentiment = "positive";
            } else if (outputStr.includes("negative")) {
              context.sentiment = "negative";
            } else {
              context.sentiment = "neutral";
            }
            break;
          }

          // Send Email Action
          case "send_email": {
            const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
            if (!RESEND_API_KEY) {
              throw new Error("RESEND_API_KEY not configured. Please add it in your secrets.");
            }

            const resend = new Resend(RESEND_API_KEY);
            
            const to = node.config.to || node.config.email || "test@example.com";
            const subject = node.config.subject || `Workflow: ${workflowName}`;
            const body = node.config.body || String(context.lastAiOutput || context.lastOutput || "Workflow executed successfully");

            const emailResponse = await resend.emails.send({
              from: node.config.from || "Workflow <onboarding@resend.dev>",
              to: [to],
              subject: subject,
              html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                  <h2 style="color: #333;">${subject}</h2>
                  <div style="color: #666; line-height: 1.6;">
                    ${body.replace(/\n/g, '<br/>')}
                  </div>
                  <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
                  <p style="color: #999; font-size: 12px;">
                    Sent by AI Workflow: ${workflowName}
                  </p>
                </div>
              `,
            });

            console.log("Email sent:", emailResponse);
            nodeOutput = { emailId: emailResponse.data?.id, to, subject };
            context.lastOutput = nodeOutput;
            break;
          }

          // Create Task Action
          case "create_task": {
            const taskTitle = node.config.title || String(context.lastAiOutput || "New Task from Workflow");
            const task = {
              title: taskTitle,
              priority: node.config.priority || "medium",
              createdAt: new Date().toISOString(),
              workflowId,
            };
            nodeOutput = task;
            context.lastOutput = task;
            context.createdTasks = [...(context.createdTasks as unknown[] || []), task];
            break;
          }

          // Save Data Action
          case "save_data": {
            const dataToSave = {
              data: context.lastOutput,
              savedAt: new Date().toISOString(),
              workflowId,
            };
            nodeOutput = dataToSave;
            context.lastOutput = dataToSave;
            break;
          }

          // Calendar Event Action
          case "calendar_event": {
            const event = {
              title: node.config.title || "Workflow Event",
              date: node.config.date || new Date().toISOString(),
              description: String(context.lastAiOutput || ""),
              workflowId,
            };
            nodeOutput = event;
            context.lastOutput = event;
            break;
          }

          // Trigger nodes - just pass through
          case "schedule":
          case "webhook":
          case "email_received": {
            nodeOutput = { triggered: true, config: node.config, triggerData };
            context.lastOutput = nodeOutput;
            break;
          }

          default:
            nodeOutput = { message: `Node type ${node.nodeType} processed` };
            context.lastOutput = nodeOutput;
        }

        results.push({
          nodeId: node.id,
          nodeType: node.nodeType,
          success: true,
          output: nodeOutput,
        });

      } catch (nodeError) {
        console.error(`Error in node ${node.id}:`, nodeError);
        results.push({
          nodeId: node.id,
          nodeType: node.nodeType,
          success: false,
          error: nodeError instanceof Error ? nodeError.message : "Unknown error",
        });
      }
    }

    const allSuccessful = results.every(r => r.success || r.skipped);

    // Update execution record
    if (executionId) {
      await supabase
        .from('workflow_executions')
        .update({
          status: allSuccessful ? 'completed' : 'failed',
          completed_at: new Date().toISOString(),
          results: results,
          context: {
            lastOutput: context.lastOutput,
            createdTasks: context.createdTasks,
            sentiment: context.sentiment,
          },
        })
        .eq('id', executionId);
    }
    
    return new Response(
      JSON.stringify({
        success: allSuccessful,
        workflowId,
        workflowName,
        executionId,
        results,
        context: {
          lastOutput: context.lastOutput,
          createdTasks: context.createdTasks,
          sentiment: context.sentiment,
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error) {
    console.error("Workflow execution error:", error);
    
    // Update execution record with error
    if (executionId) {
      await supabase
        .from('workflow_executions')
        .update({
          status: 'failed',
          completed_at: new Date().toISOString(),
          error: error instanceof Error ? error.message : "Unknown error",
        })
        .eq('id', executionId);
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        executionId,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
