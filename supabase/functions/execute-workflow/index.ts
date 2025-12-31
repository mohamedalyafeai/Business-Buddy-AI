import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface WorkflowNode {
  id: string;
  type: "trigger" | "action" | "ai";
  nodeType: string;
  config: Record<string, string>;
  label: string;
}

interface WorkflowRequest {
  workflowId: string;
  workflowName: string;
  nodes: WorkflowNode[];
  triggerData?: Record<string, unknown>;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { workflowId, workflowName, nodes, triggerData } = await req.json() as WorkflowRequest;
    
    console.log(`Executing workflow: ${workflowName} (${workflowId})`);
    console.log(`Nodes: ${nodes.length}`);

    const results: { nodeId: string; nodeType: string; success: boolean; output?: unknown; error?: string }[] = [];
    let context: Record<string, unknown> = { triggerData };

    // Process nodes in order
    for (const node of nodes) {
      console.log(`Processing node: ${node.label} (${node.nodeType})`);
      
      try {
        let nodeOutput: unknown = null;

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
              ai_analyze: "You are a data analyst. Analyze the given content and extract key insights and patterns.",
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

          // Create Task Action (simulated - stores in context)
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

          // Save Data Action (simulated)
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

          // Calendar Event Action (simulated)
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
        // Continue with next node even if one fails
      }
    }

    const allSuccessful = results.every(r => r.success);
    
    return new Response(
      JSON.stringify({
        success: allSuccessful,
        workflowId,
        workflowName,
        results,
        context: {
          lastOutput: context.lastOutput,
          createdTasks: context.createdTasks,
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error) {
    console.error("Workflow execution error:", error);
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
