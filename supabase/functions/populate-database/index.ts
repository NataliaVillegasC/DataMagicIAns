import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get authenticated user
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    // Get user's profile to get company
    const { data: profile } = await supabase
      .from('profiles')
      .select('company')
      .eq('id', user.id)
      .single();

    const company = profile?.company || 'Default Company';
    const userId = user.id;

    console.log(`Starting population for company: ${company}, user: ${userId}`);

    // Step 1: Create diverse job openings with complete details
    console.log('Step 1: Creating job openings...');
    const jobOpenings = [
      { title: 'Senior Software Engineer', department: 'Engineering', location: 'San Francisco, CA', employment_type: 'full_time', salary_min: 140000, salary_max: 200000, positions_available: 2, status: 'open', description: 'We are seeking an experienced Senior Software Engineer to join our growing team. You will lead the design and development of scalable backend systems, mentor junior developers, and contribute to our technical strategy.', requirements: 'BS in Computer Science or equivalent, 5+ years of professional software development experience, strong system design skills, experience with microservices architecture, excellent communication and leadership abilities', required_skills: ['Python', 'Java', 'AWS', 'Docker', 'Microservices'], nice_to_have_skills: ['React', 'TypeScript', 'Kubernetes', 'GraphQL'] },
      { title: 'Marketing Manager', department: 'Marketing', location: 'New York, NY', employment_type: 'full_time', salary_min: 90000, salary_max: 130000, positions_available: 1, status: 'open', description: 'Lead our marketing initiatives across digital channels. Develop and execute comprehensive marketing campaigns, manage the marketing budget, and drive customer acquisition strategies.', requirements: '5+ years of marketing experience with at least 2 years in a management role, proven track record of successful campaign execution, strong analytical skills, experience with marketing automation platforms', required_skills: ['Digital Marketing', 'SEO', 'Google Analytics', 'Content Strategy', 'Marketing Automation'], nice_to_have_skills: ['Paid Ads', 'HubSpot', 'A/B Testing', 'Conversion Optimization'] },
      { title: 'UX Designer', department: 'Design', location: 'Remote', employment_type: 'full_time', salary_min: 85000, salary_max: 120000, positions_available: 1, status: 'open', description: 'Create intuitive and delightful user experiences for our digital products. Conduct user research, create wireframes and prototypes, and collaborate with product managers and engineers.', requirements: '3+ years of UX design experience, strong portfolio demonstrating user-centered design process, proficiency in modern design tools, understanding of accessibility standards', required_skills: ['Figma', 'User Research', 'Prototyping', 'Wireframing', 'Usability Testing'], nice_to_have_skills: ['Motion Design', 'HTML/CSS', 'Design Systems', 'Sketch'] },
      { title: 'Financial Analyst', department: 'Finance', location: 'Chicago, IL', employment_type: 'full_time', salary_min: 75000, salary_max: 95000, positions_available: 1, status: 'open', description: 'Support strategic financial planning and analysis initiatives. Build financial models, prepare variance analysis, create forecasts, and provide insights to support business decisions.', requirements: 'BS in Finance, Accounting, or Economics, 2+ years of financial analysis experience, advanced Excel skills, strong understanding of financial statements and accounting principles', required_skills: ['Excel', 'Financial Modeling', 'Financial Analysis', 'Forecasting', 'Budget Management'], nice_to_have_skills: ['SQL', 'Tableau', 'PowerBI', 'Python', 'CPA or CFA'] },
      { title: 'Sales Director', department: 'Sales', location: 'Austin, TX', employment_type: 'full_time', salary_min: 120000, salary_max: 180000, positions_available: 1, status: 'open', description: 'Lead and scale our B2B sales organization. Develop sales strategies, build and manage a high-performing sales team, establish key partnerships, and drive revenue growth.', requirements: '7+ years of B2B sales experience with at least 3 years in leadership roles, proven track record of exceeding sales targets, experience building and scaling sales teams, strong negotiation skills', required_skills: ['B2B Sales', 'Sales Leadership', 'CRM Management', 'Pipeline Management', 'Negotiation'], nice_to_have_skills: ['Salesforce', 'SaaS Sales', 'Enterprise Sales', 'Partner Management'] },
      { title: 'Data Scientist', department: 'Data Science', location: 'Seattle, WA', employment_type: 'full_time', salary_min: 130000, salary_max: 180000, positions_available: 1, status: 'open', description: 'Apply advanced analytics and machine learning to solve complex business problems. Build predictive models, perform statistical analysis, and generate actionable insights from large datasets.', requirements: 'MS or PhD in Statistics, Computer Science, Mathematics, or related field, 3+ years of data science experience, strong programming skills in Python or R, experience with machine learning frameworks', required_skills: ['Python', 'Machine Learning', 'SQL', 'Statistical Analysis', 'Data Visualization'], nice_to_have_skills: ['TensorFlow', 'PyTorch', 'AWS', 'Spark', 'Deep Learning'] },
      { title: 'HR Business Partner', department: 'Human Resources', location: 'Boston, MA', employment_type: 'full_time', salary_min: 80000, salary_max: 110000, positions_available: 1, status: 'open', description: 'Partner with business leaders to drive HR strategy and foster a positive workplace culture. Manage employee relations, lead talent acquisition and retention initiatives, oversee performance management processes.', requirements: 'BS in HR, Business, or related field, 4+ years of HR experience as a business partner or generalist, strong knowledge of employment law and HR best practices, experience with HRIS systems', required_skills: ['Employee Relations', 'Talent Management', 'Performance Management', 'Recruitment', 'HR Compliance'], nice_to_have_skills: ['HRIS Systems', 'Change Management', 'Compensation Analysis', 'SHRM-CP'] },
      { title: 'Operations Manager', department: 'Operations', location: 'Denver, CO', employment_type: 'full_time', salary_min: 85000, salary_max: 115000, positions_available: 1, status: 'open', description: 'Drive operational excellence and process optimization across the organization. Manage day-to-day operations, identify improvement opportunities, implement new systems and workflows.', requirements: 'BS in Business, Operations Management, or related field, 5+ years of operations experience, proven track record of process improvement, strong project management skills, experience with Lean or Six Sigma methodologies', required_skills: ['Operations Management', 'Project Management', 'Process Improvement', 'Supply Chain', 'KPI Tracking'], nice_to_have_skills: ['Lean Six Sigma', 'ERP Systems', 'Data Analysis', 'Change Management'] },
      { title: 'Content Writer', department: 'Marketing', location: 'Remote', employment_type: 'contract', salary_min: 60000, salary_max: 80000, positions_available: 2, status: 'open', description: 'Create compelling content that engages our audience and drives conversions. Write blog posts, whitepapers, case studies, email campaigns, and website copy. Optimize content for SEO.', requirements: 'BA in English, Journalism, Communications, or related field, 2+ years of professional writing experience, strong portfolio of published work, excellent grammar and editing skills, understanding of SEO best practices', required_skills: ['Content Writing', 'SEO Writing', 'Research', 'Copywriting', 'Editing'], nice_to_have_skills: ['WordPress', 'Content Management Systems', 'Social Media', 'HTML Basics'] },
      { title: 'DevOps Engineer', department: 'Engineering', location: 'Portland, OR', employment_type: 'full_time', salary_min: 120000, salary_max: 160000, positions_available: 1, status: 'open', description: 'Build and maintain our cloud infrastructure and CI/CD pipelines. Ensure system reliability, security, and scalability. Automate deployment processes and monitor system performance.', requirements: 'BS in Computer Science or equivalent, 4+ years of DevOps or infrastructure engineering experience, strong knowledge of cloud platforms, experience with containerization and orchestration, proficiency in scripting languages', required_skills: ['AWS', 'Kubernetes', 'Docker', 'CI/CD', 'Infrastructure as Code'], nice_to_have_skills: ['Terraform', 'Ansible', 'Monitoring Tools', 'Python', 'Jenkins'] },
      { title: 'Product Manager', department: 'Product', location: 'San Francisco, CA', employment_type: 'full_time', salary_min: 110000, salary_max: 150000, positions_available: 1, status: 'open', description: 'Drive product strategy and roadmap for our core platform. Work with engineering, design, and business stakeholders to define requirements, prioritize features, and ship products that delight users.', requirements: 'BS in Computer Science, Business, or related field, 4+ years of product management experience, proven ability to ship successful products, strong analytical and problem-solving skills, excellent communication and leadership abilities', required_skills: ['Product Management', 'Product Strategy', 'Agile', 'User Stories', 'Data Analysis'], nice_to_have_skills: ['SQL', 'A/B Testing', 'Roadmapping Tools', 'Technical Background'] },
      { title: 'Registered Nurse', department: 'Healthcare', location: 'Miami, FL', employment_type: 'full_time', salary_min: 65000, salary_max: 85000, positions_available: 3, status: 'open', description: 'Provide high-quality patient care in a fast-paced clinical environment. Assess patient conditions, administer medications, coordinate with physicians and healthcare team, educate patients and families.', requirements: 'Valid RN license, BSN or ADN degree, BLS certification, 1+ years of clinical nursing experience preferred, strong clinical assessment skills, excellent communication and compassion', required_skills: ['Patient Care', 'Clinical Assessment', 'Medical Documentation', 'IV Therapy', 'Emergency Response'], nice_to_have_skills: ['ACLS Certification', 'Specialty Certifications', 'EMR Systems', 'Case Management'] },
      { title: 'Mechanical Engineer', department: 'Engineering', location: 'Detroit, MI', employment_type: 'full_time', salary_min: 75000, salary_max: 105000, positions_available: 1, status: 'open', description: 'Design and develop mechanical systems and components for innovative products. Create CAD models, perform simulations and analysis, prototype designs, and collaborate with cross-functional teams.', requirements: 'BS in Mechanical Engineering, 3+ years of mechanical design experience, proficiency in CAD software, understanding of manufacturing processes, strong analytical and problem-solving skills, FE or PE license preferred', required_skills: ['CAD Design', 'SolidWorks', 'FEA Analysis', 'Manufacturing Processes', 'Technical Documentation'], nice_to_have_skills: ['AutoCAD', 'GD&T', 'Materials Science', 'Project Management', 'PE License'] },
      { title: 'Legal Counsel', department: 'Legal', location: 'Washington, DC', employment_type: 'full_time', salary_min: 120000, salary_max: 170000, positions_available: 1, status: 'open', description: 'Provide legal guidance on corporate matters, contracts, compliance, and regulatory issues. Draft and negotiate commercial agreements, support M&A activities, advise on intellectual property matters.', requirements: 'JD degree from accredited law school, active bar membership, 5+ years of corporate law experience, expertise in contract negotiation and corporate governance, excellent analytical and communication skills', required_skills: ['Corporate Law', 'Contract Negotiation', 'Legal Compliance', 'Risk Management', 'Legal Research'], nice_to_have_skills: ['M&A Experience', 'IP Law', 'Employment Law', 'Securities Law'] },
      { title: 'Executive Chef', department: 'Culinary', location: 'Las Vegas, NV', employment_type: 'full_time', salary_min: 70000, salary_max: 95000, positions_available: 1, status: 'open', description: 'Lead kitchen operations for our upscale restaurant. Create innovative menus, manage culinary team, ensure food quality and consistency, control costs and inventory, maintain health and safety standards.', requirements: 'Culinary degree or equivalent training, 7+ years of professional cooking experience with 3+ years in leadership roles, expertise in multiple cuisines, strong leadership and team management skills, knowledge of food safety regulations', required_skills: ['Culinary Arts', 'Menu Development', 'Kitchen Management', 'Food Safety', 'Cost Control'], nice_to_have_skills: ['Fine Dining', 'International Cuisines', 'Wine Pairing', 'ServSafe Certified'] }
    ].map(job => ({
      ...job,
      company,
      created_by: userId,
      required_skills: JSON.stringify(job.required_skills),
      nice_to_have_skills: JSON.stringify(job.nice_to_have_skills)
    }));

    const { data: createdJobs, error: jobsError } = await supabase
      .from('job_openings')
      .insert(jobOpenings)
      .select();

    if (jobsError) throw jobsError;
    console.log(`Created ${createdJobs.length} job openings`);

    // Step 2: Create diverse candidates
    console.log('Step 2: Creating candidates...');
    const candidateData = [
      { full_name: 'Sarah Chen', email: 'sarah.chen@email.com', phone: '+1-415-555-0101', location: 'San Francisco, CA', current_position: 'Senior Software Engineer', current_company: 'Tech Corp', years_experience: 7, status: 'active', linkedin_url: 'https://linkedin.com/in/sarahchen', github_url: 'https://github.com/sarahchen', availability: 'Available immediately', extracted_skills: ['Python', 'Java', 'AWS', 'Docker', 'Microservices', 'React'] },
      { full_name: 'Michael Rodriguez', email: 'mrodriguez@email.com', phone: '+1-212-555-0102', location: 'New York, NY', current_position: 'Marketing Manager', current_company: 'Brand Co', years_experience: 6, status: 'active', linkedin_url: 'https://linkedin.com/in/michaelrodriguez', availability: '2 weeks notice', extracted_skills: ['Digital Marketing', 'SEO', 'Google Analytics', 'Content Strategy', 'Marketing Automation'] },
      { full_name: 'Emily Watson', email: 'ewatson@email.com', phone: '+1-206-555-0103', location: 'Seattle, WA', current_position: 'Data Scientist', current_company: 'Data Co', years_experience: 4, status: 'active', linkedin_url: 'https://linkedin.com/in/emilywatson', portfolio_url: 'https://emilywatson.com', availability: 'Available immediately', extracted_skills: ['Python', 'Machine Learning', 'SQL', 'Statistical Analysis', 'TensorFlow'] },
      { full_name: 'David Kim', email: 'dkim@email.com', phone: '+1-646-555-0104', location: 'New York, NY', current_position: 'UX Designer', current_company: 'Design Studio', years_experience: 5, status: 'active', linkedin_url: 'https://linkedin.com/in/davidkim', portfolio_url: 'https://davidkimdesign.com', availability: '1 month notice', extracted_skills: ['Figma', 'User Research', 'Prototyping', 'Wireframing', 'Usability Testing'] },
      { full_name: 'Jessica Brown', email: 'jbrown@email.com', phone: '+1-512-555-0105', location: 'Austin, TX', current_position: 'Sales Director', current_company: 'Sales Co', years_experience: 10, status: 'active', linkedin_url: 'https://linkedin.com/in/jessicabrown', availability: 'Available immediately', extracted_skills: ['B2B Sales', 'Sales Leadership', 'CRM Management', 'Pipeline Management', 'Negotiation'] },
      { full_name: 'Alex Turner', email: 'aturner@email.com', phone: '+1-503-555-0106', location: 'Portland, OR', current_position: 'DevOps Engineer', current_company: 'Cloud Tech', years_experience: 5, status: 'active', linkedin_url: 'https://linkedin.com/in/alexturner', github_url: 'https://github.com/alexturner', availability: '2 weeks notice', extracted_skills: ['AWS', 'Kubernetes', 'Docker', 'CI/CD', 'Terraform'] },
      { full_name: 'Nina Patel', email: 'npatel@email.com', phone: '+1-415-555-0107', location: 'San Francisco, CA', current_position: 'Product Manager', current_company: 'Product Co', years_experience: 6, status: 'active', linkedin_url: 'https://linkedin.com/in/ninapatel', availability: 'Available immediately', extracted_skills: ['Product Management', 'Product Strategy', 'Agile', 'User Stories', 'Data Analysis'] },
      { full_name: 'Robert Chang', email: 'rchang@email.com', phone: '+1-312-555-0108', location: 'Chicago, IL', current_position: 'Financial Analyst', current_company: 'Finance Corp', years_experience: 4, status: 'active', linkedin_url: 'https://linkedin.com/in/robertchang', availability: '2 weeks notice', extracted_skills: ['Excel', 'Financial Modeling', 'Financial Analysis', 'Forecasting', 'SQL'] },
      { full_name: 'Amanda Foster', email: 'afoster@email.com', phone: '+1-617-555-0109', location: 'Boston, MA', current_position: 'HR Business Partner', current_company: 'HR Solutions', years_experience: 7, status: 'active', linkedin_url: 'https://linkedin.com/in/amandafoster', availability: '1 month notice', extracted_skills: ['Employee Relations', 'Talent Management', 'Performance Management', 'Recruitment', 'HR Compliance'] },
      { full_name: 'Thomas Miller', email: 'tmiller@email.com', phone: '+1-512-555-0110', location: 'Austin, TX', current_position: 'Content Writer', current_company: 'Media Hub', years_experience: 3, status: 'active', linkedin_url: 'https://linkedin.com/in/thomasmiller', portfolio_url: 'https://thomasmillerwrites.com', availability: 'Available immediately', extracted_skills: ['Content Writing', 'SEO Writing', 'Research', 'Copywriting', 'WordPress'] },
      { full_name: 'Lisa Anderson', email: 'landerson@email.com', phone: '+1-303-555-0111', location: 'Denver, CO', current_position: 'Operations Manager', current_company: 'Logistics Corp', years_experience: 8, status: 'active', linkedin_url: 'https://linkedin.com/in/lisaanderson', availability: '2 weeks notice', extracted_skills: ['Operations Management', 'Project Management', 'Process Improvement', 'Supply Chain', 'Lean Six Sigma'] },
      { full_name: 'Jennifer Martinez', email: 'jmartinez@email.com', phone: '+1-617-555-0112', location: 'Boston, MA', current_position: 'Business Analyst', current_company: 'Consulting Group', years_experience: 4, status: 'active', linkedin_url: 'https://linkedin.com/in/jennifermartinez', availability: 'Available immediately', extracted_skills: ['Business Analysis', 'SQL', 'Tableau', 'Requirements Gathering', 'Process Mapping'] },
      { full_name: 'Daniel Lee', email: 'dlee@email.com', phone: '+1-303-555-0113', location: 'Denver, CO', current_position: 'QA Engineer', current_company: 'Testing Corp', years_experience: 5, status: 'active', linkedin_url: 'https://linkedin.com/in/daniellee', github_url: 'https://github.com/daniellee', availability: '2 weeks notice', extracted_skills: ['Test Automation', 'Selenium', 'Python', 'QA Strategy', 'Performance Testing'] },
      { full_name: 'Michelle Wilson', email: 'mwilson@email.com', phone: '+1-858-555-0114', location: 'San Diego, CA', current_position: 'Technical Writer', current_company: 'Docu Tech', years_experience: 4, status: 'active', linkedin_url: 'https://linkedin.com/in/michellewilson', availability: 'Available immediately', extracted_skills: ['Technical Writing', 'Documentation', 'API Documentation', 'User Guides', 'Markdown'] },
      { full_name: 'Chris Taylor', email: 'ctaylor@email.com', phone: '+1-858-555-0115', location: 'San Diego, CA', current_position: 'Security Analyst', current_company: 'Cyber Sec', years_experience: 5, status: 'active', linkedin_url: 'https://linkedin.com/in/christaylor', availability: '1 month notice', extracted_skills: ['Cybersecurity', 'Penetration Testing', 'Risk Assessment', 'Security Auditing', 'SIEM'] },
      { full_name: 'Priya Sharma', email: 'psharma@email.com', phone: '+1-408-555-0116', location: 'San Jose, CA', current_position: 'Customer Success Manager', current_company: 'SaaS Company', years_experience: 4, status: 'active', linkedin_url: 'https://linkedin.com/in/priyasharma', availability: '2 weeks notice', extracted_skills: ['Customer Success', 'Account Management', 'Client Relations', 'Onboarding', 'Retention'] },
      { full_name: 'James Thompson', email: 'jthompson@email.com', phone: '+1-971-555-0117', location: 'Portland, OR', current_position: 'Network Engineer', current_company: 'Network Corp', years_experience: 6, status: 'active', linkedin_url: 'https://linkedin.com/in/jamesthompson', availability: 'Available immediately', extracted_skills: ['Networking', 'Cisco', 'Routing', 'Network Security', 'TCP/IP'] },
      { full_name: 'Olivia Garcia', email: 'ogarcia@email.com', phone: '+1-858-555-0118', location: 'San Diego, CA', current_position: 'Graphic Designer', current_company: 'Creative Studio', years_experience: 3, status: 'active', linkedin_url: 'https://linkedin.com/in/oliviagarcia', portfolio_url: 'https://oliviagarcia.design', availability: 'Available immediately', extracted_skills: ['Graphic Design', 'Adobe Illustrator', 'Adobe Photoshop', 'Branding', 'Typography'] },
      { full_name: 'Kevin Johnson', email: 'kjohnson@email.com', phone: '+1-720-555-0119', location: 'Denver, CO', current_position: 'Social Media Manager', current_company: 'Social Co', years_experience: 4, status: 'active', linkedin_url: 'https://linkedin.com/in/kevinjohnson', availability: '2 weeks notice', extracted_skills: ['Social Media', 'Content Creation', 'Community Management', 'Social Analytics', 'Influencer Marketing'] },
      { full_name: 'Rachel Green', email: 'rgreen@email.com', phone: '+1-425-555-0120', location: 'Seattle, WA', current_position: 'Legal Counsel', current_company: 'Law Firm', years_experience: 7, status: 'active', linkedin_url: 'https://linkedin.com/in/rachelgreen', availability: '1 month notice', extracted_skills: ['Corporate Law', 'Contract Negotiation', 'Legal Compliance', 'Risk Management', 'Legal Research'] },
      { full_name: 'Brandon White', email: 'bwhite@email.com', phone: '+1-480-555-0121', location: 'Phoenix, AZ', current_position: 'Training Coordinator', current_company: 'Training Co', years_experience: 3, status: 'active', linkedin_url: 'https://linkedin.com/in/brandonwhite', availability: 'Available immediately', extracted_skills: ['Training Development', 'Instructional Design', 'LMS Administration', 'E-Learning', 'Training Delivery'] },
      { full_name: 'Samantha Davis', email: 'sdavis@email.com', phone: '+1-214-555-0122', location: 'Dallas, TX', current_position: 'Email Marketing Specialist', current_company: 'Marketing Hub', years_experience: 3, status: 'active', linkedin_url: 'https://linkedin.com/in/samanthadavis', availability: '2 weeks notice', extracted_skills: ['Email Marketing', 'Mailchimp', 'Campaign Management', 'A/B Testing', 'Marketing Analytics'] },
      { full_name: 'Eric Martinez', email: 'emartinez@email.com', phone: '+1-713-555-0123', location: 'Houston, TX', current_position: 'Database Administrator', current_company: 'Data Systems', years_experience: 6, status: 'active', linkedin_url: 'https://linkedin.com/in/ericmartinez', availability: 'Available immediately', extracted_skills: ['SQL', 'PostgreSQL', 'Database Design', 'Performance Tuning', 'Backup Recovery'] },
      { full_name: 'Hannah Moore', email: 'hmoore@email.com', phone: '+1-404-555-0124', location: 'Atlanta, GA', current_position: 'Event Coordinator', current_company: 'Events Co', years_experience: 4, status: 'active', linkedin_url: 'https://linkedin.com/in/hannahmoore', availability: '2 weeks notice', extracted_skills: ['Event Planning', 'Vendor Management', 'Budget Management', 'Event Marketing', 'Logistics Coordination'] },
      { full_name: 'Ryan Clark', email: 'rclark@email.com', phone: '+1-503-555-0125', location: 'Portland, OR', current_position: 'Mobile Developer', current_company: 'App Studio', years_experience: 5, status: 'active', linkedin_url: 'https://linkedin.com/in/ryanclark', github_url: 'https://github.com/ryanclark', availability: 'Available immediately', extracted_skills: ['React Native', 'iOS', 'Android', 'Mobile UI', 'App Deployment'] },
      { full_name: 'Victoria Lewis', email: 'vlewis@email.com', phone: '+1-619-555-0126', location: 'San Diego, CA', current_position: 'Scrum Master', current_company: 'Agile Co', years_experience: 6, status: 'active', linkedin_url: 'https://linkedin.com/in/victorialewis', availability: '1 month notice', extracted_skills: ['Agile', 'Scrum', 'JIRA', 'Sprint Planning', 'Team Facilitation'] },
      { full_name: 'Gregory Adams', email: 'gadams@email.com', phone: '+1-916-555-0127', location: 'Sacramento, CA', current_position: 'System Administrator', current_company: 'IT Services', years_experience: 7, status: 'active', linkedin_url: 'https://linkedin.com/in/gregoryadams', availability: '2 weeks notice', extracted_skills: ['Linux', 'Windows Server', 'Active Directory', 'System Monitoring', 'Backup Solutions'] },
      { full_name: 'Ashley Roberts', email: 'aroberts@email.com', phone: '+1-602-555-0128', location: 'Phoenix, AZ', current_position: 'Business Development Manager', current_company: 'Growth Co', years_experience: 6, status: 'active', linkedin_url: 'https://linkedin.com/in/ashleyroberts', availability: 'Available immediately', extracted_skills: ['Business Development', 'Sales', 'Partnerships', 'Market Research', 'Proposal Writing'] },
      { full_name: 'Marcus Johnson', email: 'mjohnson@email.com', phone: '+1-801-555-0129', location: 'Salt Lake City, UT', current_position: 'Quality Assurance Lead', current_company: 'Software Co', years_experience: 8, status: 'active', linkedin_url: 'https://linkedin.com/in/marcusjohnson', availability: '2 weeks notice', extracted_skills: ['QA', 'Test Management', 'Automation', 'Test Strategy', 'Quality Metrics'] },
      { full_name: 'Sophia Turner', email: 'sturner@email.com', phone: '+1-702-555-0130', location: 'Las Vegas, NV', current_position: 'Front-end Developer', current_company: 'Web Agency', years_experience: 4, status: 'active', linkedin_url: 'https://linkedin.com/in/sophiaturner', github_url: 'https://github.com/sophiaturner', portfolio_url: 'https://sophiaturner.dev', availability: 'Available immediately', extracted_skills: ['React', 'JavaScript', 'CSS', 'HTML', 'TypeScript', 'Responsive Design'] },
      { full_name: 'Carlos Mendez', email: 'cmendez@email.com', phone: '+1-305-555-0131', location: 'Miami, FL', current_position: 'Registered Nurse', current_company: 'Miami Medical Center', years_experience: 5, status: 'active', linkedin_url: 'https://linkedin.com/in/carlosmendez', availability: '1 month notice', extracted_skills: ['Patient Care', 'Clinical Assessment', 'Medical Documentation', 'IV Therapy', 'Emergency Response'] },
      { full_name: 'Patricia Wong', email: 'pwong@email.com', phone: '+1-313-555-0132', location: 'Detroit, MI', current_position: 'Mechanical Engineer', current_company: 'Auto Innovations', years_experience: 6, status: 'active', linkedin_url: 'https://linkedin.com/in/patriciawong', availability: '2 weeks notice', extracted_skills: ['CAD Design', 'SolidWorks', 'FEA Analysis', 'Manufacturing Processes', 'Technical Documentation'] },
      { full_name: 'Matthew Harris', email: 'mharris@email.com', phone: '+1-202-555-0133', location: 'Washington, DC', current_position: 'Policy Analyst', current_company: 'Think Tank', years_experience: 4, status: 'active', linkedin_url: 'https://linkedin.com/in/matthewharris', availability: 'Available immediately', extracted_skills: ['Policy Analysis', 'Research', 'Report Writing', 'Data Analysis', 'Public Policy'] },
      { full_name: 'Isabella Rossi', email: 'irossi@email.com', phone: '+1-702-555-0134', location: 'Las Vegas, NV', current_position: 'Executive Chef', current_company: 'The Culinary', years_experience: 12, status: 'active', linkedin_url: 'https://linkedin.com/in/isabellarossi', availability: '1 month notice', extracted_skills: ['Culinary Arts', 'Menu Development', 'Kitchen Management', 'Food Safety', 'Cost Control'] },
      { full_name: 'Andrew Mitchell', email: 'amitchell@email.com', phone: '+1-404-555-0135', location: 'Atlanta, GA', current_position: 'Supply Chain Manager', current_company: 'Logistics Solutions', years_experience: 7, status: 'active', linkedin_url: 'https://linkedin.com/in/andrewmitchell', availability: '2 weeks notice', extracted_skills: ['Supply Chain Management', 'Procurement', 'Inventory Management', 'Vendor Relations', 'Logistics Planning'] }
    ].map(c => ({
      ...c,
      company,
      source_user_id: userId,
      extracted_skills: JSON.stringify(c.extracted_skills)
    }));

    const { data: createdCandidates, error: candidatesError } = await supabase
      .from('candidates')
      .insert(candidateData)
      .select();

    if (candidatesError) throw candidatesError;
    console.log(`Created ${createdCandidates.length} candidates`);

    // Step 3: Create surveys (80% of candidates)
    const surveyCount = Math.floor(createdCandidates.length * 0.8);
    const surveysToCreate = createdCandidates.slice(0, surveyCount).map(c => ({
      candidate_id: c.id,
      survey_token: crypto.randomUUID(),
      completed: true,
      completed_at: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
      ocean_openness: Math.floor(Math.random() * 40) + 60,
      ocean_conscientiousness: Math.floor(Math.random() * 40) + 60,
      ocean_extraversion: Math.floor(Math.random() * 50) + 50,
      ocean_agreeableness: Math.floor(Math.random() * 40) + 60,
      ocean_neuroticism: Math.floor(Math.random() * 50) + 25,
      eq_score: Math.floor(Math.random() * 30) + 70,
      eq_self_awareness: Math.floor(Math.random() * 30) + 70,
      eq_self_regulation: Math.floor(Math.random() * 30) + 70,
      eq_motivation: Math.floor(Math.random() * 30) + 70,
      eq_empathy: Math.floor(Math.random() * 30) + 70,
      eq_social_skills: Math.floor(Math.random() * 30) + 70
    }));

    const { data: createdSurveys, error: surveysError } = await supabase
      .from('candidate_surveys')
      .insert(surveysToCreate)
      .select();

    if (surveysError) throw surveysError;
    console.log(`Created ${createdSurveys.length} surveys`);

    // Step 4: Create applications (1.5 per candidate, random distribution)
    const applicationsToCreate: Array<{
      candidate_id: string;
      job_opening_id: string;
      status: string;
      applied_date: string;
      ai_match_score: number;
      skill_match_score: number;
      culture_fit_score: number;
    }> = [];
    const targetApps = Math.floor(createdCandidates.length * 1.5);
    
    for (let i = 0; i < targetApps; i++) {
      const candidate = createdCandidates[Math.floor(Math.random() * createdCandidates.length)];
      const job = createdJobs[Math.floor(Math.random() * createdJobs.length)];
      
      // Check if this combination already exists
      const exists = applicationsToCreate.find(
        app => app.candidate_id === candidate.id && app.job_opening_id === job.id
      );
      
      if (!exists) {
        applicationsToCreate.push({
          candidate_id: candidate.id,
          job_opening_id: job.id,
          status: ['applied', 'screening', 'interviewing', 'offered'][Math.floor(Math.random() * 4)],
          applied_date: new Date(Date.now() - Math.random() * 60 * 24 * 60 * 60 * 1000).toISOString(),
          ai_match_score: Math.floor(Math.random() * 40) + 60,
          skill_match_score: Math.floor(Math.random() * 40) + 60,
          culture_fit_score: Math.floor(Math.random() * 40) + 60
        });
      }
    }

    const { data: createdApplications, error: appsError } = await supabase
      .from('applications')
      .insert(applicationsToCreate)
      .select();

    if (appsError) throw appsError;
    console.log(`Created ${createdApplications.length} applications`);

    // Step 5: Create interviews (10% of applications, ensure no date overlaps)
    const interviewCount = Math.floor(createdApplications.length * 0.1);
    const interviewsToCreate = [];
    let dayOffset = 1;
    
    for (let i = 0; i < interviewCount; i++) {
      const app = createdApplications[i];
      const interviewTypes = ['phone', 'video', 'onsite'];
      
      interviewsToCreate.push({
        candidate_id: app.candidate_id,
        job_opening_id: app.job_opening_id,
        interview_type: interviewTypes[Math.floor(Math.random() * interviewTypes.length)],
        status: 'scheduled',
        scheduled_date: new Date(Date.now() + dayOffset * 24 * 60 * 60 * 1000).toISOString(),
        duration_minutes: 60,
        location: 'Virtual - Zoom',
        interviewer_name: 'Hiring Manager',
        interviewer_email: 'hiring@company.com',
        created_by: userId
      });
      
      dayOffset++; // Each interview on a different day to avoid overlaps
    }

    const { data: createdInterviews, error: interviewsError } = await supabase
      .from('interviews')
      .insert(interviewsToCreate)
      .select();

    if (interviewsError) throw interviewsError;
    console.log(`Created ${createdInterviews.length} interviews`);

    return new Response(
      JSON.stringify({
        success: true,
        stats: {
          jobOpenings: createdJobs.length,
          candidates: createdCandidates.length,
          surveys: createdSurveys.length,
          applications: createdApplications.length,
          interviews: createdInterviews.length
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
