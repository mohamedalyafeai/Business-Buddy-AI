import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    console.log("Checking for scheduled workflows...");

    const now = new Date();
    const currentHour = now.getUTCHours();
    const currentMinute = now.getUTCMinutes();
    const currentDay = now.getUTCDay(); // 0 = Sunday
    const currentDate = now.getUTCDate();

    // Fetch all active workflows with schedule triggers
    const { data: workflows, error } = await supabase
      .from('workflows')
      .select('*')
      .eq('is_active', true)
      .eq('trigger_type', 'schedule');

    if (error) {
      throw new Error(`Failed to fetch workflows: ${error.message}`);
    }

    console.log(`Found ${workflows?.length || 0} scheduled workflows`);

    const executedWorkflows: string[] = [];
    const skippedWorkflows: string[] = [];

    for (const workflow of workflows || []) {
      const config = workflow.trigger_config || {};
      const scheduleTime = config.time || "09:00";
      const frequency = config.frequency || "daily";
      const cronExpression = config.cron;

      const [scheduleHour, scheduleMinute] = scheduleTime.split(':').map(Number);

      // Check if it's time to run
      let shouldRun = false;

      if (cronExpression) {
        // Parse cron expression (simplified: minute hour day-of-month month day-of-week)
        shouldRun = evaluateCron(cronExpression, now);
      } else {
        // Check hour and minute match (with 5 minute window)
        const timeMatch = scheduleHour === currentHour && 
                         Math.abs(scheduleMinute - currentMinute) <= 5;

        if (timeMatch) {
          switch (frequency) {
            case "daily":
              shouldRun = true;
              break;
            case "weekly":
              // Run on Mondays by default, or specified day
              const runDay = config.dayOfWeek ?? 1;
              shouldRun = currentDay === runDay;
              break;
            case "monthly":
              // Run on 1st of month by default, or specified date
              const runDate = config.dayOfMonth ?? 1;
              shouldRun = currentDate === runDate;
              break;
            case "hourly":
              shouldRun = Math.abs(scheduleMinute - currentMinute) <= 5;
              break;
          }
        }
      }

      if (!shouldRun) {
        skippedWorkflows.push(workflow.name);
        continue;
      }

      console.log(`Executing scheduled workflow: ${workflow.name}`);

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

      // Get workflow variables
      const variables = workflow.trigger_config?.variables || {};

      // Call the execute-workflow function
      try {
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
              source: "schedule",
              scheduledTime: scheduleTime,
              frequency,
              executedAt: now.toISOString(),
              variables,
            },
            userId: workflow.user_id,
          }),
        });

        const result = await executeResponse.json();
        
        if (result.success) {
          executedWorkflows.push(workflow.name);
          console.log(`Successfully executed: ${workflow.name}`);
        } else {
          console.error(`Failed to execute ${workflow.name}:`, result.error);
        }
      } catch (execError) {
        console.error(`Error executing ${workflow.name}:`, execError);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        timestamp: now.toISOString(),
        executed: executedWorkflows,
        skipped: skippedWorkflows,
        summary: {
          total: workflows?.length || 0,
          executed: executedWorkflows.length,
          skipped: skippedWorkflows.length,
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error) {
    console.error("Schedule workflow error:", error);
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

// Simplified cron expression evaluator
function evaluateCron(expression: string, date: Date): boolean {
  const parts = expression.trim().split(/\s+/);
  if (parts.length !== 5) return false;

  const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;

  const matches = (field: string, value: number, max: number): boolean => {
    if (field === '*') return true;
    
    // Handle step values like */5
    if (field.startsWith('*/')) {
      const step = parseInt(field.slice(2));
      return value % step === 0;
    }
    
    // Handle ranges like 1-5
    if (field.includes('-')) {
      const [start, end] = field.split('-').map(Number);
      return value >= start && value <= end;
    }
    
    // Handle lists like 1,3,5
    if (field.includes(',')) {
      return field.split(',').map(Number).includes(value);
    }
    
    return parseInt(field) === value;
  };

  return (
    matches(minute, date.getUTCMinutes(), 59) &&
    matches(hour, date.getUTCHours(), 23) &&
    matches(dayOfMonth, date.getUTCDate(), 31) &&
    matches(month, date.getUTCMonth() + 1, 12) &&
    matches(dayOfWeek, date.getUTCDay(), 6)
  );
}
