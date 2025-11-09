import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

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
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch all candidate data
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

    // Fetch specific job if provided
    let targetJob = null;
    if (jobId) {
      const { data: job } = await supabase
        .from('job_openings')
        .select('*')
        .eq('id', jobId)
        .single();
      targetJob = job;
    }

    // Fetch survey results
    const { data: survey } = await supabase
      .from('candidate_surveys')
      .select('*')
      .eq('candidate_id', candidateId)
      .eq('completed', true)
      .single();

    // Fetch interviews
    const { data: interviews } = await supabase
      .from('interviews')
      .select('*')
      .eq('candidate_id', candidateId);

    // Build comprehensive prompt
    const systemPrompt = `You are an expert AI recruitment analyst. Generate a comprehensive, consistent analysis of this candidate.

CRITICAL: Ensure all sections are consistent with each other. If you recommend hiring, ALL sections must support this. If you have concerns, they must be reflected consistently across all sections.

Return a JSON object with the following structure:
{
  "executive_summary": {
    "overall_score": number (0-100),
    "recommendation": "strongly_recommend" | "recommend" | "consider" | "not_recommended",
    "one_liner": string (single compelling sentence),
    "key_strengths": [string, string, string],
    "key_concerns": [string, string, string],
    "career_level": string,
    "years_experience": number
  },
  "skills_analysis": {
    "overall_match": number (0-100),
    "technical_skills": [
      {
        "skill": string,
        "proficiency": number (0-100),
        "relevance": number (0-100),
        "evidence": string,
        "years": number
      }
    ],
    "soft_skills": [
      {
        "skill": string,
        "level": number (0-100),
        "evidence": string
      }
    ],
    "skill_gaps": [string],
    "learning_trajectory": string
  },
  "job_fit": {
    "match_score": number (0-100),
    "technical_fit": number (0-100),
    "experience_fit": number (0-100),
    "culture_fit": number (0-100),
    "alignment_details": string,
    "role_suitability": string,
    "growth_potential": string
  },
  "assessment_results": {
    "personality_summary": string,
    "behavioral_insights": string,
    "work_style": string,
    "team_dynamics": string,
    "strengths": [string],
    "development_areas": [string]
  },
  "market_intelligence": {
    "salary_range": { "min": number, "max": number, "currency": "USD" },
    "market_demand": "very_high" | "high" | "medium" | "low",
    "competitiveness": number (0-100),
    "retention_risk": "low" | "medium" | "high",
    "market_context": string
  },
  "interview_strategy": {
    "recommended_focus_areas": [string],
    "key_questions": [string],
    "red_flags_to_probe": [string],
    "strengths_to_validate": [string]
  },
  "final_recommendation": {
    "decision": "strong_hire" | "hire" | "maybe" | "pass",
    "confidence": number (0-100),
    "reasons_to_hire": [string],
    "key_concerns": [string],
    "conditions": [string],
    "next_steps": [string],
    "timeline_urgency": string
  }
}`;

    const userPrompt = `Analyze this candidate comprehensively:

CANDIDATE PROFILE:
Name: ${candidate.full_name}
Email: ${candidate.email}
Location: ${candidate.location || 'Not specified'}
Years of Experience: ${candidate.years_experience || 'Not specified'}
Current Position: ${candidate.current_position || 'Not specified'}
Current Company: ${candidate.current_company || 'Not specified'}

PROFESSIONAL SUMMARY:
${candidate.professional_summary || 'Not provided'}

EXPERIENCE:
${JSON.stringify(candidate.experience || [], null, 2)}

EDUCATION:
${JSON.stringify(candidate.education || [], null, 2)}

SKILLS:
${JSON.stringify(candidate.extracted_skills || [], null, 2)}

CERTIFICATIONS:
${JSON.stringify(candidate.certifications || [], null, 2)}

LANGUAGES:
${JSON.stringify(candidate.languages || [], null, 2)}

${targetJob ? `
TARGET JOB OPENING:
Title: ${targetJob.title}
Department: ${targetJob.department || 'Not specified'}
Description: ${targetJob.description || 'Not provided'}
Requirements: ${targetJob.requirements || 'Not provided'}
Required Skills: ${JSON.stringify(targetJob.required_skills || [], null, 2)}
Nice-to-Have Skills: ${JSON.stringify(targetJob.nice_to_have_skills || [], null, 2)}
Salary Range: ${targetJob.salary_min || 'Not specified'} - ${targetJob.salary_max || 'Not specified'}
` : ''}

${survey ? `
ASSESSMENT RESULTS:
Completed: ${survey.completed ? 'Yes' : 'No'}
EQ Score: ${survey.eq_score || 'N/A'}
- Self Awareness: ${survey.eq_self_awareness || 'N/A'}
- Self Regulation: ${survey.eq_self_regulation || 'N/A'}
- Motivation: ${survey.eq_motivation || 'N/A'}
- Empathy: ${survey.eq_empathy || 'N/A'}
- Social Skills: ${survey.eq_social_skills || 'N/A'}

Personality (OCEAN):
- Openness: ${survey.ocean_openness || 'N/A'}
- Conscientiousness: ${survey.ocean_conscientiousness || 'N/A'}
- Extraversion: ${survey.ocean_extraversion || 'N/A'}
- Agreeableness: ${survey.ocean_agreeableness || 'N/A'}
- Neuroticism: ${survey.ocean_neuroticism || 'N/A'}

SJT Score: ${survey.sjt_score || 'N/A'}
STAR Scores:
- Situation: ${survey.star_situation_score || 'N/A'}
- Task: ${survey.star_task_score || 'N/A'}
- Action: ${survey.star_action_score || 'N/A'}
- Result: ${survey.star_result_score || 'N/A'}

Values Alignment: ${survey.values_alignment_score || 'N/A'}
` : 'No assessment data available'}

${applications?.length ? `
APPLICATION HISTORY:
${applications.map(app => `
- Applied to: ${app.job_openings?.title || 'Unknown'}
- Status: ${app.status}
- AI Match Score: ${app.ai_match_score || 'N/A'}
- Culture Fit: ${app.culture_fit_score || 'N/A'}
- Applied: ${new Date(app.applied_date).toLocaleDateString()}
`).join('\n')}
` : 'No application history'}

${interviews?.length ? `
INTERVIEW HISTORY:
${interviews.map(interview => `
- Type: ${interview.interview_type}
- Date: ${new Date(interview.scheduled_date).toLocaleDateString()}
- Status: ${interview.status}
- Score: ${interview.score || 'Not scored'}
- Notes: ${interview.notes || 'No notes'}
`).join('\n')}
` : 'No interview history'}

Generate a comprehensive, internally consistent analysis. All scores and recommendations must align with each other.`;

    console.log('Calling Lovable AI for complete candidate analysis...');

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
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
              name: "generate_candidate_analysis",
              description: "Generate comprehensive candidate analysis",
              parameters: {
                type: "object",
                properties: {
                  executive_summary: {
                    type: "object",
                    properties: {
                      overall_score: { type: "number" },
                      recommendation: { type: "string", enum: ["strongly_recommend", "recommend", "consider", "not_recommended"] },
                      one_liner: { type: "string" },
                      key_strengths: { type: "array", items: { type: "string" } },
                      key_concerns: { type: "array", items: { type: "string" } },
                      career_level: { type: "string" },
                      years_experience: { type: "number" }
                    },
                    required: ["overall_score", "recommendation", "one_liner", "key_strengths", "key_concerns", "career_level", "years_experience"]
                  },
                  skills_analysis: {
                    type: "object",
                    properties: {
                      overall_match: { type: "number" },
                      technical_skills: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            skill: { type: "string" },
                            proficiency: { type: "number" },
                            relevance: { type: "number" },
                            evidence: { type: "string" },
                            years: { type: "number" }
                          }
                        }
                      },
                      soft_skills: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            skill: { type: "string" },
                            level: { type: "number" },
                            evidence: { type: "string" }
                          }
                        }
                      },
                      skill_gaps: { type: "array", items: { type: "string" } },
                      learning_trajectory: { type: "string" }
                    }
                  },
                  job_fit: {
                    type: "object",
                    properties: {
                      match_score: { type: "number" },
                      technical_fit: { type: "number" },
                      experience_fit: { type: "number" },
                      culture_fit: { type: "number" },
                      alignment_details: { type: "string" },
                      role_suitability: { type: "string" },
                      growth_potential: { type: "string" }
                    }
                  },
                  assessment_results: {
                    type: "object",
                    properties: {
                      personality_summary: { type: "string" },
                      behavioral_insights: { type: "string" },
                      work_style: { type: "string" },
                      team_dynamics: { type: "string" },
                      strengths: { type: "array", items: { type: "string" } },
                      development_areas: { type: "array", items: { type: "string" } }
                    }
                  },
                  market_intelligence: {
                    type: "object",
                    properties: {
                      salary_range: {
                        type: "object",
                        properties: {
                          min: { type: "number" },
                          max: { type: "number" },
                          currency: { type: "string" }
                        }
                      },
                      market_demand: { type: "string", enum: ["very_high", "high", "medium", "low"] },
                      competitiveness: { type: "number" },
                      retention_risk: { type: "string", enum: ["low", "medium", "high"] },
                      market_context: { type: "string" }
                    }
                  },
                  interview_strategy: {
                    type: "object",
                    properties: {
                      recommended_focus_areas: { type: "array", items: { type: "string" } },
                      key_questions: { type: "array", items: { type: "string" } },
                      red_flags_to_probe: { type: "array", items: { type: "string" } },
                      strengths_to_validate: { type: "array", items: { type: "string" } }
                    }
                  },
                  final_recommendation: {
                    type: "object",
                    properties: {
                      decision: { type: "string", enum: ["strong_hire", "hire", "maybe", "pass"] },
                      confidence: { type: "number" },
                      reasons_to_hire: { type: "array", items: { type: "string" } },
                      key_concerns: { type: "array", items: { type: "string" } },
                      conditions: { type: "array", items: { type: "string" } },
                      next_steps: { type: "array", items: { type: "string" } },
                      timeline_urgency: { type: "string" }
                    }
                  }
                },
                required: ["executive_summary", "skills_analysis", "job_fit", "assessment_results", "market_intelligence", "interview_strategy", "final_recommendation"]
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "generate_candidate_analysis" } }
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', aiResponse.status, errorText);
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    
    // Extract from tool call
    const toolCall = aiData.choices[0].message.tool_calls?.[0];
    if (!toolCall || !toolCall.function?.arguments) {
      console.error('No tool call in response:', JSON.stringify(aiData, null, 2));
      throw new Error('Invalid AI response format - no tool call');
    }

    let analysis;
    try {
      analysis = JSON.parse(toolCall.function.arguments);
      console.log('Successfully parsed analysis');
    } catch (e) {
      console.error('Failed to parse tool call arguments:', toolCall.function.arguments);
      console.error('Parse error:', e);
      throw new Error('Invalid AI response format');
    }

    // Store in database
    const { error: insertError } = await supabase
      .from('ai_insights')
      .upsert({
        candidate_id: candidateId,
        job_id: jobId,
        analysis_type: 'comprehensive',
        insights: analysis,
        generated_at: new Date().toISOString()
      });

    if (insertError) {
      console.error('Error storing analysis:', insertError);
    }

    console.log('Analysis complete:', {
      candidateId,
      jobId,
      recommendation: analysis.executive_summary?.recommendation,
      overallScore: analysis.executive_summary?.overall_score
    });

    return new Response(JSON.stringify(analysis), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in analyze-candidate-complete:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
