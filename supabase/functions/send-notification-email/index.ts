import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationEmailRequest {
  type: "welcome" | "profile_update";
  email: string;
  displayName?: string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("Received request to send notification email");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is not configured");
    }

    const { type, email, displayName }: NotificationEmailRequest = await req.json();
    console.log(`Sending ${type} email to ${email}`);

    let subject: string;
    let html: string;

    if (type === "welcome") {
      subject = "Welcome to AgentAI!";
      html = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .logo { font-size: 28px; font-weight: bold; color: #7c3aed; }
            h1 { color: #1a1a1a; font-size: 24px; margin-bottom: 20px; }
            p { margin-bottom: 16px; color: #4a4a4a; }
            .button { display: inline-block; background: linear-gradient(135deg, #7c3aed, #a855f7); color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; }
            .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; color: #888; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">✨ AgentAI</div>
            </div>
            <h1>Welcome${displayName ? `, ${displayName}` : ""}!</h1>
            <p>Thank you for joining AgentAI. We're excited to have you on board!</p>
            <p>With AgentAI, you can:</p>
            <ul>
              <li>Chat with our intelligent AI assistant</li>
              <li>Get help with complex tasks</li>
              <li>Access your conversation history anytime</li>
            </ul>
            <p>Ready to get started?</p>
            <div class="footer">
              <p>The AgentAI Team</p>
            </div>
          </div>
        </body>
        </html>
      `;
    } else if (type === "profile_update") {
      subject = "Your AgentAI Profile Has Been Updated";
      html = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .logo { font-size: 28px; font-weight: bold; color: #7c3aed; }
            h1 { color: #1a1a1a; font-size: 24px; margin-bottom: 20px; }
            p { margin-bottom: 16px; color: #4a4a4a; }
            .info-box { background: #f8f4ff; border-left: 4px solid #7c3aed; padding: 16px; margin: 20px 0; border-radius: 0 8px 8px 0; }
            .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; color: #888; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">✨ AgentAI</div>
            </div>
            <h1>Profile Updated Successfully</h1>
            <p>Hi${displayName ? ` ${displayName}` : ""},</p>
            <p>Your AgentAI profile has been successfully updated.</p>
            <div class="info-box">
              <strong>What changed?</strong>
              <p style="margin-bottom: 0;">Your profile information has been modified. If you didn't make this change, please secure your account immediately.</p>
            </div>
            <p>If you have any questions, feel free to reach out to our support team.</p>
            <div class="footer">
              <p>The AgentAI Team</p>
            </div>
          </div>
        </body>
        </html>
      `;
    } else {
      throw new Error("Invalid email type");
    }

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "AgentAI <onboarding@resend.dev>",
        to: [email],
        subject,
        html,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error("Resend API error:", data);
      throw new Error(data.message || "Failed to send email");
    }

    console.log("Email sent successfully:", data);

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error sending email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
