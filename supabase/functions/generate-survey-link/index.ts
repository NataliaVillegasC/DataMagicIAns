import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    
    if (!candidateId) {
      throw new Error('Candidate ID is required');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check if survey already exists
    const { data: existing } = await supabase
      .from('candidate_surveys')
      .select('survey_token')
      .eq('candidate_id', candidateId)
      .maybeSingle();

    if (existing) {
      const baseUrl = req.headers.get('origin') || supabaseUrl.replace('supabase.co', 'lovable.app');
      const surveyUrl = `${baseUrl}/survey/${existing.survey_token}`;
      
      return new Response(
        JSON.stringify({ surveyUrl, token: existing.survey_token }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Create new survey with a unique token
    const surveyToken = crypto.randomUUID();
    
    const { data: survey, error } = await supabase
      .from('candidate_surveys')
      .insert([{
        candidate_id: candidateId,
        survey_token: surveyToken
      }])
      .select('survey_token')
      .single();

    if (error) throw error;

    const baseUrl = req.headers.get('origin') || supabaseUrl.replace('supabase.co', 'lovable.app');
    const surveyUrl = `${baseUrl}/survey/${survey.survey_token}`;

    return new Response(
      JSON.stringify({ surveyUrl, token: survey.survey_token }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('Error in generate-survey-link function:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Unknown error occurred' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});