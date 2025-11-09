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
    const { projectName, requiredSkills } = await req.json();

    if (!requiredSkills || !Array.isArray(requiredSkills) || requiredSkills.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Required skills must be provided as an array' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Get user's company from profile
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('company')
      .eq('id', user.id)
      .single();

    if (!profile?.company) {
      return new Response(
        JSON.stringify({ error: 'Company not found in profile' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch all candidates from user's company
    const { data: candidates, error: candidatesError } = await supabaseClient
      .from('candidates')
      .select('*')
      .eq('company', profile.company);

    if (candidatesError) {
      console.error('Error fetching candidates:', candidatesError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch candidates' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!candidates || candidates.length === 0) {
      return new Response(
        JSON.stringify({ recommendedTeam: [], alternativeTeams: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use AI to analyze team building
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'LOVABLE_API_KEY not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const systemPrompt = `You are an AI team building expert. Analyze candidates and recommend optimal team compositions.
    
Required skills: ${requiredSkills.join(', ')}
Project: ${projectName || 'Unnamed Project'}

For each candidate, calculate:
1. Overall fit percentage (0-100) based on skill match
2. Individual skill scores and coverage
3. Availability assessment

Return JSON with:
- recommendedTeam: Array of top 3-5 candidates with best combined coverage
- alternativeTeams: 2 alternative team compositions

Each team member must have:
{
  "candidate_id": "uuid",
  "name": "string",
  "role": "string",
  "fit": number (0-100),
  "skills": [{"name": "string", "score": number (0-100), "required": number (0-100)}],
  "availability": "string"
}

Alternative teams format:
{
  "name": "string",
  "description": "string",
  "coverage": number (0-100),
  "members": ["candidate names"]
}`;

    const userPrompt = `Candidates data:
${JSON.stringify(candidates.map(c => ({
  id: c.id,
  name: c.full_name,
  role: c.current_position,
  availability: c.availability,
  skills: c.extracted_skills,
  experience: c.years_experience
})))}`;

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
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
        response_format: { type: 'json_object' }
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI credits exhausted. Please add credits to continue.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await aiResponse.text();
      console.error('AI Gateway error:', aiResponse.status, errorText);
      return new Response(
        JSON.stringify({ error: 'AI analysis failed' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices[0].message.content;
    
    // Clean and parse JSON response
    let cleanedContent = content.trim();
    if (cleanedContent.startsWith('```json')) {
      cleanedContent = cleanedContent.slice(7);
    }
    if (cleanedContent.startsWith('```')) {
      cleanedContent = cleanedContent.slice(3);
    }
    if (cleanedContent.endsWith('```')) {
      cleanedContent = cleanedContent.slice(0, -3);
    }
    
    const result = JSON.parse(cleanedContent.trim());

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in build-team function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
