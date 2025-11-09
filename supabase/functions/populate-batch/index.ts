import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

// Helper function to get random items from array
function getRandomItems<T>(array: T[], min: number, max: number): T[] {
  const count = Math.floor(Math.random() * (max - min + 1)) + min;
  const shuffled = [...array].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, Math.min(count, array.length));
}

// Personality archetypes for diverse profiles
const ARCHETYPES = [
  { name: 'Star Performer', traits: 'highly ambitious, exceptional technical skills, natural leader, innovation-driven' },
  { name: 'Team Player', traits: 'collaborative, emotionally intelligent, reliable, supportive' },
  { name: 'Technical Specialist', traits: 'deep expertise, detail-oriented, introverted, analytical' },
  { name: 'Rising Star', traits: 'high potential, eager to learn, adaptable, growth mindset' },
  { name: 'Steady Contributor', traits: 'consistent, experienced, mentorship-oriented, process-driven' },
  { name: 'Creative Innovator', traits: 'out-of-box thinking, entrepreneurial, risk-taker, visionary' },
  { name: 'Strategic Thinker', traits: 'big-picture oriented, analytical, data-driven decision maker' },
];

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { batchNumber, batchSize = 20 } = await req.json();
    console.log(`Processing batch ${batchNumber} with size ${batchSize}`);

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const offset = (batchNumber - 1) * batchSize;

    // Get batch of candidates
    const { data: candidates, error: candidatesError } = await supabaseClient
      .from('candidates')
      .select('*')
      .range(offset, offset + batchSize - 1);

    if (candidatesError) throw candidatesError;

    if (!candidates || candidates.length === 0) {
      return new Response(
        JSON.stringify({ success: true, processed: 0, message: 'No more candidates to process' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get all job openings once
    const { data: jobOpenings } = await supabaseClient
      .from('job_openings')
      .select('id, title, company');

    let stats = {
      updated: 0,
      surveys: 0,
      applications: 0,
      interviews: 0
    };

    // Get Lovable AI API key for generating realistic survey responses
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    for (const candidate of candidates) {
      // Assign personality archetype
      const archetype = ARCHETYPES[Math.floor(Math.random() * ARCHETYPES.length)];
      
      // Update candidate info with COMPLETE data
      const updates: any = {};
      
      if (!candidate.phone) {
        const countryCode = ['+57', '+52', '+56', '+54', '+1'][Math.floor(Math.random() * 5)];
        updates.phone = `${countryCode} ${Math.floor(300 + Math.random() * 699)}-${Math.floor(1000 + Math.random() * 8999)}`;
      }
      
      if (!candidate.location) {
        const locations = [
          'Bogotá, Colombia', 'Medellín, Colombia', 'Cali, Colombia', 
          'Mexico City, Mexico', 'Guadalajara, Mexico', 'Monterrey, Mexico',
          'Santiago, Chile', 'Buenos Aires, Argentina', 'Lima, Peru',
          'São Paulo, Brazil', 'Rio de Janeiro, Brazil',
          'Remote - LATAM', 'Remote - Global', 'New York, USA', 'San Francisco, USA'
        ];
        updates.location = locations[Math.floor(Math.random() * locations.length)];
      }
      
      if (!candidate.years_experience) {
        // Star performers tend to have 5-12 years, rising stars 2-5, specialists 8-15
        if (archetype.name === 'Star Performer') {
          updates.years_experience = Math.floor(Math.random() * 8) + 5;
        } else if (archetype.name === 'Rising Star') {
          updates.years_experience = Math.floor(Math.random() * 4) + 2;
        } else if (archetype.name === 'Technical Specialist') {
          updates.years_experience = Math.floor(Math.random() * 8) + 8;
        } else {
          updates.years_experience = Math.floor(Math.random() * 12) + 3;
        }
      }
      
      if (!candidate.current_position) {
        const seniorityLevel = (updates.years_experience || candidate.years_experience || 5);
        let positions: string[];
        
        if (seniorityLevel >= 10) {
          positions = [
            'Principal Engineer', 'Engineering Director', 'VP of Engineering',
            'Senior Product Manager', 'Director of Product', 'Chief Product Officer',
            'Lead Designer', 'Design Director', 'Head of Design',
            'Data Science Lead', 'ML Engineering Manager', 'Chief Data Officer',
            'VP of Sales', 'Sales Director', 'Chief Revenue Officer'
          ];
        } else if (seniorityLevel >= 5) {
          positions = [
            'Senior Software Engineer', 'Lead Engineer', 'Staff Engineer',
            'Senior Product Manager', 'Product Lead',
            'Senior UX Designer', 'Lead Designer',
            'Senior Data Scientist', 'ML Engineer',
            'Senior Sales Manager', 'Enterprise Account Executive'
          ];
        } else {
          positions = [
            'Software Engineer', 'Frontend Developer', 'Backend Developer',
            'Product Manager', 'Associate Product Manager',
            'UX Designer', 'Product Designer',
            'Data Analyst', 'Junior Data Scientist',
            'Sales Executive', 'Account Manager'
          ];
        }
        updates.current_position = positions[Math.floor(Math.random() * positions.length)];
      }
      
      if (!candidate.current_company) {
        const companies = [
          // LATAM unicorns & leaders
          'Rappi', 'Mercado Libre', 'Nubank', 'Kavak', 'Clip', 'dLocal', 'Ualá', 'Creditas',
          // Tech companies
          'Amazon', 'Google', 'Microsoft', 'Meta', 'Apple', 'Netflix', 'Uber', 'Airbnb',
          // Promising startups
          'Y Combinator Startup', 'Tech Ventures', 'Innovation Labs', 'StartupCo',
          // Traditional tech
          'IBM', 'Oracle', 'SAP', 'Accenture', 'Thoughtworks', 'Globant'
        ];
        updates.current_company = companies[Math.floor(Math.random() * companies.length)];
      }
      
      if (!candidate.status || candidate.status === 'new') {
        const weightedStatuses = ['screening', 'screening', 'interviewing', 'interviewing', 'interviewing', 'offer', 'hired'];
        updates.status = weightedStatuses[Math.floor(Math.random() * weightedStatuses.length)];
      }

      // LinkedIn URL (95% of professionals)
      if (!candidate.linkedin_url && Math.random() > 0.05) {
        const firstName = candidate.full_name?.split(' ')[0]?.toLowerCase() || 'user';
        const lastName = candidate.full_name?.split(' ')[1]?.toLowerCase() || 'name';
        updates.linkedin_url = `https://linkedin.com/in/${firstName}-${lastName}-${Math.floor(Math.random() * 999)}`;
      }

      // GitHub URL (60% of tech roles)
      const isTechRole = (candidate.current_position || updates.current_position || '').toLowerCase().includes('engineer') ||
                         (candidate.current_position || updates.current_position || '').toLowerCase().includes('developer') ||
                         (candidate.current_position || updates.current_position || '').toLowerCase().includes('data');
      if (!candidate.github_url && isTechRole && Math.random() > 0.4) {
        const username = candidate.full_name?.split(' ')[0]?.toLowerCase() || 'developer';
        updates.github_url = `https://github.com/${username}${Math.floor(Math.random() * 9999)}`;
      }

      // Portfolio URL (50% of designers and developers)
      const hasPortfolio = isTechRole || (candidate.current_position || updates.current_position || '').toLowerCase().includes('design');
      if (!candidate.portfolio_url && hasPortfolio && Math.random() > 0.5) {
        const name = candidate.full_name?.toLowerCase().replace(/\s+/g, '') || 'portfolio';
        const portfolioTypes = [
          `https://${name}.dev`,
          `https://${name}.com`,
          `https://portfolio-${name}.vercel.app`,
          `https://dribbble.com/${name}`,
          `https://behance.net/${name}`
        ];
        updates.portfolio_url = portfolioTypes[Math.floor(Math.random() * portfolioTypes.length)];
      }

      // Availability (everyone has it)
      if (!candidate.availability) {
        const availabilities = [
          'Immediate', 'Available in 2 weeks', '2 weeks notice', '1 month notice',
          'Actively interviewing', 'Open to opportunities', 'Considering offers'
        ];
        updates.availability = availabilities[Math.floor(Math.random() * availabilities.length)];
      }

      // Generate comprehensive, realistic skills
      if (!candidate.extracted_skills || (Array.isArray(candidate.extracted_skills) && candidate.extracted_skills.length === 0)) {
        const position = (candidate.current_position || updates.current_position || '').toLowerCase();
        const experience = updates.years_experience || candidate.years_experience || 5;
        let skillSet: string[] = [];

        if (position.includes('software') || position.includes('developer') || position.includes('engineer')) {
          const allTechSkills = [
            // Languages
            'JavaScript', 'TypeScript', 'Python', 'Java', 'Go', 'Ruby', 'PHP', 'C#', 'Swift', 'Kotlin', 'Rust',
            // Frontend
            'React', 'Vue.js', 'Angular', 'Next.js', 'Svelte', 'HTML5', 'CSS3', 'Tailwind CSS',
            // Backend
            'Node.js', 'Express', 'Django', 'Flask', 'Spring Boot', 'Ruby on Rails', '.NET Core',
            // Databases
            'PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'Elasticsearch', 'DynamoDB', 'Cassandra',
            // Cloud & DevOps
            'AWS', 'Azure', 'GCP', 'Docker', 'Kubernetes', 'Terraform', 'CI/CD', 'Jenkins', 'GitLab CI',
            // Other
            'Git', 'REST APIs', 'GraphQL', 'Microservices', 'gRPC', 'WebSockets', 'System Design',
            'Agile', 'Scrum', 'TDD', 'Unit Testing', 'Integration Testing', 'Jest', 'Pytest'
          ];
          const numSkills = experience >= 8 ? 14 : experience >= 5 ? 10 : 7;
          skillSet = getRandomItems(allTechSkills, numSkills, numSkills + 3);
        } else if (position.includes('data')) {
          const allDataSkills = [
            'Python', 'R', 'SQL', 'Scala', 'Pandas', 'NumPy', 'Scikit-learn',
            'TensorFlow', 'PyTorch', 'Keras', 'Machine Learning', 'Deep Learning', 'NLP',
            'Data Visualization', 'Tableau', 'Power BI', 'Looker', 'Matplotlib', 'Seaborn', 'D3.js',
            'Big Data', 'Apache Spark', 'Hadoop', 'Airflow', 'Databricks',
            'ETL', 'Data Warehousing', 'Data Modeling', 'Feature Engineering',
            'Statistics', 'A/B Testing', 'Predictive Modeling', 'Time Series', 'Causal Inference',
            'AWS', 'GCP', 'Snowflake', 'dbt', 'SQL Optimization'
          ];
          const numSkills = experience >= 8 ? 12 : experience >= 5 ? 9 : 6;
          skillSet = getRandomItems(allDataSkills, numSkills, numSkills + 2);
        } else if (position.includes('product')) {
          const allProductSkills = [
            'Product Strategy', 'Product Roadmapping', 'User Research', 'Market Analysis', 'Competitive Analysis',
            'Agile', 'Scrum', 'Kanban', 'Lean', 'Design Thinking',
            'JIRA', 'Confluence', 'Figma', 'Miro', 'Notion',
            'Wireframing', 'Prototyping', 'User Stories', 'A/B Testing', 'Analytics',
            'SQL', 'Google Analytics', 'Mixpanel', 'Amplitude', 'Segment',
            'Stakeholder Management', 'Product Metrics', 'OKRs', 'KPIs', 'Go-to-Market Strategy',
            'Pricing Strategy', 'Product-Market Fit', 'Customer Development'
          ];
          const numSkills = experience >= 8 ? 11 : experience >= 5 ? 8 : 6;
          skillSet = getRandomItems(allProductSkills, numSkills, numSkills + 2);
        } else if (position.includes('design')) {
          const allDesignSkills = [
            'Figma', 'Sketch', 'Adobe XD', 'Adobe Photoshop', 'Adobe Illustrator', 'InVision', 'Framer',
            'UI Design', 'UX Design', 'User Research', 'Usability Testing', 'User Interviews',
            'Wireframing', 'Prototyping', 'Design Systems', 'Atomic Design',
            'Responsive Design', 'Mobile Design', 'Web Design', 'Accessibility', 'WCAG',
            'Information Architecture', 'Interaction Design', 'Visual Design', 'Typography',
            'HTML5', 'CSS3', 'JavaScript', 'React', 'Animation', 'Micro-interactions',
            'Design Thinking', 'Human-Centered Design', 'Design Sprint'
          ];
          const numSkills = experience >= 8 ? 11 : experience >= 5 ? 8 : 6;
          skillSet = getRandomItems(allDesignSkills, numSkills, numSkills + 2);
        } else if (position.includes('marketing')) {
          const allMarketingSkills = [
            'Digital Marketing', 'Content Marketing', 'SEO', 'SEM', 'Social Media Marketing',
            'Email Marketing', 'Marketing Analytics', 'Growth Marketing', 'Performance Marketing',
            'Google Analytics', 'Google Ads', 'Facebook Ads', 'LinkedIn Ads', 'Twitter Ads',
            'Content Strategy', 'Copywriting', 'Storytelling', 'Brand Strategy', 'Brand Management',
            'Marketing Automation', 'HubSpot', 'Salesforce', 'Marketo', 'Mailchimp',
            'CRM', 'Customer Segmentation', 'Funnel Optimization', 'Conversion Rate Optimization',
            'A/B Testing', 'Growth Hacking', 'Viral Marketing', 'Influencer Marketing'
          ];
          const numSkills = experience >= 8 ? 11 : experience >= 5 ? 8 : 6;
          skillSet = getRandomItems(allMarketingSkills, numSkills, numSkills + 2);
        } else if (position.includes('sales')) {
          const allSalesSkills = [
            'B2B Sales', 'B2C Sales', 'Enterprise Sales', 'SaaS Sales', 'Consultative Selling',
            'Sales Strategy', 'Sales Planning', 'Lead Generation', 'Prospecting', 'Cold Outreach',
            'Negotiation', 'Closing', 'Account Management', 'Upselling', 'Cross-selling',
            'CRM', 'Salesforce', 'HubSpot', 'Outreach', 'SalesLoft',
            'Pipeline Management', 'Sales Forecasting', 'Territory Planning',
            'Customer Relationship', 'Customer Success', 'Solution Selling', 'SPIN Selling',
            'Challenger Sale', 'Value-Based Selling', 'Demo Presentations', 'ROI Analysis'
          ];
          const numSkills = experience >= 8 ? 10 : experience >= 5 ? 7 : 5;
          skillSet = getRandomItems(allSalesSkills, numSkills, numSkills + 2);
        } else {
          const allGeneralSkills = [
            'Communication', 'Leadership', 'Team Collaboration', 'Problem Solving', 'Critical Thinking',
            'Project Management', 'Time Management', 'Organizational Skills', 'Strategic Planning',
            'Stakeholder Management', 'Change Management', 'Conflict Resolution',
            'Emotional Intelligence', 'Adaptability', 'Resilience', 'Growth Mindset',
            'Microsoft Office', 'Google Workspace', 'Slack', 'Zoom', 'Presentation Skills',
            'Report Writing', 'Data Analysis', 'Excel', 'PowerPoint', 'Documentation'
          ];
          const numSkills = experience >= 8 ? 9 : experience >= 5 ? 7 : 5;
          skillSet = getRandomItems(allGeneralSkills, numSkills, numSkills + 1);
        }

        // Assign skill levels based on experience and archetype
        const skills = skillSet.map(skill => {
          let level: string;
          let years: number;
          
          if (archetype.name === 'Star Performer' || archetype.name === 'Technical Specialist') {
            level = Math.random() > 0.3 ? 'expert' : 'advanced';
            years = Math.min(Math.floor(Math.random() * experience) + 2, experience);
          } else if (archetype.name === 'Rising Star') {
            level = Math.random() > 0.6 ? 'advanced' : 'intermediate';
            years = Math.floor(Math.random() * 3) + 1;
          } else {
            level = ['intermediate', 'advanced', 'expert'][Math.floor(Math.random() * 3)];
            years = Math.floor(Math.random() * Math.min(experience, 8)) + 1;
          }
          
          return { name: skill, level, years };
        });
        
        updates.extracted_skills = skills;
      }

      // Add rich notes based on archetype
      if (!candidate.notes) {
        const noteTemplates = [
          `${archetype.name} profile. ${archetype.traits}. Excellent cultural fit, shows strong alignment with company values.`,
          `Demonstrated ${archetype.traits}. Previous work at ${updates.current_company || candidate.current_company} shows consistent growth trajectory.`,
          `${archetype.traits}. Referenced by former colleagues as top performer. Strong potential for rapid advancement.`,
          `${archetype.name} with proven track record. ${archetype.traits}. Excellent communication skills in technical and business contexts.`
        ];
        updates.notes = noteTemplates[Math.floor(Math.random() * noteTemplates.length)];
      }

      if (Object.keys(updates).length > 0) {
        await supabaseClient.from('candidates').update(updates).eq('id', candidate.id);
        stats.updated++;
      }

      // Create realistic survey using AI or archetype-based logic
      const { data: existingSurvey } = await supabaseClient
        .from('candidate_surveys')
        .select('id')
        .eq('candidate_id', candidate.id)
        .maybeSingle();

      let surveyData: any = null;

      if (!existingSurvey) {
        // Generate personality scores based on archetype
        surveyData = {
          candidate_id: candidate.id,
          survey_token: `survey_${candidate.id}_${Date.now()}`,
          completed: true,
          completed_at: new Date().toISOString(),
        };

        // OCEAN scores based on archetype
        if (archetype.name === 'Star Performer') {
          surveyData.ocean_openness = Math.floor(Math.random() * 10) + 85;
          surveyData.ocean_conscientiousness = Math.floor(Math.random() * 10) + 88;
          surveyData.ocean_extraversion = Math.floor(Math.random() * 15) + 75;
          surveyData.ocean_agreeableness = Math.floor(Math.random() * 15) + 70;
          surveyData.ocean_neuroticism = Math.floor(Math.random() * 20) + 20;
        } else if (archetype.name === 'Team Player') {
          surveyData.ocean_openness = Math.floor(Math.random() * 15) + 70;
          surveyData.ocean_conscientiousness = Math.floor(Math.random() * 15) + 78;
          surveyData.ocean_extraversion = Math.floor(Math.random() * 10) + 85;
          surveyData.ocean_agreeableness = Math.floor(Math.random() * 10) + 88;
          surveyData.ocean_neuroticism = Math.floor(Math.random() * 20) + 25;
        } else if (archetype.name === 'Technical Specialist') {
          surveyData.ocean_openness = Math.floor(Math.random() * 15) + 75;
          surveyData.ocean_conscientiousness = Math.floor(Math.random() * 10) + 85;
          surveyData.ocean_extraversion = Math.floor(Math.random() * 20) + 45;
          surveyData.ocean_agreeableness = Math.floor(Math.random() * 20) + 65;
          surveyData.ocean_neuroticism = Math.floor(Math.random() * 25) + 30;
        } else if (archetype.name === 'Rising Star') {
          surveyData.ocean_openness = Math.floor(Math.random() * 10) + 88;
          surveyData.ocean_conscientiousness = Math.floor(Math.random() * 15) + 75;
          surveyData.ocean_extraversion = Math.floor(Math.random() * 15) + 70;
          surveyData.ocean_agreeableness = Math.floor(Math.random() * 15) + 75;
          surveyData.ocean_neuroticism = Math.floor(Math.random() * 20) + 35;
        } else if (archetype.name === 'Creative Innovator') {
          surveyData.ocean_openness = Math.floor(Math.random() * 5) + 92;
          surveyData.ocean_conscientiousness = Math.floor(Math.random() * 20) + 65;
          surveyData.ocean_extraversion = Math.floor(Math.random() * 15) + 75;
          surveyData.ocean_agreeableness = Math.floor(Math.random() * 20) + 65;
          surveyData.ocean_neuroticism = Math.floor(Math.random() * 25) + 40;
        } else if (archetype.name === 'Strategic Thinker') {
          surveyData.ocean_openness = Math.floor(Math.random() * 15) + 78;
          surveyData.ocean_conscientiousness = Math.floor(Math.random() * 10) + 85;
          surveyData.ocean_extraversion = Math.floor(Math.random() * 20) + 60;
          surveyData.ocean_agreeableness = Math.floor(Math.random() * 20) + 68;
          surveyData.ocean_neuroticism = Math.floor(Math.random() * 20) + 30;
        } else { // Steady Contributor
          surveyData.ocean_openness = Math.floor(Math.random() * 20) + 68;
          surveyData.ocean_conscientiousness = Math.floor(Math.random() * 10) + 85;
          surveyData.ocean_extraversion = Math.floor(Math.random() * 20) + 65;
          surveyData.ocean_agreeableness = Math.floor(Math.random() * 10) + 82;
          surveyData.ocean_neuroticism = Math.floor(Math.random() * 20) + 28;
        }

        // EQ scores based on archetype
        const baseEQ = archetype.name === 'Team Player' ? 88 : 
                       archetype.name === 'Star Performer' ? 85 :
                       archetype.name === 'Technical Specialist' ? 72 :
                       archetype.name === 'Rising Star' ? 78 : 80;
        
        surveyData.eq_score = Math.floor(Math.random() * 10) + baseEQ;
        surveyData.eq_self_awareness = Math.floor(Math.random() * 15) + baseEQ;
        surveyData.eq_self_regulation = Math.floor(Math.random() * 15) + (baseEQ - 5);
        surveyData.eq_motivation = Math.floor(Math.random() * 15) + baseEQ;
        surveyData.eq_empathy = Math.floor(Math.random() * 15) + (archetype.name === 'Team Player' ? 90 : baseEQ - 5);
        surveyData.eq_social_skills = Math.floor(Math.random() * 15) + (archetype.name === 'Team Player' ? 88 : baseEQ - 3);

        // STAR and other scores
        const performanceBase = archetype.name === 'Star Performer' ? 90 : 
                               archetype.name === 'Rising Star' ? 82 :
                               archetype.name === 'Technical Specialist' ? 85 : 78;
        
        surveyData.values_alignment_score = Math.floor(Math.random() * 12) + (performanceBase - 5);
        surveyData.star_situation_score = Math.floor(Math.random() * 12) + performanceBase;
        surveyData.star_task_score = Math.floor(Math.random() * 12) + performanceBase;
        surveyData.star_action_score = Math.floor(Math.random() * 12) + performanceBase;
        surveyData.star_result_score = Math.floor(Math.random() * 12) + performanceBase;
        surveyData.sjt_score = Math.floor(Math.random() * 12) + (performanceBase - 3);

        await supabaseClient.from('candidate_surveys').insert(surveyData);
        stats.surveys++;
      }

      // Create 1-2 applications with realistic scores
      if (jobOpenings && jobOpenings.length > 0) {
        const numApps = Math.floor(Math.random() * 2) + 1;
        const selectedJobs: any[] = getRandomItems(jobOpenings, numApps, numApps);
        
        for (const job of selectedJobs) {
          const { data: existingApp } = await supabaseClient
            .from('applications')
            .select('id')
            .eq('candidate_id', candidate.id)
            .eq('job_opening_id', job.id)
            .maybeSingle();

          if (!existingApp) {
            // Match score based on archetype and role alignment
            const roleMatch = (candidate.current_position || updates.current_position || '').toLowerCase().includes(job.title.toLowerCase().split(' ')[0]);
            let baseMatchScore = roleMatch ? 80 : 65;
            
            if (archetype.name === 'Star Performer') baseMatchScore += 12;
            if (archetype.name === 'Rising Star') baseMatchScore += 8;
            if (archetype.name === 'Technical Specialist' && roleMatch) baseMatchScore += 10;

            const status = ['applied', 'screening', 'screening', 'interviewing', 'interviewing', 'offer'][Math.floor(Math.random() * 6)];
            
            const applicationData = {
              candidate_id: candidate.id,
              job_opening_id: job.id,
              status: status,
              ai_match_score: Math.min(95, Math.floor(Math.random() * 15) + baseMatchScore),
              skill_match_score: Math.min(95, Math.floor(Math.random() * 12) + baseMatchScore),
              culture_fit_score: Math.min(95, Math.floor(Math.random() * 12) + (surveyData?.eq_score || 78)),
              predicted_success: Math.min(95, Math.floor(Math.random() * 15) + baseMatchScore),
              retention_risk: archetype.name === 'Star Performer' ? Math.floor(Math.random() * 20) + 15 :
                             archetype.name === 'Rising Star' ? Math.floor(Math.random() * 15) + 25 :
                             Math.floor(Math.random() * 25) + 30,
              strengths: [
                archetype.name === 'Star Performer' ? 'Exceptional track record of delivery' : 
                archetype.name === 'Team Player' ? 'Outstanding collaboration skills' :
                archetype.name === 'Technical Specialist' ? 'Deep technical expertise' :
                archetype.name === 'Rising Star' ? 'High growth potential and adaptability' :
                archetype.name === 'Creative Innovator' ? 'Innovative problem-solving approach' :
                archetype.name === 'Strategic Thinker' ? 'Strong strategic and analytical capabilities' :
                'Consistent performer with solid experience',
                'Strong cultural alignment',
                'Excellent communication skills'
              ],
              red_flags: Math.random() > 0.85 ? ['May require higher compensation than budgeted'] : [],
              ai_recommendation: baseMatchScore >= 80 ? 'Strongly recommended for immediate interview' :
                                baseMatchScore >= 70 ? 'Recommended for interview' :
                                'Consider for interview based on additional screening',
              applied_date: new Date(Date.now() - Math.random() * 45 * 24 * 60 * 60 * 1000).toISOString()
            };

            await supabaseClient.from('applications').insert(applicationData);
            stats.applications++;

            // Create interview for promising candidates
            if ((status === 'interviewing' || status === 'offer') && (baseMatchScore >= 75 || Math.random() > 0.5)) {
              const interviewTypes = ['technical', 'behavioral', 'cultural_fit', 'technical', 'behavioral'];
              const interviewType = interviewTypes[Math.floor(Math.random() * interviewTypes.length)];
              
              // Some interviews in the past, some scheduled for future
              const isPastInterview = Math.random() > 0.6;
              const interviewDate = isPastInterview 
                ? new Date(Date.now() - Math.random() * 15 * 24 * 60 * 60 * 1000)
                : new Date(Date.now() + Math.random() * 20 * 24 * 60 * 60 * 1000);

              const interviewers = [
                { name: 'Ana García', email: 'ana.garcia@company.com' },
                { name: 'Carlos Ruiz', email: 'carlos.ruiz@company.com' },
                { name: 'María López', email: 'maria.lopez@company.com' },
                { name: 'Diego Martínez', email: 'diego.martinez@company.com' },
                { name: 'Sofia Torres', email: 'sofia.torres@company.com' }
              ];
              const interviewer = interviewers[Math.floor(Math.random() * interviewers.length)];

              const interviewData: any = {
                candidate_id: candidate.id,
                job_opening_id: job.id,
                scheduled_date: interviewDate.toISOString(),
                interview_type: interviewType,
                status: isPastInterview ? 'completed' : 'scheduled',
                interviewer_name: interviewer.name,
                interviewer_email: interviewer.email,
                location: ['Video Call - Zoom', 'Video Call - Google Meet', 'Office - Main Building', 'Video Call - Microsoft Teams'][Math.floor(Math.random() * 4)],
                duration_minutes: [45, 60, 60, 90][Math.floor(Math.random() * 4)],
                created_by: candidate.source_user_id || '8d33cb17-9ab6-48dd-a737-4c6afcd1eee8'
              };

              if (isPastInterview) {
                interviewData.score = Math.floor(Math.random() * 20) + (baseMatchScore - 10);
                interviewData.feedback = [
                  `Strong ${interviewType} skills demonstrated. ${archetype.name} characteristics evident throughout.`,
                  `Excellent performance in ${interviewType} assessment. Highly recommended for next stage.`,
                  `Solid ${interviewType} interview. Shows great potential and cultural fit.`,
                  `Impressive ${interviewType} capabilities. ${archetype.traits}.`
                ][Math.floor(Math.random() * 4)];
              }

              await supabaseClient.from('interviews').insert(interviewData);
              stats.interviews++;
            }
          }
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed: candidates.length,
        stats,
        hasMore: candidates.length === batchSize
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});