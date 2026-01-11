import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const token = url.searchParams.get("token");

    if (!token) {
      return new Response(
        JSON.stringify({ error: "Share token is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Fetching shared workflow with token:", token);

    // Create Supabase client with service role key for public access
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch the share record
    const { data: share, error: shareError } = await supabase
      .from("workflow_shares")
      .select("*")
      .eq("share_token", token)
      .eq("is_active", true)
      .maybeSingle();

    if (shareError) {
      console.error("Error fetching share:", shareError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch share" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!share) {
      return new Response(
        JSON.stringify({ error: "Share not found or expired" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check expiration
    if (share.expires_at && new Date(share.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ error: "This share link has expired" }),
        { status: 410, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch the workflow
    const { data: workflow, error: workflowError } = await supabase
      .from("workflows")
      .select("id, name, trigger_type, trigger_config, ai_action_type, ai_config, output_action_type, output_config, conditions, created_at")
      .eq("id", share.workflow_id)
      .maybeSingle();

    if (workflowError) {
      console.error("Error fetching workflow:", workflowError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch workflow" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!workflow) {
      return new Response(
        JSON.stringify({ error: "Workflow not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Increment view count
    await supabase
      .from("workflow_shares")
      .update({ view_count: share.view_count + 1 })
      .eq("id", share.id);

    console.log("Successfully fetched shared workflow:", workflow.name);

    return new Response(
      JSON.stringify({ 
        success: true, 
        workflow,
        share: {
          created_at: share.created_at,
          view_count: share.view_count + 1
        }
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );

  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
