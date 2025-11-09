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

    const { data: candidate, error: candidateError } = await supabase
      .from('candidates')
      .select('*')
      .eq('id', candidateId)
      .single();

    if (candidateError) throw candidateError;

    let jobData = null;
    if (jobId) {
      const { data: job } = await supabase
        .from('job_openings')
        .select('*')
        .eq('id', jobId)
        .single();
      jobData = job;
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const systemPrompt = `You are an expert technical recruiter and skills assessor. Analyze the candidate's skills and provide detailed, realistic scoring.

For each skill in the candidate's profile, provide:
1. **proficiency_score**: Realistic score 0-100 based on evidence
2. **confidence_level**: How confident we are (0-100)
3. **evidence_quality**: "strong", "moderate", or "weak"
4. **years_estimated**: Estimated years of experience with this skill
5. **skill_gap_analysis**: If job requirements provided, gap analysis
6. **recommendation**: Brief recommendation for this skill

Also provide:
- **overall_skill_match**: If job provided, overall match percentage
- **top_skills**: Top 5 strongest skills
- **skills_to_develop**: 3-5 skills that need development
- **market_competitiveness**: How competitive are these skills (0-100)

Return ONLY valid JSON with this structure:
{
  "skills_analysis": [
    {
      "skill_name": "Python",
      "proficiency_score": 85,
      "confidence_level": 90,
      "evidence_quality": "strong",
      "years_estimated": 5,
      "evidence_sources": ["CV mentions 5 years", "Multiple projects listed"],
      "recommendation": "Strong skill, ready for senior-level work"
    }
  ],
  "overall_skill_match": 87,
  "top_skills": ["Python", "React", "SQL"],
  "skills_to_develop": ["Kubernetes", "System Design"],
  "market_competitiveness": 82,
  "summary": "Candidate has strong technical foundation with room for growth in cloud technologies"
}`;

    const userPrompt = `
Candidate Information:
Name: ${candidate.full_name}
Current Position: ${candidate.current_position || 'Not specified'}
Years Experience: ${candidate.years_experience || 'Not specified'}

Extracted Skills from CV:
${JSON.stringify(candidate.extracted_skills || [], null, 2)}

${jobData ? `
Job Requirements:
Title: ${jobData.title}
Required Skills: ${JSON.stringify(jobData.required_skills || [])}
Nice-to-Have Skills: ${JSON.stringify(jobData.nice_to_have_skills || [])}
` : 'No specific job requirements provided - assess skills generally'}

Provide detailed, realistic skill analysis with evidence-based scoring.`;

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
        max_tokens: 3000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Lovable AI error:', response.status, errorText);
      throw new Error('Failed to analyze skills with AI');
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    
    let skillsData;
    try {
      const jsonStr = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      skillsData = JSON.parse(jsonStr);
    } catch (e) {
      console.error('Failed to parse AI response:', content);
      throw new Error('Invalid JSON response from AI');
    }

    return new Response(
      JSON.stringify(skillsData),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('Error in analyze-skills-ai function:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Unknown error occurred' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
