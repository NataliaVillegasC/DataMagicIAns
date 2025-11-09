import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Brain, TrendingUp, Heart, Users, Star, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function SurveyResults() {
  const { candidateId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [survey, setSurvey] = useState<any>(null);
  const [candidate, setCandidate] = useState<any>(null);

  useEffect(() => {
    loadSurveyResults();
  }, [candidateId]);

  async function loadSurveyResults() {
    try {
      // Fetch survey results
      const { data: surveyData, error: surveyError } = await supabase
        .from('candidate_surveys')
        .select('*')
        .eq('candidate_id', candidateId)
        .eq('completed', true)
        .single();

      if (surveyError) throw surveyError;
      if (!surveyData) {
        toast.error("No completed survey found for this candidate");
        return;
      }

      // Fetch candidate info
      const { data: candidateData, error: candidateError } = await supabase
        .from('candidates')
        .select('*')
        .eq('id', candidateId)
        .single();

      if (candidateError) throw candidateError;

      setSurvey(surveyData);
      setCandidate(candidateData);
    } catch (error: any) {
      console.error('Error loading survey results:', error);
      toast.error("Failed to load survey results");
    } finally {
      setLoading(false);
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-success";
    if (score >= 60) return "text-warning";
    return "text-destructive";
  };

  const getScoreBg = (score: number) => {
    if (score >= 80) return "bg-success/10";
    if (score >= 60) return "bg-warning/10";
    return "bg-destructive/10";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto py-8 px-4 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  if (!survey || !candidate) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto py-8 px-4">
          <Card className="p-12 text-center">
            <Brain className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h2 className="text-2xl font-bold mb-2">No Survey Results</h2>
            <p className="text-muted-foreground mb-4">
              This candidate hasn't completed their assessment survey yet.
            </p>
            <Link to={`/candidates/${candidateId}`}>
              <Button>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Profile
              </Button>
            </Link>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container mx-auto py-8 px-4">
        <div className="mb-6">
          <Link to={`/candidates/${candidateId}`}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Profile
            </Button>
          </Link>
        </div>

        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Brain className="h-8 w-8 text-primary" />
            <h1 className="text-3xl md:text-4xl font-bold">
              Assessment Results
            </h1>
          </div>
          <p className="text-muted-foreground">
            {candidate.full_name}'s psychological and competency assessment
          </p>
        </div>

        <div className="grid gap-6">
          {/* Overall EQ Score */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Heart className="h-5 w-5" />
                Emotional Intelligence (EQ)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-6 gap-6">
                <div className={`p-4 rounded-lg ${getScoreBg(survey.eq_score || 0)}`}>
                  <div className="text-xs text-muted-foreground mb-1">Overall EQ</div>
                  <div className={`text-3xl font-bold ${getScoreColor(survey.eq_score || 0)}`}>
                    {survey.eq_score || 0}
                  </div>
                </div>
                <div className="p-4 rounded-lg bg-muted">
                  <div className="text-xs text-muted-foreground mb-1">Self Awareness</div>
                  <div className="text-2xl font-bold">{survey.eq_self_awareness || 0}</div>
                </div>
                <div className="p-4 rounded-lg bg-muted">
                  <div className="text-xs text-muted-foreground mb-1">Self Regulation</div>
                  <div className="text-2xl font-bold">{survey.eq_self_regulation || 0}</div>
                </div>
                <div className="p-4 rounded-lg bg-muted">
                  <div className="text-xs text-muted-foreground mb-1">Motivation</div>
                  <div className="text-2xl font-bold">{survey.eq_motivation || 0}</div>
                </div>
                <div className="p-4 rounded-lg bg-muted">
                  <div className="text-xs text-muted-foreground mb-1">Empathy</div>
                  <div className="text-2xl font-bold">{survey.eq_empathy || 0}</div>
                </div>
                <div className="p-4 rounded-lg bg-muted">
                  <div className="text-xs text-muted-foreground mb-1">Social Skills</div>
                  <div className="text-2xl font-bold">{survey.eq_social_skills || 0}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Personality (OCEAN) */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Personality Assessment (OCEAN Model)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex justify-between mb-2">
                  <span className="font-medium">Openness to Experience</span>
                  <span className="text-sm text-muted-foreground">{survey.ocean_openness}/100</span>
                </div>
                <Progress value={survey.ocean_openness || 0} />
                <p className="text-xs text-muted-foreground mt-1">
                  {survey.ocean_openness >= 70 ? "Highly creative and curious" : "Prefers familiar approaches"}
                </p>
              </div>
              
              <div>
                <div className="flex justify-between mb-2">
                  <span className="font-medium">Conscientiousness</span>
                  <span className="text-sm text-muted-foreground">{survey.ocean_conscientiousness}/100</span>
                </div>
                <Progress value={survey.ocean_conscientiousness || 0} />
                <p className="text-xs text-muted-foreground mt-1">
                  {survey.ocean_conscientiousness >= 70 ? "Highly organized and reliable" : "More flexible and spontaneous"}
                </p>
              </div>
              
              <div>
                <div className="flex justify-between mb-2">
                  <span className="font-medium">Extraversion</span>
                  <span className="text-sm text-muted-foreground">{survey.ocean_extraversion}/100</span>
                </div>
                <Progress value={survey.ocean_extraversion || 0} />
                <p className="text-xs text-muted-foreground mt-1">
                  {survey.ocean_extraversion >= 70 ? "Outgoing and energized by social interaction" : "Prefers quiet, independent work"}
                </p>
              </div>
              
              <div>
                <div className="flex justify-between mb-2">
                  <span className="font-medium">Agreeableness</span>
                  <span className="text-sm text-muted-foreground">{survey.ocean_agreeableness}/100</span>
                </div>
                <Progress value={survey.ocean_agreeableness || 0} />
                <p className="text-xs text-muted-foreground mt-1">
                  {survey.ocean_agreeableness >= 70 ? "Cooperative and empathetic" : "Competitive and analytical"}
                </p>
              </div>
              
              <div>
                <div className="flex justify-between mb-2">
                  <span className="font-medium">Emotional Stability (Low Neuroticism)</span>
                  <span className="text-sm text-muted-foreground">{100 - (survey.ocean_neuroticism || 0)}/100</span>
                </div>
                <Progress value={100 - (survey.ocean_neuroticism || 0)} />
                <p className="text-xs text-muted-foreground mt-1">
                  {survey.ocean_neuroticism <= 30 ? "Calm and resilient under pressure" : "May be more sensitive to stress"}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Situational Judgment */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Situational Judgment Test (SJT)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`p-6 rounded-lg ${getScoreBg(survey.sjt_score || 0)} text-center`}>
                <div className="text-sm text-muted-foreground mb-2">Decision-Making & Problem-Solving</div>
                <div className={`text-5xl font-bold ${getScoreColor(survey.sjt_score || 0)}`}>
                  {survey.sjt_score || 0}
                </div>
                <div className="text-sm text-muted-foreground mt-2">out of 100</div>
              </div>
              <p className="text-sm text-muted-foreground mt-4">
                This score reflects how the candidate handles workplace scenarios, makes decisions under pressure, and navigates complex situations.
              </p>
            </CardContent>
          </Card>

          {/* Values Alignment */}
          {survey.values_alignment_score !== null && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="h-5 w-5" />
                  Values Alignment
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`p-6 rounded-lg ${getScoreBg(survey.values_alignment_score || 0)} text-center`}>
                  <div className="text-sm text-muted-foreground mb-2">Cultural & Values Match</div>
                  <div className={`text-5xl font-bold ${getScoreColor(survey.values_alignment_score || 0)}`}>
                    {survey.values_alignment_score || 0}
                  </div>
                  <div className="text-sm text-muted-foreground mt-2">out of 100</div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* STAR Responses Summary */}
          {survey.star_responses && (
            <Card>
              <CardHeader>
                <CardTitle>Competency-Based Responses</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 gap-4">
                  {survey.star_situation_score && (
                    <div className="p-4 rounded-lg bg-muted">
                      <div className="text-xs text-muted-foreground mb-1">Situation Analysis</div>
                      <div className="text-2xl font-bold">{survey.star_situation_score}</div>
                    </div>
                  )}
                  {survey.star_task_score && (
                    <div className="p-4 rounded-lg bg-muted">
                      <div className="text-xs text-muted-foreground mb-1">Task Understanding</div>
                      <div className="text-2xl font-bold">{survey.star_task_score}</div>
                    </div>
                  )}
                  {survey.star_action_score && (
                    <div className="p-4 rounded-lg bg-muted">
                      <div className="text-xs text-muted-foreground mb-1">Action Quality</div>
                      <div className="text-2xl font-bold">{survey.star_action_score}</div>
                    </div>
                  )}
                  {survey.star_result_score && (
                    <div className="p-4 rounded-lg bg-muted">
                      <div className="text-xs text-muted-foreground mb-1">Results Achieved</div>
                      <div className="text-2xl font-bold">{survey.star_result_score}</div>
                    </div>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-4">
                  Scores based on STAR (Situation, Task, Action, Result) framework analysis of competency-based responses
                </p>
              </CardContent>
            </Card>
          )}

          {/* Completion Info */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>Assessment completed on:</span>
                <Badge variant="outline">
                  {new Date(survey.completed_at).toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
