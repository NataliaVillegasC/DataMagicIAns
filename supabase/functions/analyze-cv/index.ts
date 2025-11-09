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
    const { cvText, candidateName } = await req.json();
    
    // Input validation
    if (!cvText || typeof cvText !== 'string') {
      throw new Error('CV text is required and must be a string');
    }
    
    if (cvText.length > 50000) {
      throw new Error('CV text is too large (max 50,000 characters)');
    }
    
    if (candidateName && typeof candidateName !== 'string') {
      throw new Error('Candidate name must be a string');
    }
    
    if (candidateName && candidateName.length > 200) {
      throw new Error('Candidate name is too long (max 200 characters)');
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const systemPrompt = `You are an expert HR tech AI that analyzes resumes/CVs and extracts structured skill data.

Extract the following from the CV:
1. **Skills** - Technical and soft skills with confidence levels (0-100)
2. **Years of experience** for each skill
3. **Sources** - where the skill was mentioned (Resume, LinkedIn, Projects, etc.)

Return ONLY valid JSON in this exact format:
{
  "skills": [
    {
      "name": "Python",
      "category": "Programming",
      "confidence": 95,
      "years_experience": 5,
      "sources": ["Resume", "Projects"]
    }
  ]
}

Rules:
- confidence 90-100: Explicitly listed with strong evidence
- confidence 70-89: Mentioned with moderate evidence  
- confidence 50-69: Implied or weak evidence
- Extract 5-15 most relevant skills
- Categories: Programming, Frontend, Backend, Database, Cloud, DevOps, AI/ML, Soft Skills, Management, Analytics`;

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
          { role: 'user', content: `Candidate Name: ${candidateName}\n\nCV Content:\n${cvText}` }
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
      throw new Error('Failed to analyze CV with AI');
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    
    // Parse JSON from response
    let skillsData;
    try {
      // Remove markdown code blocks if present
      const jsonStr = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      skillsData = JSON.parse(jsonStr);
    } catch (e) {
      console.error('Failed to parse AI response:', content);
      throw new Error('Invalid JSON response from AI');
    }

    return new Response(
      JSON.stringify({ 
        skills: skillsData.skills || []
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('Error in analyze-cv function:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Unknown error occurred' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
