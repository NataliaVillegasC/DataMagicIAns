import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.80.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { candidateId } = await req.json();

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch candidate data
    const { data: candidate, error: candidateError } = await supabase
      .from('candidates')
      .select('*')
      .eq('id', candidateId)
      .single();

    if (candidateError) throw candidateError;

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const systemPrompt = `You are an expert background verification AI. Analyze the candidate's public information and provide a comprehensive background check report.

Generate a JSON report with:
1. **identity_verification**: Confidence score (0-100) that the candidate is who they claim to be
2. **employment_verification**: Array of employment history verification results
3. **education_verification**: Verification of stated education credentials
4. **professional_reputation**: Online reputation score based on public data
5. **red_flags**: Array of any concerning findings
6. **verification_sources**: What public sources were checked (LinkedIn, GitHub, etc.)
7. **overall_risk_score**: Overall risk assessment (0-100, lower is better)
8. **recommendation**: "APPROVED", "APPROVED_WITH_CONDITIONS", "FURTHER_REVIEW_NEEDED", or "NOT_RECOMMENDED"

Return ONLY valid JSON in this exact format:
{
  "identity_verification": {
    "score": 95,
    "confidence": "high",
    "verified_details": ["Email domain matches current company", "LinkedIn profile matches CV"],
    "unverified_details": []
  },
  "employment_verification": [
    {
      "company": "Acme Corp",
      "position": "Senior Developer",
      "stated_duration": "2020-2023",
      "verification_status": "verified",
      "confidence": "high",
      "source": "LinkedIn profile cross-reference"
    }
  ],
  "education_verification": [
    {
      "institution": "University XYZ",
      "degree": "BS Computer Science",
      "verification_status": "likely_valid",
      "confidence": "medium",
      "notes": "Institution exists and offers stated program"
    }
  ],
  "professional_reputation": {
    "score": 88,
    "github_activity": "Active contributor, 200+ repositories",
    "linkedin_endorsements": "50+ endorsements for key skills",
    "online_presence": "Professional, consistent across platforms"
  },
  "red_flags": [],
  "verification_sources": [
    "LinkedIn profile analysis",
    "GitHub account verification",
    "Email domain validation",
    "Public records cross-reference"
  ],
  "overall_risk_score": 15,
  "recommendation": "APPROVED",
  "summary": "Candidate shows strong verification across all checked sources. Professional history is consistent and verifiable through public records."
}`;

    const userPrompt = `
Candidate Information:
Name: ${candidate.full_name}
Email: ${candidate.email}
Current Position: ${candidate.current_position || 'Not specified'}
Current Company: ${candidate.current_company || 'Not specified'}
Location: ${candidate.location || 'Not specified'}
Years Experience: ${candidate.years_experience || 'Not specified'}
LinkedIn: ${candidate.linkedin_url || 'Not provided'}
GitHub: ${candidate.github_url || 'Not provided'}
Phone: ${candidate.phone || 'Not provided'}

Skills: ${JSON.stringify(candidate.extracted_skills || [])}

Perform a comprehensive background verification analysis using the available public information. Be realistic and thorough.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "generate_background_verification",
              description: "Generate background verification report",
              parameters: {
                type: "object",
                properties: {
                  identity_verification: {
                    type: "object",
                    properties: {
                      score: { type: "number" },
                      confidence: { type: "string", enum: ["low", "medium", "high"] },
                      verified_details: { type: "array", items: { type: "string" } },
                      unverified_details: { type: "array", items: { type: "string" } }
                    },
                    required: ["score", "confidence", "verified_details", "unverified_details"]
                  },
                  employment_verification: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        company: { type: "string" },
                        position: { type: "string" },
                        stated_duration: { type: "string" },
                        verification_status: { type: "string" },
                        confidence: { type: "string" },
                        source: { type: "string" }
                      }
                    }
                  },
                  education_verification: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        institution: { type: "string" },
                        degree: { type: "string" },
                        verification_status: { type: "string" },
                        confidence: { type: "string" },
                        notes: { type: "string" }
                      }
                    }
                  },
                  professional_reputation: {
                    type: "object",
                    properties: {
                      score: { type: "number" },
                      github_activity: { type: "string" },
                      linkedin_endorsements: { type: "string" },
                      online_presence: { type: "string" }
                    }
                  },
                  red_flags: {
                    type: "array",
                    items: { type: "string" }
                  },
                  verification_sources: {
                    type: "array",
                    items: { type: "string" }
                  },
                  overall_risk_score: { type: "number" },
                  recommendation: { 
                    type: "string",
                    enum: ["APPROVED", "APPROVED_WITH_CONDITIONS", "FURTHER_REVIEW_NEEDED", "NOT_RECOMMENDED"]
                  },
                  summary: { type: "string" }
                },
                required: ["identity_verification", "employment_verification", "education_verification", "professional_reputation", "red_flags", "verification_sources", "overall_risk_score", "recommendation", "summary"]
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "generate_background_verification" } }
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'AI credits exhausted. Please add credits to continue.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      throw new Error('Failed to verify background with AI');
    }

    const data = await response.json();
    
    // Extract from tool call
    const toolCall = data.choices[0].message.tool_calls?.[0];
    if (!toolCall || !toolCall.function?.arguments) {
      console.error('No tool call in response:', JSON.stringify(data, null, 2));
      throw new Error('Invalid AI response format - no tool call');
    }

    let verificationData;
    try {
      verificationData = JSON.parse(toolCall.function.arguments);
      console.log('Successfully parsed verification data');
    } catch (e) {
      console.error('Failed to parse tool call arguments:', toolCall.function.arguments);
      console.error('Parse error:', e);
      throw new Error('Invalid JSON response from AI');
    }

    // Store verification in database
    const { error: insertError } = await supabase
      .from('ai_insights')
      .insert({
        candidate_id: candidateId,
        insight_type: 'background_verification',
        insight_text: JSON.stringify(verificationData),
        confidence_score: verificationData.identity_verification.score
      });

    if (insertError) {
      console.error('Error storing verification:', insertError);
    }

    return new Response(
      JSON.stringify(verificationData),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('Error in verify-background function:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Unknown error occurred' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
