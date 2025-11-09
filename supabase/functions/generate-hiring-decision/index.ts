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
    const { candidateId, jobId } = await req.json();

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: candidate } = await supabase
      .from('candidates')
      .select('*')
      .eq('id', candidateId)
      .single();

    const { data: applications } = await supabase
      .from('applications')
      .select('*, job_openings(*)')
      .eq('candidate_id', candidateId);

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

    const systemPrompt = `You are an expert hiring manager making final hiring decisions. Synthesize all available data to provide a comprehensive recommendation.

Provide JSON with:
1. **final_recommendation**: "STRONG_HIRE", "HIRE", "MAYBE", or "NO_HIRE"
2. **confidence_level**: Confidence in this decision (0-100)
3. **key_reasons_to_hire**: Array of 4-6 compelling reasons
4. **key_concerns**: Array of 2-4 concerns or risks
5. **risk_assessment**: Overall hiring risk (0-100, lower is better)
6. **expected_performance**: Expected performance in first year (0-100)
7. **retention_likelihood**: Likelihood to stay 2+ years (0-100)
8. **cultural_fit_score**: How well they fit culture (0-100)
9. **next_steps**: Array of recommended next steps
10. **timeline_recommendation**: When to make decision
11. **offer_strategy**: How to approach the offer
12. **executive_summary**: 2-3 sentence summary for leadership

Return ONLY valid JSON.`;

    const userPrompt = `
Candidate: ${candidate?.full_name}
Position: ${candidate?.current_position}
Experience: ${candidate?.years_experience} years

Skills: ${JSON.stringify(candidate?.extracted_skills || [])}

${applications && applications.length > 0 ? `
Application Data:
${applications.map((app: any) => `
- Role: ${app.job_openings?.title}
- AI Match: ${app.ai_match_score}%
- Skill Match: ${app.skill_match_score}%
- Status: ${app.status}
- Recommendation: ${app.ai_recommendation}
`).join('\n')}
` : ''}

${survey ? `
Assessment Scores:
OCEAN: O:${survey.ocean_openness} C:${survey.ocean_conscientiousness} E:${survey.ocean_extraversion} A:${survey.ocean_agreeableness} ES:${survey.ocean_emotional_stability}
EQ: ${survey.eq_score}/100
Leadership: ${survey.competency_leadership}/100
Problem Solving: ${survey.competency_problem_solving}/100
Teamwork: ${survey.competency_teamwork}/100
` : 'No assessment data'}

Make a comprehensive, data-driven hiring decision.`;

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
        max_tokens: 2500,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Lovable AI error:', response.status, errorText);
      throw new Error('Failed to generate hiring decision with AI');
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    
    let decisionData;
    try {
      const jsonStr = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      decisionData = JSON.parse(jsonStr);
    } catch (e) {
      console.error('Failed to parse AI response:', content);
      throw new Error('Invalid JSON response from AI');
    }

    return new Response(
      JSON.stringify(decisionData),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('Error in generate-hiring-decision function:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Unknown error occurred' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
