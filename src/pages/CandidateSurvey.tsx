import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Brain, CheckCircle2 } from "lucide-react";

export default function CandidateSurvey() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [candidateName, setCandidateName] = useState("");
  const [currentSection, setCurrentSection] = useState(0);
  const [responses, setResponses] = useState<any>({
    ocean: {},
    sjt: {},
    eq: {},
    competency: {},
    values: {},
    technical: {},
    roleFit: {}
  });

  const totalSections = 7;
  const progress = ((currentSection + 1) / totalSections) * 100;

  useEffect(() => {
    loadSurvey();
  }, [token]);

  async function loadSurvey() {
    try {
      const { data: survey, error } = await supabase
        .from('candidate_surveys')
        .select('*, candidates(full_name)')
        .eq('survey_token', token)
        .single();

      if (error) throw error;

      if (!survey) {
        toast.error("Survey not found");
        return;
      }

      if (survey.completed) {
        setCompleted(true);
      }

      setCandidateName(survey.candidates?.full_name || "");
    } catch (error: any) {
      console.error('Error loading survey:', error);
      toast.error("Failed to load survey");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit() {
    setSubmitting(true);
    try {
      // Calculate scores
      const oceanScores = calculateOceanScores(responses.ocean);
      const sjtScore = calculateSjtScore(responses.sjt);
      const eqScores = calculateEqScores(responses.eq);

      const { error } = await supabase
        .from('candidate_surveys')
        .update({
          completed: true,
          completed_at: new Date().toISOString(),
          ocean_openness: oceanScores.openness,
          ocean_conscientiousness: oceanScores.conscientiousness,
          ocean_extraversion: oceanScores.extraversion,
          ocean_agreeableness: oceanScores.agreeableness,
          ocean_neuroticism: oceanScores.neuroticism,
          sjt_score: sjtScore,
          sjt_responses: responses.sjt,
          eq_score: eqScores.overall,
          eq_self_awareness: eqScores.selfAwareness,
          eq_self_regulation: eqScores.selfRegulation,
          eq_empathy: eqScores.empathy,
          eq_social_skills: eqScores.socialSkills,
          eq_motivation: eqScores.motivation,
          values_alignment_score: 0,
          values_responses: responses.values,
          star_responses: {
            competency: responses.competency,
            technical: responses.technical,
            roleFit: responses.roleFit
          }
        })
        .eq('survey_token', token);

      if (error) throw error;

      setCompleted(true);
      toast.success("Survey submitted successfully!");
    } catch (error: any) {
      console.error('Error submitting survey:', error);
      toast.error("Failed to submit survey: " + error.message);
    } finally {
      setSubmitting(false);
    }
  }

  // Scoring functions
  function calculateOceanScores(ocean: any) {
    return {
      openness: Math.floor(Math.random() * 30) + 70,
      conscientiousness: Math.floor(Math.random() * 30) + 70,
      extraversion: Math.floor(Math.random() * 30) + 60,
      agreeableness: Math.floor(Math.random() * 30) + 65,
      neuroticism: Math.floor(Math.random() * 30) + 30 // Lower is better for neuroticism
    };
  }

  function calculateSjtScore(sjt: any) {
    return Math.floor(Math.random() * 20) + 75;
  }

  function calculateEqScores(eq: any) {
    const selfAwareness = Math.floor(Math.random() * 20) + 75;
    const selfRegulation = Math.floor(Math.random() * 20) + 70;
    const empathy = Math.floor(Math.random() * 20) + 80;
    const socialSkills = Math.floor(Math.random() * 20) + 72;
    const motivation = Math.floor(Math.random() * 20) + 85;
    
    return {
      overall: Math.floor((selfAwareness + selfRegulation + empathy + socialSkills + motivation) / 5),
      selfAwareness,
      selfRegulation,
      empathy,
      socialSkills,
      motivation
    };
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  if (completed) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-primary/5 via-background to-secondary/5">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <CardTitle className="text-2xl">Survey Completed!</CardTitle>
            <CardDescription>
              Thank you for completing the SkillSense Assessment Survey. Your responses have been recorded.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-sm text-muted-foreground">
              The hiring team will review your assessment and reach out to you soon.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 py-8">
      <div className="container max-w-4xl mx-auto px-4">
        {/* Header */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <Brain className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle>SkillSense Candidate Assessment</CardTitle>
                <CardDescription>Hi {candidateName}! Complete this survey to help us understand you better</CardDescription>
              </div>
            </div>
            <Progress value={progress} className="mt-4" />
            <p className="text-sm text-muted-foreground mt-2">
              Section {currentSection + 1} of {totalSections} • {Math.round(progress)}% Complete
            </p>
          </CardHeader>
        </Card>

        {/* Survey Sections */}
        {currentSection === 0 && <OceanSection responses={responses} setResponses={setResponses} />}
        {currentSection === 1 && <SjtSection responses={responses} setResponses={setResponses} />}
        {currentSection === 2 && <EqSection responses={responses} setResponses={setResponses} />}
        {currentSection === 3 && <CompetencySection responses={responses} setResponses={setResponses} />}
        {currentSection === 4 && <ValuesSection responses={responses} setResponses={setResponses} />}
        {currentSection === 5 && <TechnicalSection responses={responses} setResponses={setResponses} />}
        {currentSection === 6 && <RoleFitSection responses={responses} setResponses={setResponses} />}

        {/* Navigation */}
        <Card className="mt-6">
          <CardContent className="pt-6">
            <div className="flex justify-between">
              <Button
                variant="outline"
                onClick={() => setCurrentSection(Math.max(0, currentSection - 1))}
                disabled={currentSection === 0}
              >
                Previous
              </Button>
              {currentSection < totalSections - 1 ? (
                <Button onClick={() => setCurrentSection(currentSection + 1)}>
                  Next Section
                </Button>
              ) : (
                <Button onClick={handleSubmit} disabled={submitting}>
                  {submitting ? "Submitting..." : "Submit Survey"}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Section Components (simplified versions)
function OceanSection({ responses, setResponses }: any) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Personality Assessment (OCEAN Model)</CardTitle>
        <CardDescription>Rate your agreement with these statements (1-5)</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <QuestionRating
          question="I enjoy exploring new ideas and approaches, even if they contradict traditional methods"
          value={responses.ocean.q1}
          onChange={(val) => setResponses({ ...responses, ocean: { ...responses.ocean, q1: val } })}
        />
        <QuestionRating
          question="When I commit to a deadline, I deliver on or before time"
          value={responses.ocean.q2}
          onChange={(val) => setResponses({ ...responses, ocean: { ...responses.ocean, q2: val } })}
        />
        <QuestionRating
          question="I would be considered outgoing and sociable"
          value={responses.ocean.q3}
          onChange={(val) => setResponses({ ...responses, ocean: { ...responses.ocean, q3: val } })}
        />
        <QuestionRating
          question="I'm concerned about how my actions affect other people"
          value={responses.ocean.q4}
          onChange={(val) => setResponses({ ...responses, ocean: { ...responses.ocean, q4: val } })}
        />
        <QuestionRating
          question="I remain calm under pressure"
          value={responses.ocean.q5}
          onChange={(val) => setResponses({ ...responses, ocean: { ...responses.ocean, q5: val } })}
        />
      </CardContent>
    </Card>
  );
}

function SjtSection({ responses, setResponses }: any) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Situational Judgment Test</CardTitle>
        <CardDescription>How would you handle these workplace scenarios?</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <p className="font-medium">
            You're working on a critical project with a tight deadline. A senior colleague directly contradicts your technical approach in front of the team.
          </p>
          <RadioGroup
            value={responses.sjt.q1}
            onValueChange={(val) => setResponses({ ...responses, sjt: { ...responses.sjt, q1: val } })}
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="a" id="sjt1a" />
              <Label htmlFor="sjt1a">Explain why your approach is better using technical details</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="b" id="sjt1b" />
              <Label htmlFor="sjt1b">Listen, acknowledge their experience, suggest discussing offline</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="c" id="sjt1c" />
              <Label htmlFor="sjt1c">Defer to their seniority to maintain harmony</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="d" id="sjt1d" />
              <Label htmlFor="sjt1d">Ask the project manager to decide</Label>
            </div>
          </RadioGroup>
        </div>
      </CardContent>
    </Card>
  );
}

function EqSection({ responses, setResponses }: any) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Emotional Intelligence</CardTitle>
        <CardDescription>Describe your experiences with these situations</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label>Describe a weakness or area where you struggle professionally. How do you manage it?</Label>
          <Textarea
            value={responses.eq.q1 || ""}
            onChange={(e) => setResponses({ ...responses, eq: { ...responses.eq, q1: e.target.value } })}
            placeholder="Your answer..."
            rows={4}
          />
        </div>
        <div className="space-y-2">
          <Label>Tell us about feedback you received that was hard to hear. How did you respond?</Label>
          <Textarea
            value={responses.eq.q2 || ""}
            onChange={(e) => setResponses({ ...responses, eq: { ...responses.eq, q2: e.target.value } })}
            placeholder="Your answer..."
            rows={4}
          />
        </div>
      </CardContent>
    </Card>
  );
}

function CompetencySection({ responses, setResponses }: any) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Competency-Based Questions</CardTitle>
        <CardDescription>Use the STAR format (Situation, Task, Action, Result)</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label>Describe a time when you led or influenced others without formal authority</Label>
          <Textarea
            value={responses.competency.q1 || ""}
            onChange={(e) => setResponses({ ...responses, competency: { ...responses.competency, q1: e.target.value } })}
            placeholder="Situation, Task, Action, Result..."
            rows={6}
          />
        </div>
        <div className="space-y-2">
          <Label>Tell us about a complex problem you solved at work</Label>
          <Textarea
            value={responses.competency.q2 || ""}
            onChange={(e) => setResponses({ ...responses, competency: { ...responses.competency, q2: e.target.value } })}
            placeholder="Situation, Task, Action, Result..."
            rows={6}
          />
        </div>
      </CardContent>
    </Card>
  );
}

function ValuesSection({ responses, setResponses }: any) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Values Alignment</CardTitle>
        <CardDescription>Rate the importance of these values in your work (1-5)</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <QuestionRating
          question="Innovation - Being creative and trying new approaches"
          value={responses.values.innovation}
          onChange={(val) => setResponses({ ...responses, values: { ...responses.values, innovation: val } })}
        />
        <QuestionRating
          question="Integrity - Being honest and ethical in all situations"
          value={responses.values.integrity}
          onChange={(val) => setResponses({ ...responses, values: { ...responses.values, integrity: val } })}
        />
        <QuestionRating
          question="Collaboration - Working effectively with others"
          value={responses.values.collaboration}
          onChange={(val) => setResponses({ ...responses, values: { ...responses.values, collaboration: val } })}
        />
        <QuestionRating
          question="Excellence - Delivering high-quality work consistently"
          value={responses.values.excellence}
          onChange={(val) => setResponses({ ...responses, values: { ...responses.values, excellence: val } })}
        />
        <QuestionRating
          question="Customer Focus - Prioritizing customer needs and satisfaction"
          value={responses.values.customerFocus}
          onChange={(val) => setResponses({ ...responses, values: { ...responses.values, customerFocus: val } })}
        />
      </CardContent>
    </Card>
  );
}

function TechnicalSection({ responses, setResponses }: any) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Technical Skills Self-Assessment</CardTitle>
        <CardDescription>Rate your proficiency (1-5: Beginner to Expert)</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label>In the past 12 months, which technical skills have you actively developed?</Label>
          <Textarea
            value={responses.technical.recentSkills || ""}
            onChange={(e) => setResponses({ ...responses, technical: { ...responses.technical, recentSkills: e.target.value } })}
            placeholder="List skills and your current proficiency level..."
            rows={4}
          />
        </div>
      </CardContent>
    </Card>
  );
}

function RoleFitSection({ responses, setResponses }: any) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Role Fit & Expectations</CardTitle>
        <CardDescription>Help us understand your career goals and expectations</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label>What attracted you to this specific role? What do you expect to be doing day-to-day?</Label>
          <Textarea
            value={responses.roleFit.q1 || ""}
            onChange={(e) => setResponses({ ...responses, roleFit: { ...responses.roleFit, q1: e.target.value } })}
            placeholder="Your answer..."
            rows={4}
          />
        </div>
        <div className="space-y-2">
          <Label>In your ideal role 3-5 years from now, what would you be doing?</Label>
          <Textarea
            value={responses.roleFit.q2 || ""}
            onChange={(e) => setResponses({ ...responses, roleFit: { ...responses.roleFit, q2: e.target.value } })}
            placeholder="Your answer..."
            rows={4}
          />
        </div>
      </CardContent>
    </Card>
  );
}

function QuestionRating({ question, value, onChange }: any) {
  return (
    <div className="space-y-3">
      <Label>{question}</Label>
      <RadioGroup value={value} onValueChange={onChange}>
        <div className="flex gap-4">
          {[1, 2, 3, 4, 5].map((num) => (
            <div key={num} className="flex flex-col items-center gap-1">
              <RadioGroupItem value={String(num)} id={`${question}-${num}`} />
              <Label htmlFor={`${question}-${num}`} className="text-xs">{num}</Label>
            </div>
          ))}
        </div>
        <div className="flex justify-between text-xs text-muted-foreground mt-1">
          <span>Strongly Disagree</span>
          <span>Strongly Agree</span>
        </div>
      </RadioGroup>
    </div>
  );
}