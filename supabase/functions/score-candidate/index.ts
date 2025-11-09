import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { candidateSkills, jobRequiredSkills, candidateInfo } = await req.json();
    
    // Input validation
    if (!candidateSkills || !Array.isArray(candidateSkills)) {
      throw new Error('Candidate skills must be an array');
    }
    
    if (!jobRequiredSkills || !Array.isArray(jobRequiredSkills)) {
      throw new Error('Job required skills must be an array');
    }
    
    if (candidateSkills.length > 100) {
      throw new Error('Too many candidate skills (max 100)');
    }
    
    if (jobRequiredSkills.length > 100) {
      throw new Error('Too many job required skills (max 100)');
    }
    
    if (candidateInfo && typeof candidateInfo !== 'object') {
      throw new Error('Candidate info must be an object');
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const systemPrompt = `You are an expert HR AI that evaluates candidate-job fit and generates hiring recommendations.

Analyze the candidate against job requirements and provide:
1. **ai_match_score** (0-100) - Overall AI-powered match score
2. **skill_match_score** (0-100) - How well skills align
3. **culture_fit_score** (0-100) - Soft skills and cultural alignment
4. **predicted_success** (0-100) - Likelihood of success in role
5. **retention_risk** (0-100) - Risk of leaving (lower is better)
6. **ai_recommendation** - One of: "STRONG FIT", "GOOD FIT", "MODERATE FIT", "NOT RECOMMENDED"
7. **red_flags** - Array of concerning patterns

Return ONLY valid JSON in this exact format:
{
  "ai_match_score": 85,
  "skill_match_score": 90,
  "culture_fit_score": 78,
  "predicted_success": 82,
  "retention_risk": 25,
  "ai_recommendation": "STRONG FIT",
  "red_flags": [
    {
      "flag": "Multiple job changes in 2 years",
      "severity": "medium"
    }
  ]
}`;

    const userPrompt = `
Candidate Information:
${JSON.stringify(candidateInfo, null, 2)}

Candidate Skills:
${JSON.stringify(candidateSkills, null, 2)}

Job Required Skills:
${JSON.stringify(jobRequiredSkills, null, 2)}

Provide scoring and recommendation.`;

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
      throw new Error('Failed to score candidate with AI');
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    
    let scoresData;
    try {
      const jsonStr = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      scoresData = JSON.parse(jsonStr);
    } catch (e) {
      console.error('Failed to parse AI response:', content);
      throw new Error('Invalid JSON response from AI');
    }

    return new Response(
      JSON.stringify(scoresData),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('Error in score-candidate function:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Unknown error occurred' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
