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
    const { department, period } = await req.json();

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Get user's company
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
        JSON.stringify({ error: 'Company not found' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch all candidates and job openings from company
    const { data: candidates } = await supabaseClient
      .from('candidates')
      .select('*')
      .eq('company', profile.company);

    const { data: jobOpenings } = await supabaseClient
      .from('job_openings')
      .select('*')
      .eq('company', profile.company);

    const { data: applications } = await supabaseClient
      .from('applications')
      .select('*, candidates!inner(company)')
      .eq('candidates.company', profile.company);

    if (!candidates || candidates.length === 0) {
      return new Response(
        JSON.stringify({ 
          error: 'No candidates found. Please upload candidates first.',
          kpis: {
            skillsDetected: 0,
            averageConfidence: 0,
            criticalGaps: 0,
            internalMobility: 0
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use AI to perform comprehensive organizational analysis
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'LOVABLE_API_KEY not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const systemPrompt = `You are an AI organizational analytics expert. Analyze company talent data and provide comprehensive insights.

Analyze:
1. Skills inventory across all candidates
2. Department-level skill coverage
3. Critical skill gaps
4. Internal mobility opportunities
5. High-potential employees
6. Cost savings from internal mobility

Return JSON with this exact structure:
{
  "kpis": {
    "skillsDetected": number,
    "averageConfidence": number (0-100),
    "criticalGaps": number,
    "internalMobility": {
      "movementsFacilitated": number,
      "costSaved": number,
      "timeToHire": number
    }
  },
  "departmentSkillCoverage": {
    "Engineering": {"Python": number, "JavaScript": number, ...},
    "Sales": {...},
    "Marketing": {...},
    "Product": {...}
  },
  "topSkills": [
    {"name": "string", "coverage": number (0-100), "trend": "up|down|stable"}
  ],
  "roleGaps": [
    {
      "role": "string",
      "criticalGap": "string",
      "currentCoverage": number (0-100),
      "targetCoverage": number (0-100),
      "affectedEmployees": number,
      "recommendation": "string",
      "priority": "critical|high|medium|low"
    }
  ],
  "highPotentials": [
    {
      "name": "string",
      "currentRole": "string",
      "potentialScore": number (0-100),
      "nextRole": "string",
      "timeline": "string",
      "keyStrengths": ["string"]
    }
  ]
}`;

    const userPrompt = `Company: ${profile.company}
Department filter: ${department || 'all'}
Period: ${period || 'month'}

Candidates (${candidates.length}):
${JSON.stringify(candidates.map(c => ({
  name: c.full_name,
  role: c.current_position,
  skills: c.extracted_skills,
  experience: c.years_experience
})))}

Job Openings (${jobOpenings?.length || 0}):
${JSON.stringify(jobOpenings?.map(j => ({
  title: j.title,
  department: j.department,
  required_skills: j.required_skills
})) || [])}

Applications (${applications?.length || 0}):
${JSON.stringify(applications?.map(a => ({
  status: a.status,
  scores: {
    ai_match: a.ai_match_score,
    skill_match: a.skill_match_score
  }
})) || [])}`;

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
    
    // Clean and parse JSON
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
    console.error('Error in analyze-organization function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
