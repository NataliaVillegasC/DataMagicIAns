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

    // Fetch applications
    const { data: applications } = await supabase
      .from('applications')
      .select('*, job_openings(*)')
      .eq('candidate_id', candidateId);

    // Fetch survey data
    const { data: survey } = await supabase
      .from('candidate_surveys')
      .select('*')
      .eq('candidate_id', candidateId)
      .eq('completed', true)
      .maybeSingle();

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const systemPrompt = `You are an expert HR analyst. Generate a comprehensive candidate overview based on all available data.`;

    const userPrompt = `
Candidate Profile:
Name: ${candidate.full_name}
Position: ${candidate.current_position || 'Not specified'}
Company: ${candidate.current_company || 'Not specified'}
Experience: ${candidate.years_experience || 'Not specified'} years
Location: ${candidate.location || 'Not specified'}
Email: ${candidate.email}

Extracted Skills: ${JSON.stringify(candidate.extracted_skills || [])}

${applications && applications.length > 0 ? `
Applications:
${applications.map((app: any) => `
- ${app.job_openings?.title}: ${app.status}
  AI Match: ${app.ai_match_score}%, Skill Match: ${app.skill_match_score}%
  Recommendation: ${app.ai_recommendation}
`).join('\n')}
` : 'No applications yet'}

${survey ? `
Personality Assessment (OCEAN):
- Openness: ${survey.ocean_openness}/100
- Conscientiousness: ${survey.ocean_conscientiousness}/100
- Extraversion: ${survey.ocean_extraversion}/100
- Agreeableness: ${survey.ocean_agreeableness}/100
- Emotional Stability: ${survey.ocean_emotional_stability}/100

Emotional Intelligence:
- Overall EQ: ${survey.eq_score}/100
- Self Awareness: ${survey.eq_self_awareness}/100
- Empathy: ${survey.eq_empathy}/100

Competencies:
- Leadership: ${survey.competency_leadership}/100
- Problem Solving: ${survey.competency_problem_solving}/100
- Adaptability: ${survey.competency_adaptability}/100
- Teamwork: ${survey.competency_teamwork}/100
` : 'No personality assessment completed yet'}

Generate a comprehensive, realistic overview.`;

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
            type: 'function',
            function: {
              name: 'generate_candidate_overview',
              description: 'Generate a comprehensive candidate overview with structured data',
              parameters: {
                type: 'object',
                properties: {
                  executive_summary: { 
                    type: 'string',
                    description: '2-3 sentence compelling summary of the candidate'
                  },
                  key_strengths: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        strength: { type: 'string' },
                        evidence: { type: 'string' }
                      },
                      required: ['strength', 'evidence']
                    },
                    description: '4-6 key strengths with supporting evidence'
                  },
                  growth_areas: {
                    type: 'array',
                    items: { type: 'string' },
                    description: '2-3 areas for development'
                  },
                  cultural_fit_analysis: {
                    type: 'string',
                    description: 'Assessment of cultural fit based on personality data'
                  },
                  unique_value_proposition: {
                    type: 'string',
                    description: 'What makes this candidate stand out'
                  },
                  overall_recommendation: {
                    type: 'string',
                    description: 'Brief recommendation statement'
                  },
                  confidence_score: {
                    type: 'number',
                    description: 'Overall confidence in assessment (0-100)'
                  }
                },
                required: ['executive_summary', 'key_strengths', 'growth_areas', 'cultural_fit_analysis', 'unique_value_proposition', 'overall_recommendation', 'confidence_score'],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: 'function', function: { name: 'generate_candidate_overview' } }
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        throw new Error('Rate limit exceeded. Please try again later.');
      }
      if (response.status === 402) {
        throw new Error('Payment required. Please add funds to your Lovable AI workspace.');
      }
      const errorText = await response.text();
      console.error('Lovable AI error:', response.status, errorText);
      throw new Error('Failed to generate overview with AI');
    }

    const data = await response.json();
    console.log('AI Response:', JSON.stringify(data));
    
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      console.error('No tool call in response:', data);
      throw new Error('Invalid AI response format');
    }

    const overviewData = JSON.parse(toolCall.function.arguments);

    return new Response(
      JSON.stringify(overviewData),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('Error in analyze-candidate-overview function:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Unknown error occurred' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
