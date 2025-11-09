import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@4.0.0";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface MessageRequest {
  candidateId: string;
  subject: string;
  message: string;
}

function parseJwt(token: string): any {
  try {
    const base64Url = token.split('.')[1] || '';
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + (4 - (base64.length % 4 || 4)) % 4, '=');
    return JSON.parse(atob(padded));
  } catch (e) {
    console.error('Failed to parse JWT:', e);
    return null;
  }
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('No authorization header');
      throw new Error('No authorization header');
    }

    const jwt = authHeader.replace('Bearer ', '');
    const payload = parseJwt(jwt);
    const userId = payload?.sub;

    if (!userId) {
      console.error('No user ID in token');
      throw new Error('Invalid token');
    }

    console.log('Processing message request for user:', userId);

    // Use service role key for database operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { candidateId, subject, message }: MessageRequest = await req.json();

    console.log('Sending message to candidate:', candidateId);

    // Get candidate details
    const { data: candidate, error: candidateError } = await supabaseAdmin
      .from('candidates')
      .select('email, full_name')
      .eq('id', candidateId)
      .single();

    if (candidateError || !candidate) {
      console.error('Candidate error:', candidateError);
      throw new Error('Candidate not found');
    }

    // Get recruiter details
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('full_name, email, company')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      console.error('Profile error:', profileError);
      throw new Error('Profile not found');
    }

    // Send email
    const emailResponse = await resend.emails.send({
      from: `${profile.company || 'Recruitment'} <noreply@skill-sense.me>`,
      to: [candidate.email],
      replyTo: profile.email,
      subject: subject,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Message from ${profile.full_name || 'Recruiter'}</h2>
          <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="color: #666; white-space: pre-wrap;">${message}</p>
          </div>
          <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 20px 0;" />
          <p style="color: #999; font-size: 12px;">
            This message was sent from ${profile.company || 'the recruitment team'}.<br/>
            Reply to: ${profile.email}
          </p>
        </div>
      `,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({ success: true, data: emailResponse }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  } catch (error: any) {
    console.error("Error in send-candidate-message function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
