import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email } = await req.json();

    if (!email) {
      return new Response(
        JSON.stringify({ error: "Email is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client with service role
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if user exists
    const { data: { users }, error: userError } = await supabase.auth.admin.listUsers();
    const user = users?.find(u => u.email === email);

    if (!user) {
      // Return success even if user doesn't exist (security best practice)
      return new Response(
        JSON.stringify({ success: true, message: "If an account exists, a reset email will be sent" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate secure token
    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Save token to database
    const { error: tokenError } = await supabase
      .from("password_reset_tokens")
      .insert({
        user_email: email,
        token,
        expires_at: expiresAt.toISOString(),
      });

    if (tokenError) {
      console.error("Token creation error:", tokenError);
      throw new Error("Failed to create reset token");
    }

    // Get website URL from environment or use default
    const websiteUrl = Deno.env.get("WEBSITE_URL") || "https://wealthbuildersinpropertiescooperative.com";
    const resetUrl = `${websiteUrl}/reset-password?token=${token}`;

    // Send email via MailerSend
    const mailersendApiKey = Deno.env.get("MAILERSEND_API_KEY");
    const fromEmail = Deno.env.get("FROM_EMAIL") || "no-reply@trial-0r83ql3jr3xg9yjr.mlsender.net";

    const emailResponse = await fetch("https://api.mailersend.com/v1/email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${mailersendApiKey}`,
      },
      body: JSON.stringify({
        from: {
          email: fromEmail,
          name: "WealthBuilders Cooperative",
        },
        to: [
          {
            email: email,
          },
        ],
        subject: "Reset Your Password",
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background-color: #0052CC; color: white; padding: 20px; text-align: center; }
                .content { background-color: #f9f9f9; padding: 30px; }
                .button { display: inline-block; padding: 12px 30px; background-color: #0052CC; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
                .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>Password Reset Request</h1>
                </div>
                <div class="content">
                  <p>Hello,</p>
                  <p>We received a request to reset your password for your WealthBuilders Cooperative account.</p>
                  <p>Click the button below to reset your password. This link will expire in 15 minutes.</p>
                  <div style="text-align: center;">
                    <a href="${resetUrl}" class="button">Reset Password</a>
                  </div>
                  <p>Or copy and paste this link into your browser:</p>
                  <p style="word-break: break-all; color: #0052CC;">${resetUrl}</p>
                  <p>If you didn't request a password reset, you can safely ignore this email. Your password will not be changed.</p>
                </div>
                <div class="footer">
                  <p>© ${new Date().getFullYear()} WealthBuilders Cooperative. All Rights Reserved.</p>
                </div>
              </div>
            </body>
          </html>
        `,
        text: `Password Reset Request\n\nWe received a request to reset your password. Click the link below to reset your password:\n\n${resetUrl}\n\nThis link will expire in 15 minutes.\n\nIf you didn't request this, you can safely ignore this email.`,
      }),
    });

    if (!emailResponse.ok) {
      const errorData = await emailResponse.json();
      console.error("MailerSend error:", errorData);
      throw new Error("Failed to send reset email");
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Password reset email sent successfully" 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in send-reset-email:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to send reset email" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});