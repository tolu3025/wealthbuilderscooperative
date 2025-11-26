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

    // Get configuration from environment variables
    const mailersendApiKey = Deno.env.get("MAILERSEND_API_KEY");
    const fromEmail = Deno.env.get("FROM_EMAIL");
    const websiteUrl = Deno.env.get("WEBSITE_URL");

    if (!mailersendApiKey || !fromEmail || !websiteUrl) {
      throw new Error("Missing required environment variables: MAILERSEND_API_KEY, FROM_EMAIL, or WEBSITE_URL");
    }

    const resetUrl = `${websiteUrl}/reset-password?token=${token}`;

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
        settings: {
          track_clicks: false,
          track_opens: false,
        },
        html: `
          <!DOCTYPE html>
          <html lang="en">
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Reset Your Password</title>
              <style>
                body { 
                  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; 
                  line-height: 1.6; 
                  color: #333; 
                  margin: 0; 
                  padding: 0; 
                  background-color: #f4f4f4; 
                }
                .container { 
                  max-width: 600px; 
                  margin: 40px auto; 
                  background: white; 
                  border-radius: 8px; 
                  overflow: hidden; 
                  box-shadow: 0 2px 8px rgba(0,0,0,0.1); 
                }
                .header { 
                  background: linear-gradient(135deg, #0052CC 0%, #003d99 100%); 
                  color: white; 
                  padding: 40px 20px; 
                  text-align: center; 
                }
                .header h1 { 
                  margin: 0; 
                  font-size: 28px; 
                  font-weight: 600; 
                }
                .content { 
                  padding: 40px 30px; 
                  background-color: #ffffff; 
                }
                .content p { 
                  margin: 0 0 16px 0; 
                  font-size: 16px; 
                  color: #555; 
                }
                .button-container { 
                  text-align: center; 
                  margin: 32px 0; 
                }
                .button { 
                  display: inline-block; 
                  padding: 14px 40px; 
                  background-color: #0052CC; 
                  color: white !important; 
                  text-decoration: none; 
                  border-radius: 6px; 
                  font-weight: 600; 
                  font-size: 16px; 
                  transition: background-color 0.3s ease; 
                }
                .button:hover { 
                  background-color: #003d99; 
                }
                .link-box { 
                  background-color: #f9f9f9; 
                  border: 1px solid #e0e0e0; 
                  border-radius: 4px; 
                  padding: 12px; 
                  margin: 20px 0; 
                  word-break: break-all; 
                  font-size: 14px; 
                  color: #0052CC; 
                }
                .warning { 
                  background-color: #fff3cd; 
                  border-left: 4px solid #ffc107; 
                  padding: 12px 16px; 
                  margin: 20px 0; 
                  font-size: 14px; 
                  color: #856404; 
                }
                .footer { 
                  background-color: #f9f9f9; 
                  text-align: center; 
                  padding: 24px 20px; 
                  color: #666; 
                  font-size: 13px; 
                  border-top: 1px solid #e0e0e0; 
                }
                .footer p { 
                  margin: 4px 0; 
                }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>🔐 Password Reset Request</h1>
                </div>
                <div class="content">
                  <p><strong>Hello,</strong></p>
                  <p>We received a request to reset your password for your <strong>WealthBuilders Cooperative</strong> account.</p>
                  <p>Click the button below to securely reset your password:</p>
                  <div class="button-container">
                    <a href="${resetUrl}" class="button">Reset My Password</a>
                  </div>
                  <p>Or copy and paste this link into your browser:</p>
                  <div class="link-box">${resetUrl}</div>
                  <div class="warning">
                    ⚠️ <strong>Important:</strong> This link will expire in <strong>15 minutes</strong> for security reasons.
                  </div>
                  <p>If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.</p>
                  <p style="margin-top: 32px; color: #888; font-size: 14px;">For security reasons, we cannot reset your password without clicking the link above.</p>
                </div>
                <div class="footer">
                  <p><strong>WealthBuilders Cooperative</strong></p>
                  <p>Building Wealth Through Property Investment</p>
                  <p style="margin-top: 12px;">© ${new Date().getFullYear()} WealthBuilders Cooperative. All Rights Reserved.</p>
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