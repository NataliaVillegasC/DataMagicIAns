import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const jwt = authHeader.replace('Bearer ', '');
    const payload = parseJwt(jwt);
    const userId = payload?.sub;

    if (!userId) {
      console.error('No user ID in token');
      throw new Error('Unauthorized');
    }

    console.log('Processing evaluation request for user:', userId);

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { candidateId, jobId, analysisType } = await req.json();

    if (!candidateId) {
      throw new Error('Candidate ID is required');
    }

    // Fetch candidate data
    const { data: candidate, error: candidateError } = await supabaseAdmin
      .from('candidates')
      .select('*')
      .eq('id', candidateId)
      .single();

    if (candidateError || !candidate) {
      throw new Error('Candidate not found');
    }

    console.log('Evaluating candidate:', candidate.full_name);

    // Fetch job data if provided
    let jobData = null;
    if (jobId) {
      const { data: job, error: jobError } = await supabaseAdmin
        .from('job_openings')
        .select('*')
        .eq('id', jobId)
        .single();

      if (!jobError && job) {
        jobData = job;
      }
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    let systemPrompt = '';
    let userPrompt = '';
    let analysis = null;

    // Different analysis types
    switch (analysisType) {
      case 'career_trajectory':
        systemPrompt = `You are an expert career analyst. Analyze the candidate's career progression and provide insights.

Return ONLY valid JSON in this exact format:
{
  "career_stage": "Mid-Senior Level",
  "growth_pattern": "Steady upward progression with consistent skill development",
  "strengths": ["Technical leadership", "Cross-functional collaboration"],
  "development_areas": ["Executive communication", "Strategic planning"],
  "trajectory_score": 85,
  "risk_factors": ["Frequent job changes might indicate commitment issues"],
  "recommendations": ["Ready for senior IC or management transition"]
}`;

        userPrompt = `Analyze this candidate's career:
Name: ${candidate.full_name}
Current Position: ${candidate.current_position || 'Not specified'}
Current Company: ${candidate.current_company || 'Not specified'}
Years of Experience: ${candidate.years_experience || 'Not specified'}
Skills: ${JSON.stringify(candidate.extracted_skills || [])}
${candidate.notes ? `Notes: ${candidate.notes}` : ''}

Provide comprehensive career trajectory analysis.`;
        break;

      case 'market_analysis':
        systemPrompt = `You are a market compensation and talent availability expert. Analyze the candidate's market position.

Return ONLY valid JSON in this exact format:
{
  "market_demand": "High",
  "competitiveness_score": 78,
  "estimated_salary_range": {
    "min": 120000,
    "max": 160000,
    "currency": "USD"
  },
  "talent_scarcity": "Moderate - skills in demand but available",
  "hiring_urgency": "Act within 2 weeks to secure",
  "competing_opportunities": "Likely interviewing with 2-3 other companies",
  "negotiation_leverage": "High - candidate has strong position",
  "market_insights": ["React developers are in high demand", "Remote work increases competition"]
}`;

        userPrompt = `Analyze market positioning for:
Position: ${candidate.current_position || 'Not specified'}
Skills: ${JSON.stringify(candidate.extracted_skills || [])}
Location: ${candidate.location || 'Remote'}
Years Experience: ${candidate.years_experience || 'Not specified'}
${jobData ? `Target Role: ${jobData.title}` : ''}

Provide market analysis and salary insights.`;
        break;

      case 'interview_prep':
        systemPrompt = `You are an expert interview strategist. Generate interview questions and preparation guidance.

Return ONLY valid JSON in this exact format:
{
  "technical_questions": [
    {
      "question": "Describe your experience with microservices architecture",
      "focus_area": "System Design",
      "difficulty": "Medium",
      "why_ask": "Tests architectural thinking relevant to role"
    }
  ],
  "behavioral_questions": [
    {
      "question": "Tell me about a time you resolved a technical conflict",
      "focus_area": "Conflict Resolution",
      "competency": "Leadership"
    }
  ],
  "red_flags_to_probe": ["Gap in employment 2022", "Frequent job changes"],
  "strengths_to_validate": ["React expertise", "Team leadership"],
  "suggested_assessments": ["Live coding - React component", "System design whiteboard"],
  "interview_structure": "45min technical + 30min behavioral + 15min Q&A"
}`;

        userPrompt = `Prepare interview strategy for:
Candidate: ${candidate.full_name}
Position: ${candidate.current_position || 'Not specified'}
Skills: ${JSON.stringify(candidate.extracted_skills || [])}
${jobData ? `Role: ${jobData.title}\nRequired Skills: ${JSON.stringify(jobData.required_skills || [])}` : ''}

Generate comprehensive interview preparation.`;
        break;

      case 'comprehensive':
      default:
        systemPrompt = `You are a comprehensive candidate evaluation AI. Provide a complete assessment across all dimensions.

Return ONLY valid JSON in this exact format:
{
  "overall_rating": 85,
  "recommendation": "STRONG HIRE",
  "key_strengths": ["Expert React developer", "Strong leadership experience"],
  "key_concerns": ["Limited backend experience", "No formal CS degree"],
  "cultural_fit_indicators": ["Collaborative", "Growth mindset"],
  "risk_assessment": {
    "flight_risk": "Low",
    "performance_risk": "Low",
    "culture_risk": "Medium"
  },
  "hiring_recommendation": "Move to final round - strong technical fit",
  "onboarding_focus": ["Backend systems training", "Team integration"],
  "success_predictors": ["Previous startup experience", "Self-directed learner"],
  "timeline_recommendation": "Extend offer within 1 week"
}`;

        userPrompt = `Comprehensive evaluation of:
Candidate: ${candidate.full_name}
Email: ${candidate.email}
Position: ${candidate.current_position || 'Not specified'}
Company: ${candidate.current_company || 'Not specified'}
Experience: ${candidate.years_experience || 'Not specified'} years
Skills: ${JSON.stringify(candidate.extracted_skills || [])}
Location: ${candidate.location || 'Not specified'}
Availability: ${candidate.availability || 'Not specified'}
${jobData ? `\nTarget Role: ${jobData.title}\nDepartment: ${jobData.department}\nRequired Skills: ${JSON.stringify(jobData.required_skills || [])}` : ''}
${candidate.notes ? `\nAdditional Notes: ${candidate.notes}` : ''}

Provide comprehensive candidate evaluation.`;
        break;
    }

    console.log('Requesting AI analysis for type:', analysisType);

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
      throw new Error('Failed to evaluate candidate with AI');
    }

    const data = await response.json();
    const content = data.choices[0].message.content;

    try {
      const jsonStr = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      analysis = JSON.parse(jsonStr);
    } catch (e) {
      console.error('Failed to parse AI response:', content);
      throw new Error('Invalid JSON response from AI');
    }

    // Store insight in database
    const { error: insightError } = await supabaseAdmin
      .from('ai_insights')
      .insert({
        recruiter_id: userId,
        candidate_id: candidateId,
        job_opening_id: jobId || null,
        insight_type: analysisType,
        insight_text: JSON.stringify(analysis),
        confidence_score: analysis.overall_rating || analysis.trajectory_score || analysis.competitiveness_score || 0,
      });

    if (insightError) {
      console.error('Failed to store insight:', insightError);
    }

    console.log('Analysis completed successfully');

    return new Response(
      JSON.stringify({
        success: true,
        analysisType,
        data: analysis,
        candidate: {
          id: candidate.id,
          name: candidate.full_name,
          position: candidate.current_position,
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('Error in evaluate-candidate function:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Unknown error occurred' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});