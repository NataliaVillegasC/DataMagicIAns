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
    console.log('Starting candidate data population...');

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get all candidates
    const { data: candidates, error: candidatesError } = await supabaseClient
      .from('candidates')
      .select('*');

    if (candidatesError) {
      console.error('Error fetching candidates:', candidatesError);
      throw candidatesError;
    }

    console.log(`Found ${candidates?.length || 0} candidates`);

    // Get all job openings
    const { data: jobOpenings, error: jobsError } = await supabaseClient
      .from('job_openings')
      .select('id, title, department, company');

    if (jobsError) {
      console.error('Error fetching job openings:', jobsError);
      throw jobsError;
    }

    console.log(`Found ${jobOpenings?.length || 0} job openings`);

    if (!candidates || candidates.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No candidates found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    if (!jobOpenings || jobOpenings.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No job openings found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    let completedCandidates = 0;
    let createdApplications = 0;
    let createdSurveys = 0;
    let createdInterviews = 0;
    let updatedCandidates = 0;

    // Process candidates in batches
    const batchSize = 20;
    for (let i = 0; i < candidates.length; i += batchSize) {
      const batch = candidates.slice(i, i + batchSize);
      console.log(`Processing batch ${Math.floor(i / batchSize) + 1} of ${Math.ceil(candidates.length / batchSize)}`);

      for (const candidate of batch) {
        try {
          // Update candidate with missing information
          const updates: any = {};
          
          if (!candidate.phone) {
            updates.phone = `+57${Math.floor(3000000000 + Math.random() * 999999999)}`;
          }
          
          if (!candidate.location) {
            const locations = ['Bogotá, Colombia', 'Medellín, Colombia', 'Cali, Colombia', 'Barranquilla, Colombia', 'Mexico City, Mexico', 'Santiago, Chile', 'Buenos Aires, Argentina', 'Remote'];
            updates.location = locations[Math.floor(Math.random() * locations.length)];
          }
          
          if (!candidate.years_experience) {
            updates.years_experience = Math.floor(Math.random() * 15) + 1;
          }
          
          if (!candidate.current_position) {
            const positions = ['Software Engineer', 'Senior Developer', 'Product Manager', 'Data Analyst', 'UX Designer', 'Marketing Manager', 'Sales Executive', 'HR Specialist'];
            updates.current_position = positions[Math.floor(Math.random() * positions.length)];
          }
          
          if (!candidate.current_company) {
            const companies = ['TechCorp', 'InnovateSoft', 'DataSystems', 'CloudWorks', 'DigitalFirst', 'StartupHub', 'GlobalTech'];
            updates.current_company = companies[Math.floor(Math.random() * companies.length)];
          }
          
          if (!candidate.status || candidate.status === 'new') {
            const statuses = ['screening', 'interviewing', 'offer', 'hired'];
            updates.status = statuses[Math.floor(Math.random() * statuses.length)];
          }

          if (!candidate.extracted_skills || candidate.extracted_skills.length === 0) {
            const allSkills = ['JavaScript', 'TypeScript', 'React', 'Node.js', 'Python', 'SQL', 'AWS', 'Docker', 'Kubernetes', 'Git', 'Agile', 'Scrum', 'Product Management', 'UX Design', 'Marketing', 'Sales', 'Data Analysis', 'Machine Learning'];
            const numSkills = Math.floor(Math.random() * 5) + 3;
            const skills: Array<{ name: string; level: string }> = [];
            for (let j = 0; j < numSkills; j++) {
              const skill = allSkills[Math.floor(Math.random() * allSkills.length)];
              if (!skills.find(s => s.name === skill)) {
                skills.push({
                  name: skill,
                  level: ['beginner', 'intermediate', 'advanced', 'expert'][Math.floor(Math.random() * 4)]
                });
              }
            }
            updates.extracted_skills = skills;
          }

          if (Object.keys(updates).length > 0) {
            const { error: updateError } = await supabaseClient
              .from('candidates')
              .update(updates)
              .eq('id', candidate.id);

            if (updateError) {
              console.error(`Error updating candidate ${candidate.id}:`, updateError);
            } else {
              updatedCandidates++;
            }
          }

          // Create survey if doesn't exist
          const { data: existingSurvey } = await supabaseClient
            .from('candidate_surveys')
            .select('id')
            .eq('candidate_id', candidate.id)
            .single();

          if (!existingSurvey) {
            const surveyData = {
              candidate_id: candidate.id,
              survey_token: `survey_${candidate.id}_${Date.now()}`,
              completed: Math.random() > 0.3, // 70% completed
              completed_at: Math.random() > 0.3 ? new Date().toISOString() : null,
              ocean_openness: Math.floor(Math.random() * 50) + 50,
              ocean_conscientiousness: Math.floor(Math.random() * 50) + 50,
              ocean_extraversion: Math.floor(Math.random() * 50) + 50,
              ocean_agreeableness: Math.floor(Math.random() * 50) + 50,
              ocean_neuroticism: Math.floor(Math.random() * 50) + 20,
              eq_score: Math.floor(Math.random() * 40) + 60,
              eq_self_awareness: Math.floor(Math.random() * 40) + 60,
              eq_self_regulation: Math.floor(Math.random() * 40) + 60,
              eq_motivation: Math.floor(Math.random() * 40) + 60,
              eq_empathy: Math.floor(Math.random() * 40) + 60,
              eq_social_skills: Math.floor(Math.random() * 40) + 60,
              values_alignment_score: Math.floor(Math.random() * 40) + 60,
              values_responses: {},
              star_situation_score: Math.floor(Math.random() * 40) + 60,
              star_task_score: Math.floor(Math.random() * 40) + 60,
              star_action_score: Math.floor(Math.random() * 40) + 60,
              star_result_score: Math.floor(Math.random() * 40) + 60,
              star_responses: {},
              sjt_score: Math.floor(Math.random() * 40) + 60,
              sjt_responses: {}
            };

            const { error: surveyError } = await supabaseClient
              .from('candidate_surveys')
              .insert(surveyData);

            if (surveyError) {
              console.error(`Error creating survey for candidate ${candidate.id}:`, surveyError);
            } else {
              createdSurveys++;
            }
          }

          // Create 1-3 applications per candidate
          const numApplications = Math.floor(Math.random() * 3) + 1;
          const selectedJobs: string[] = [];
          
          for (let j = 0; j < numApplications && j < jobOpenings.length; j++) {
            const randomJob = jobOpenings[Math.floor(Math.random() * jobOpenings.length)];
            if (!selectedJobs.includes(randomJob.id)) {
              selectedJobs.push(randomJob.id);

              // Check if application already exists
              const { data: existingApp } = await supabaseClient
                .from('applications')
                .select('id')
                .eq('candidate_id', candidate.id)
                .eq('job_opening_id', randomJob.id)
                .single();

              if (!existingApp) {
                const applicationData = {
                  candidate_id: candidate.id,
                  job_opening_id: randomJob.id,
                  status: ['applied', 'screening', 'interviewing', 'offer', 'hired', 'rejected'][Math.floor(Math.random() * 6)],
                  ai_match_score: Math.floor(Math.random() * 40) + 60,
                  skill_match_score: Math.floor(Math.random() * 40) + 60,
                  culture_fit_score: Math.floor(Math.random() * 40) + 60,
                  predicted_success: Math.floor(Math.random() * 40) + 60,
                  retention_risk: Math.floor(Math.random() * 40) + 20,
                  strengths: ['Strong technical skills', 'Great communication', 'Team player'],
                  red_flags: Math.random() > 0.7 ? ['Frequent job changes'] : [],
                  ai_recommendation: 'Recommended for interview based on skills match and cultural fit.',
                  applied_date: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000).toISOString()
                };

                const { error: appError } = await supabaseClient
                  .from('applications')
                  .insert(applicationData);

                if (appError) {
                  console.error(`Error creating application for candidate ${candidate.id}:`, appError);
                } else {
                  createdApplications++;

                  // Create interview for some applications (50% chance)
                  if (Math.random() > 0.5 && (applicationData.status === 'interviewing' || applicationData.status === 'offer')) {
                    const interviewTypes = ['technical', 'behavioral', 'cultural_fit', 'technical_assignment'];
                    const interviewStatuses = ['scheduled', 'completed', 'cancelled'];
                    
                    const futureDate = new Date(Date.now() + Math.random() * 30 * 24 * 60 * 60 * 1000);
                    const pastDate = new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000);
                    const isScheduled = Math.random() > 0.5;

                    const interviewData = {
                      candidate_id: candidate.id,
                      job_opening_id: randomJob.id,
                      scheduled_date: isScheduled ? futureDate.toISOString() : pastDate.toISOString(),
                      interview_type: interviewTypes[Math.floor(Math.random() * interviewTypes.length)],
                      status: isScheduled ? 'scheduled' : interviewStatuses[Math.floor(Math.random() * interviewStatuses.length)],
                      interviewer_name: ['Ana García', 'Carlos Ruiz', 'María López', 'Juan Pérez'][Math.floor(Math.random() * 4)],
                      interviewer_email: ['ana@truora.com', 'carlos@truora.com', 'maria@truora.com', 'juan@truora.com'][Math.floor(Math.random() * 4)],
                      location: Math.random() > 0.5 ? 'Video Call - Zoom' : 'Office - Meeting Room A',
                      duration_minutes: [30, 45, 60, 90][Math.floor(Math.random() * 4)],
                      score: !isScheduled ? Math.floor(Math.random() * 40) + 60 : null,
                      feedback: !isScheduled ? 'Candidate demonstrated strong technical skills and cultural alignment.' : null,
                      notes: 'Prepare questions about recent projects and technical challenges.',
                      created_by: candidate.source_user_id || '8d33cb17-9ab6-48dd-a737-4c6afcd1eee8'
                    };

                    const { error: interviewError } = await supabaseClient
                      .from('interviews')
                      .insert(interviewData);

                    if (interviewError) {
                      console.error(`Error creating interview for candidate ${candidate.id}:`, interviewError);
                    } else {
                      createdInterviews++;
                    }
                  }
                }
              }
            }
          }

          completedCandidates++;
        } catch (error) {
          console.error(`Error processing candidate ${candidate.id}:`, error);
        }
      }
    }

    const result = {
      success: true,
      summary: {
        totalCandidates: candidates.length,
        completedCandidates,
        updatedCandidates,
        createdSurveys,
        createdApplications,
        createdInterviews
      }
    };

    console.log('Population complete:', result);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in populate-candidate-data:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});