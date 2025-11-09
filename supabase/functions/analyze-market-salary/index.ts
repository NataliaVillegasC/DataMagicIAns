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

    const systemPrompt = `You are an expert compensation analyst with access to current market salary data. Provide realistic salary ranges and market intelligence.

Based on the candidate's profile, provide:
1. **market_salary_range**: Current market range for similar roles
   - min: minimum market salary
   - max: maximum market salary
   - median: median market salary
2. **location_adjustment**: How location affects salary (percentage)
3. **experience_premium**: Premium for years of experience (percentage)
4. **skills_premium**: Premium for valuable skills (percentage)
5. **recommended_offer_range**: What we should offer
   - min: minimum recommended
   - max: maximum recommended
6. **market_percentile**: Where this candidate ranks (0-100)
7. **salary_trends**: Current market trends for this role
8. **competing_offers_estimate**: Estimated competing offers they might have
9. **retention_risk**: Risk they leave for better pay (0-100)

Use current 2025 market data for tech/professional roles. Be realistic based on:
- Location (adjust for cost of living)
- Years of experience
- Specific skills and their market demand
- Current role and company

Return ONLY valid JSON.`;

    const userPrompt = `
Candidate Profile:
Position: ${candidate.current_position || 'Not specified'}
Location: ${candidate.location || 'Not specified'}
Years Experience: ${candidate.years_experience || 0}
Current Company: ${candidate.current_company || 'Not specified'}

Key Skills: ${candidate.extracted_skills ? candidate.extracted_skills.slice(0, 10).map((s: any) => s.name).join(', ') : 'Not specified'}

Provide current 2025 market salary analysis for this candidate profile. Consider:
- Real market rates for ${candidate.current_position || 'this role'} in ${candidate.location || 'the general market'}
- ${candidate.years_experience || 0} years of experience premium
- Current demand for skills like ${candidate.extracted_skills ? candidate.extracted_skills.slice(0, 3).map((s: any) => s.name).join(', ') : 'their skill set'}

Be realistic and data-driven. All amounts in USD annually.`;

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
        max_tokens: 2048,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Lovable AI error:', response.status, errorText);
      throw new Error('Failed to analyze market salary with AI');
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    
    let salaryData;
    try {
      const jsonStr = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      salaryData = JSON.parse(jsonStr);
    } catch (e) {
      console.error('Failed to parse AI response:', content);
      throw new Error('Invalid JSON response from AI');
    }

    return new Response(
      JSON.stringify(salaryData),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('Error in analyze-market-salary function:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Unknown error occurred' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
