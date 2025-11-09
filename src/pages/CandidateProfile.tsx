import { useState, useEffect } from "react";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { ConfidenceBar } from "@/components/ConfidenceBar";
import { SendMessageDialog } from "@/components/SendMessageDialog";
import { ScheduleInterviewDialog } from "@/components/ScheduleInterviewDialog";
import { supabase } from "@/integrations/supabase/client";
import { useParams, Link } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import { NotesSection } from "@/components/NotesSection";
import { AddApplicationDialog } from "@/components/AddApplicationDialog";
import {
  Mail,
  Calendar,
  MapPin,
  Clock,
  Briefcase,
  TrendingUp,
  Target,
  Award,
  MessageSquare,
  ArrowLeft,
  RefreshCw,
  Link2,
  ClipboardCopy,
  AlertCircle,
  Shield,
  Plus,
  Sparkles,
  Loader2,
  Star,
  GraduationCap,
  Languages,
  Globe,
  Phone,
  FileText
} from "lucide-react";

const CandidateProfile = () => {
  const { candidateId } = useParams();
  const [candidate, setCandidate] = useState<any>(null);
  const [applications, setApplications] = useState<any[]>([]);
  const [jobOpenings, setJobOpenings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sendMessageOpen, setSendMessageOpen] = useState(false);
  const [scheduleInterviewOpen, setScheduleInterviewOpen] = useState(false);
  const [interviews, setInterviews] = useState<any[]>([]);
  const [surveyGenerated, setSurveyGenerated] = useState(false);
  const [surveyLink, setSurveyLink] = useState('');
  const [completeAnalysis, setCompleteAnalysis] = useState<any>(null);
  const [isGeneratingAnalysis, setIsGeneratingAnalysis] = useState(false);
  const [backgroundVerification, setBackgroundVerification] = useState<any>(null);
  const [isVerifyingBackground, setIsVerifyingBackground] = useState(false);

  useEffect(() => {
    if (candidateId) {
      loadCandidate();
      loadInterviews();
      loadJobOpenings();
      checkSurveyStatus();
    }
  }, [candidateId]);

  const loadJobOpenings = async () => {
    try {
      const { data, error } = await supabase
        .from('job_openings')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setJobOpenings(data || []);
    } catch (error: any) {
      console.error('Error loading job openings:', error);
    }
  };

  const loadInterviews = async () => {
    if (!candidateId) return;
    try {
      const { data, error } = await supabase
        .from('interviews')
        .select('*, job_openings(title)')
        .eq('candidate_id', candidateId)
        .order('scheduled_date', { ascending: false });

      if (error) throw error;
      setInterviews(data || []);
    } catch (error: any) {
      console.error('Error loading interviews:', error);
    }
  };

  const loadCandidate = async () => {
    if (!candidateId) return;
    
    setLoading(true);
    try {
      const { data: candidateData, error: candidateError } = await supabase
        .from('candidates')
        .select('*')
        .eq('id', candidateId)
        .single();

      if (candidateError) throw candidateError;
      setCandidate(candidateData);

      const { data: applicationsData, error: applicationsError } = await supabase
        .from('applications')
        .select('*, job_openings(*)')
        .eq('candidate_id', candidateId);

      if (applicationsError) throw applicationsError;
      setApplications(applicationsData || []);

    } catch (error: any) {
      console.error('Error loading candidate:', error);
      toast({ title: "Error loading candidate", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const generateCompleteAnalysis = async (jobId?: string) => {
    if (!candidateId) return;
    
    setIsGeneratingAnalysis(true);
    try {
      const { data, error } = await supabase.functions.invoke('analyze-candidate-complete', {
        body: { candidateId, jobId }
      });

      if (error) throw error;

      setCompleteAnalysis(data);
      toast({ title: "Complete analysis generated successfully" });
    } catch (error) {
      console.error('Error generating complete analysis:', error);
      toast({ title: "Failed to generate complete analysis", variant: "destructive" });
    } finally {
      setIsGeneratingAnalysis(false);
    }
  };

  const checkSurveyStatus = async () => {
    if (!candidateId) return;
    
    try {
      const { data, error } = await supabase
        .from('candidate_surveys')
        .select('*')
        .eq('candidate_id', candidateId)
        .single();

      if (data) {
        setSurveyGenerated(true);
        if (data.survey_token) {
          setSurveyLink(`${window.location.origin}/survey/${data.survey_token}`);
        }
      }
    } catch (error) {
      console.error('Error checking survey status:', error);
    }
  };

  const generateSurveyLink = async () => {
    if (!candidateId) return;
    
    try {
      const { data, error } = await supabase.functions.invoke('generate-survey-link', {
        body: { candidateId }
      });

      if (error) throw error;

      if (data.surveyLink) {
        setSurveyLink(data.surveyLink);
        setSurveyGenerated(true);
        toast({ title: "Survey link generated successfully" });
      }
    } catch (error) {
      console.error('Error generating survey link:', error);
      toast({ title: "Failed to generate survey link", variant: "destructive" });
    }
  };

  const copySurveyLink = () => {
    navigator.clipboard.writeText(surveyLink);
    toast({ title: "Survey link copied to clipboard" });
  };

  const verifyBackground = async () => {
    if (!candidateId) return;
    
    setIsVerifyingBackground(true);
    try {
      const { data, error } = await supabase.functions.invoke('verify-background', {
        body: { candidateId }
      });

      if (error) throw error;

      setBackgroundVerification(data);
      toast({ title: "Background verification completed successfully" });
    } catch (error: any) {
      console.error('Error verifying background:', error);
      toast({ 
        title: "Verification failed", 
        description: error.message,
        variant: "destructive" 
      });
    } finally {
      setIsVerifyingBackground(false);
    }
  };

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

  if (!candidate) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto py-8 px-4">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-4">Candidate not found</h2>
            <Link to="/">
              <Button>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto py-8 px-4">
        <div className="mb-6">
          <Link to="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Button>
          </Link>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* Profile Card */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col items-center text-center space-y-4">
                  <div className="h-24 w-24 rounded-full bg-primary/10 flex items-center justify-center text-3xl font-bold text-primary">
                    {candidate.full_name?.charAt(0) || '?'}
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">{candidate.full_name}</h2>
                    <p className="text-muted-foreground">{candidate.current_position || 'No position'}</p>
                    {candidate.current_company && (
                      <p className="text-sm text-muted-foreground">{candidate.current_company}</p>
                    )}
                  </div>
                </div>

                <div className="mt-6 space-y-3">
                  {candidate.email && (
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span>{candidate.email}</span>
                    </div>
                  )}
                  {candidate.phone && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span>{candidate.phone}</span>
                    </div>
                  )}
                  {candidate.location && (
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span>{candidate.location}</span>
                    </div>
                  )}
                  {candidate.years_experience && (
                    <div className="flex items-center gap-2 text-sm">
                      <Briefcase className="h-4 w-4 text-muted-foreground" />
                      <span>{candidate.years_experience} years experience</span>
                    </div>
                  )}
                </div>

                <div className="mt-6 space-y-2">
                  <Button 
                    className="w-full" 
                    onClick={() => setScheduleInterviewOpen(true)}
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    Schedule Interview
                  </Button>
                  <Button 
                    className="w-full" 
                    variant="outline"
                    onClick={() => setSendMessageOpen(true)}
                  >
                    <MessageSquare className="mr-2 h-4 w-4" />
                    Send Message
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Survey Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Candidate Survey</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {!surveyGenerated ? (
                  <Button onClick={generateSurveyLink} className="w-full">
                    <Plus className="mr-2 h-4 w-4" />
                    Generate Survey Link
                  </Button>
                ) : (
                  <>
                    <div className="text-xs text-muted-foreground">Share this link with the candidate:</div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={surveyLink}
                        readOnly
                        className="flex-1 px-3 py-2 text-xs bg-muted rounded border"
                      />
                      <Button size="sm" variant="outline" onClick={copySurveyLink}>
                        <ClipboardCopy className="h-4 w-4" />
                      </Button>
                    </div>
                    <Link to={`/candidates/${candidateId}/survey-results`}>
                      <Button variant="outline" className="w-full" size="sm">
                        View Survey Results
                      </Button>
                    </Link>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Notes */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <NotesSection 
                  candidateId={candidateId!}
                  initialNotes={candidate.notes || ''}
                  onNotesUpdated={loadCandidate}
                />
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-2">
            <Tabs defaultValue="summary" className="space-y-6">
              <TabsList className="grid w-full grid-cols-8">
                <TabsTrigger value="summary">Summary</TabsTrigger>
                <TabsTrigger value="qualifications">Qualifications</TabsTrigger>
                <TabsTrigger value="job-fit">Job Fit</TabsTrigger>
                <TabsTrigger value="assessment">Assessment</TabsTrigger>
                <TabsTrigger value="evaluation">Evaluation</TabsTrigger>
                <TabsTrigger value="compensation">Compensation</TabsTrigger>
                <TabsTrigger value="decision">Decision</TabsTrigger>
                <TabsTrigger value="background">Background</TabsTrigger>
              </TabsList>

              {/* Summary Tab */}
              <TabsContent value="summary" className="space-y-6">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Executive Summary</CardTitle>
                    <Button 
                      onClick={() => generateCompleteAnalysis(applications[0]?.job_opening_id)}
                      disabled={isGeneratingAnalysis}
                    >
                      {isGeneratingAnalysis ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Sparkles className="mr-2 h-4 w-4" />
                          Generate Analysis
                        </>
                      )}
                    </Button>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {completeAnalysis?.executive_summary ? (
                      <>
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-sm text-muted-foreground mb-1">Overall Score</div>
                            <div className="text-3xl font-bold">{completeAnalysis.executive_summary.overall_score}/100</div>
                          </div>
                          <Badge variant={
                            completeAnalysis.executive_summary.recommendation === 'strongly_recommend' ? 'default' :
                            completeAnalysis.executive_summary.recommendation === 'recommend' ? 'secondary' :
                            completeAnalysis.executive_summary.recommendation === 'consider' ? 'outline' : 'destructive'
                          }>
                            {completeAnalysis.executive_summary.recommendation.replace('_', ' ').toUpperCase()}
                          </Badge>
                        </div>
                        
                        <div>
                          <div className="text-lg font-semibold mb-2">{completeAnalysis.executive_summary.one_liner}</div>
                          <div className="text-sm text-muted-foreground">
                            {completeAnalysis.executive_summary.career_level} • {completeAnalysis.executive_summary.years_experience} years experience
                          </div>
                        </div>

                        <div className="grid md:grid-cols-2 gap-6">
                          <div>
                            <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                              <TrendingUp className="h-4 w-4 text-success" />
                              Key Strengths
                            </h4>
                            <ul className="space-y-2">
                              {completeAnalysis.executive_summary.key_strengths?.map((strength: string, idx: number) => (
                                <li key={idx} className="flex items-start gap-2">
                                  <span className="text-success mt-0.5">✓</span>
                                  <span className="text-sm">{strength}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                          <div>
                            <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                              <AlertCircle className="h-4 w-4 text-warning" />
                              Key Concerns
                            </h4>
                            <ul className="space-y-2">
                              {completeAnalysis.executive_summary.key_concerns?.map((concern: string, idx: number) => (
                                <li key={idx} className="flex items-start gap-2">
                                  <span className="text-warning mt-0.5">⚠</span>
                                  <span className="text-sm">{concern}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>Generate AI analysis to see executive summary</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Quick Stats */}
                <div className="grid md:grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-sm text-muted-foreground mb-1">Applications</div>
                      <div className="text-2xl font-bold">{applications.length}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-sm text-muted-foreground mb-1">Interviews</div>
                      <div className="text-2xl font-bold">{interviews.length}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-sm text-muted-foreground mb-1">Experience</div>
                      <div className="text-2xl font-bold">{candidate.years_experience || 0} years</div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Qualifications Tab */}
              <TabsContent value="qualifications" className="space-y-6">
                {/* Professional Summary */}
                {candidate.professional_summary && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Professional Summary</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm leading-relaxed">{candidate.professional_summary}</p>
                    </CardContent>
                  </Card>
                )}

                {/* Experience */}
                <Card>
                  <CardHeader>
                    <CardTitle>Work Experience</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {candidate.experience && candidate.experience.length > 0 ? (
                      <div className="space-y-6">
                        {candidate.experience.map((exp: any, idx: number) => (
                          <div key={idx} className="border-l-2 border-primary/20 pl-4">
                            <h4 className="font-semibold">{exp.position || exp.title}</h4>
                            <p className="text-sm text-muted-foreground">{exp.company}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {exp.start_date} - {exp.end_date || 'Present'}
                              {exp.duration && ` • ${exp.duration}`}
                            </p>
                            {exp.description && (
                              <p className="text-sm mt-2">{exp.description}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No experience information available</p>
                    )}
                  </CardContent>
                </Card>

                {/* Education */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <GraduationCap className="h-5 w-5" />
                      Education
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {candidate.education && candidate.education.length > 0 ? (
                      <div className="space-y-4">
                        {candidate.education.map((edu: any, idx: number) => (
                          <div key={idx}>
                            <h4 className="font-semibold">{edu.degree || edu.title}</h4>
                            <p className="text-sm text-muted-foreground">{edu.institution}</p>
                            {(edu.start_date || edu.year) && (
                              <p className="text-xs text-muted-foreground mt-1">
                                {edu.start_date && edu.end_date ? `${edu.start_date} - ${edu.end_date}` : edu.year}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No education information available</p>
                    )}
                  </CardContent>
                </Card>

                {/* Skills */}
                <Card>
                  <CardHeader>
                    <CardTitle>Skills</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {candidate.extracted_skills && candidate.extracted_skills.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {candidate.extracted_skills.map((skill: any, idx: number) => (
                          <Badge key={idx} variant="secondary">
                            {typeof skill === 'string' ? skill : skill.name || skill.skill}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No skills information available</p>
                    )}
                  </CardContent>
                </Card>

                {/* Certifications */}
                {candidate.certifications && candidate.certifications.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Award className="h-5 w-5" />
                        Certifications
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {candidate.certifications.map((cert: any, idx: number) => (
                          <div key={idx}>
                            <h4 className="font-semibold text-sm">{cert.name || cert.title}</h4>
                            {cert.issuer && (
                              <p className="text-xs text-muted-foreground">{cert.issuer}</p>
                            )}
                            {cert.date && (
                              <p className="text-xs text-muted-foreground">{cert.date}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Languages */}
                {candidate.languages && candidate.languages.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Languages className="h-5 w-5" />
                        Languages
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {candidate.languages.map((lang: any, idx: number) => (
                          <Badge key={idx} variant="outline">
                            {typeof lang === 'string' ? lang : `${lang.language} - ${lang.level}`}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* Job Fit Tab */}
              <TabsContent value="job-fit" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Job Match Analysis</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {completeAnalysis?.job_fit ? (
                      <>
                        <div className="grid md:grid-cols-4 gap-4">
                          <div className={`p-4 rounded-lg ${getScoreBg(completeAnalysis.job_fit.match_score)}`}>
                            <div className="text-xs text-muted-foreground mb-1">Overall Match</div>
                            <div className={`text-2xl font-bold ${getScoreColor(completeAnalysis.job_fit.match_score)}`}>
                              {completeAnalysis.job_fit.match_score}%
                            </div>
                          </div>
                          <div className={`p-4 rounded-lg ${getScoreBg(completeAnalysis.job_fit.technical_fit)}`}>
                            <div className="text-xs text-muted-foreground mb-1">Technical Fit</div>
                            <div className={`text-2xl font-bold ${getScoreColor(completeAnalysis.job_fit.technical_fit)}`}>
                              {completeAnalysis.job_fit.technical_fit}%
                            </div>
                          </div>
                          <div className={`p-4 rounded-lg ${getScoreBg(completeAnalysis.job_fit.experience_fit)}`}>
                            <div className="text-xs text-muted-foreground mb-1">Experience Fit</div>
                            <div className={`text-2xl font-bold ${getScoreColor(completeAnalysis.job_fit.experience_fit)}`}>
                              {completeAnalysis.job_fit.experience_fit}%
                            </div>
                          </div>
                          <div className={`p-4 rounded-lg ${getScoreBg(completeAnalysis.job_fit.culture_fit)}`}>
                            <div className="text-xs text-muted-foreground mb-1">Culture Fit</div>
                            <div className={`text-2xl font-bold ${getScoreColor(completeAnalysis.job_fit.culture_fit)}`}>
                              {completeAnalysis.job_fit.culture_fit}%
                            </div>
                          </div>
                        </div>

                        <div className="space-y-4">
                          <div>
                            <h4 className="font-semibold mb-2">Alignment Details</h4>
                            <p className="text-sm">{completeAnalysis.job_fit.alignment_details}</p>
                          </div>
                          <div>
                            <h4 className="font-semibold mb-2">Role Suitability</h4>
                            <p className="text-sm">{completeAnalysis.job_fit.role_suitability}</p>
                          </div>
                          <div>
                            <h4 className="font-semibold mb-2">Growth Potential</h4>
                            <p className="text-sm">{completeAnalysis.job_fit.growth_potential}</p>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>Generate analysis to see job fit scores</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Applications */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Applications</CardTitle>
                    <AddApplicationDialog 
                      candidateId={candidateId!}
                      jobOpenings={jobOpenings}
                    />
                  </CardHeader>
                  <CardContent>
                    {applications.length > 0 ? (
                      <div className="space-y-4">
                        {applications.map((app) => (
                          <div key={app.id} className="border rounded-lg p-4">
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <h4 className="font-semibold">{app.job_openings?.title}</h4>
                                <p className="text-sm text-muted-foreground">{app.job_openings?.department}</p>
                              </div>
                              <Badge variant={
                                app.status === 'hired' ? 'default' :
                                app.status === 'rejected' ? 'destructive' :
                                app.status === 'interviewing' ? 'secondary' : 'outline'
                              }>
                                {app.status}
                              </Badge>
                            </div>
                            {app.ai_match_score && (
                              <div className="flex items-center gap-4 text-sm">
                                <div>
                                  <span className="text-muted-foreground">AI Match: </span>
                                  <span className={`font-semibold ${getScoreColor(app.ai_match_score)}`}>
                                    {app.ai_match_score}%
                                  </span>
                                </div>
                                {app.culture_fit_score && (
                                  <div>
                                    <span className="text-muted-foreground">Culture Fit: </span>
                                    <span className={`font-semibold ${getScoreColor(app.culture_fit_score)}`}>
                                      {app.culture_fit_score}%
                                    </span>
                                  </div>
                                )}
                              </div>
                            )}
                            <p className="text-xs text-muted-foreground mt-2">
                              Applied {new Date(app.applied_date).toLocaleDateString()}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-4">No applications yet</p>
                    )}
                  </CardContent>
                </Card>

                {/* Skills Deep Dive */}
                {completeAnalysis?.skills_analysis && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Skills Analysis</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="mb-4">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm font-semibold">Overall Skills Match</span>
                          <span className={`font-bold ${getScoreColor(completeAnalysis.skills_analysis.overall_match)}`}>
                            {completeAnalysis.skills_analysis.overall_match}%
                          </span>
                        </div>
                        <Progress value={completeAnalysis.skills_analysis.overall_match} />
                      </div>

                      <div>
                        <h4 className="font-semibold mb-3">Technical Skills</h4>
                        <div className="space-y-3">
                          {completeAnalysis.skills_analysis.technical_skills?.slice(0, 5).map((skill: any, idx: number) => (
                            <div key={idx} className="space-y-1">
                              <div className="flex justify-between text-sm">
                                <span className="font-medium">{skill.skill}</span>
                                <span className="text-muted-foreground">{skill.proficiency}%</span>
                              </div>
                              <Progress value={skill.proficiency} />
                              {skill.evidence && (
                                <p className="text-xs text-muted-foreground">{skill.evidence}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>

                      {completeAnalysis.skills_analysis.skill_gaps?.length > 0 && (
                        <div>
                          <h4 className="font-semibold mb-2">Skill Gaps</h4>
                          <div className="flex flex-wrap gap-2">
                            {completeAnalysis.skills_analysis.skill_gaps.map((gap: string, idx: number) => (
                              <Badge key={idx} variant="destructive">{gap}</Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* Assessment Tab */}
              <TabsContent value="assessment" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Psychometric Assessment Results</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {completeAnalysis?.assessment_results ? (
                      <>
                        <div>
                          <h4 className="font-semibold mb-2">Personality Summary</h4>
                          <p className="text-sm">{completeAnalysis.assessment_results.personality_summary}</p>
                        </div>

                        <div>
                          <h4 className="font-semibold mb-2">Behavioral Insights</h4>
                          <p className="text-sm">{completeAnalysis.assessment_results.behavioral_insights}</p>
                        </div>

                        <div>
                          <h4 className="font-semibold mb-2">Work Style</h4>
                          <p className="text-sm">{completeAnalysis.assessment_results.work_style}</p>
                        </div>

                        <div>
                          <h4 className="font-semibold mb-2">Team Dynamics</h4>
                          <p className="text-sm">{completeAnalysis.assessment_results.team_dynamics}</p>
                        </div>

                        <div className="grid md:grid-cols-2 gap-6">
                          <div>
                            <h4 className="font-semibold mb-3">Strengths</h4>
                            <ul className="space-y-1">
                              {completeAnalysis.assessment_results.strengths?.map((strength: string, idx: number) => (
                                <li key={idx} className="flex items-start gap-2 text-sm">
                                  <span className="text-success mt-0.5">✓</span>
                                  <span>{strength}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                          <div>
                            <h4 className="font-semibold mb-3">Development Areas</h4>
                            <ul className="space-y-1">
                              {completeAnalysis.assessment_results.development_areas?.map((area: string, idx: number) => (
                                <li key={idx} className="flex items-start gap-2 text-sm">
                                  <span className="text-muted-foreground mt-0.5">→</span>
                                  <span>{area}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>Generate analysis to see assessment results</p>
                        <p className="text-xs mt-2">Candidate needs to complete the survey first</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Evaluation Tab */}
              <TabsContent value="evaluation" className="space-y-6">
                {/* Interviews */}
                <Card>
                  <CardHeader>
                    <CardTitle>Interview History</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {interviews.length > 0 ? (
                      <div className="space-y-4">
                        {interviews.map((interview) => (
                          <div key={interview.id} className="border rounded-lg p-4">
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <h4 className="font-semibold">{interview.interview_type.replace('_', ' ').toUpperCase()}</h4>
                                {interview.job_openings && (
                                  <p className="text-sm text-muted-foreground">{interview.job_openings.title}</p>
                                )}
                              </div>
                              <Badge variant={
                                interview.status === 'completed' ? 'default' :
                                interview.status === 'scheduled' ? 'secondary' : 'outline'
                              }>
                                {interview.status}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mb-2">
                              <Calendar className="inline h-3 w-3 mr-1" />
                              {new Date(interview.scheduled_date).toLocaleString()}
                            </p>
                            {interview.score && (
                              <div className="mb-2">
                                <span className="text-sm text-muted-foreground">Score: </span>
                                <span className={`font-semibold ${getScoreColor(interview.score)}`}>
                                  {interview.score}/100
                                </span>
                              </div>
                            )}
                            {interview.notes && (
                              <p className="text-sm mt-2 p-2 bg-muted rounded">{interview.notes}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-4">No interviews scheduled</p>
                    )}
                  </CardContent>
                </Card>

                {/* Interview Strategy */}
                {completeAnalysis?.interview_strategy && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Interview Strategy</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <h4 className="font-semibold mb-2">Recommended Focus Areas</h4>
                        <ul className="space-y-1">
                          {completeAnalysis.interview_strategy.recommended_focus_areas?.map((area: string, idx: number) => (
                            <li key={idx} className="flex items-start gap-2 text-sm">
                              <Target className="h-4 w-4 text-primary mt-0.5" />
                              <span>{area}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div>
                        <h4 className="font-semibold mb-2">Key Questions to Ask</h4>
                        <ul className="space-y-2">
                          {completeAnalysis.interview_strategy.key_questions?.map((question: string, idx: number) => (
                            <li key={idx} className="text-sm pl-4 border-l-2 border-primary/20">
                              {question}
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div>
                        <h4 className="font-semibold mb-2">Red Flags to Probe</h4>
                        <ul className="space-y-1">
                          {completeAnalysis.interview_strategy.red_flags_to_probe?.map((flag: string, idx: number) => (
                            <li key={idx} className="flex items-start gap-2 text-sm">
                              <AlertCircle className="h-4 w-4 text-warning mt-0.5" />
                              <span>{flag}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div>
                        <h4 className="font-semibold mb-2">Strengths to Validate</h4>
                        <ul className="space-y-1">
                          {completeAnalysis.interview_strategy.strengths_to_validate?.map((strength: string, idx: number) => (
                            <li key={idx} className="flex items-start gap-2 text-sm">
                              <Star className="h-4 w-4 text-success mt-0.5" />
                              <span>{strength}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* Compensation Tab */}
              <TabsContent value="compensation" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Market Intelligence</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {completeAnalysis?.market_intelligence ? (
                      <>
                        <div>
                          <h4 className="font-semibold mb-3">Salary Range</h4>
                          <div className="flex items-center gap-4">
                            <div className="text-3xl font-bold text-primary">
                              ${completeAnalysis.market_intelligence.salary_range.min.toLocaleString()}
                            </div>
                            <span className="text-muted-foreground">to</span>
                            <div className="text-3xl font-bold text-primary">
                              ${completeAnalysis.market_intelligence.salary_range.max.toLocaleString()}
                            </div>
                            <Badge variant="secondary">{completeAnalysis.market_intelligence.salary_range.currency}</Badge>
                          </div>
                        </div>

                        <div className="grid md:grid-cols-3 gap-4">
                          <div className="p-4 rounded-lg bg-muted">
                            <div className="text-xs text-muted-foreground mb-1">Market Demand</div>
                            <div className="text-lg font-semibold capitalize">
                              {completeAnalysis.market_intelligence.market_demand.replace('_', ' ')}
                            </div>
                          </div>
                          <div className="p-4 rounded-lg bg-muted">
                            <div className="text-xs text-muted-foreground mb-1">Competitiveness</div>
                            <div className="text-lg font-semibold">
                              {completeAnalysis.market_intelligence.competitiveness}%
                            </div>
                          </div>
                          <div className="p-4 rounded-lg bg-muted">
                            <div className="text-xs text-muted-foreground mb-1">Retention Risk</div>
                            <div className="text-lg font-semibold capitalize">
                              {completeAnalysis.market_intelligence.retention_risk}
                            </div>
                          </div>
                        </div>

                        <div>
                          <h4 className="font-semibold mb-2">Market Context</h4>
                          <p className="text-sm">{completeAnalysis.market_intelligence.market_context}</p>
                        </div>
                      </>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <Globe className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>Generate analysis to see market intelligence</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Decision Tab */}
              <TabsContent value="decision" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Hiring Recommendation</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {completeAnalysis?.final_recommendation ? (
                      <>
                        <div className="flex items-center justify-between p-6 rounded-lg bg-muted">
                          <div>
                            <div className="text-sm text-muted-foreground mb-1">Final Decision</div>
                            <div className="text-3xl font-bold capitalize">
                              {completeAnalysis.final_recommendation.decision.replace('_', ' ')}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm text-muted-foreground mb-1">Confidence</div>
                            <div className="text-3xl font-bold">
                              {completeAnalysis.final_recommendation.confidence}%
                            </div>
                          </div>
                        </div>

                        <div className="grid md:grid-cols-2 gap-6">
                          <div>
                            <h4 className="font-semibold mb-3 flex items-center gap-2">
                              <TrendingUp className="h-5 w-5 text-success" />
                              Reasons to Hire
                            </h4>
                            <ul className="space-y-2">
                              {completeAnalysis.final_recommendation.reasons_to_hire?.map((reason: string, idx: number) => (
                                <li key={idx} className="flex items-start gap-2">
                                  <span className="text-success mt-0.5">✓</span>
                                  <span className="text-sm">{reason}</span>
                                </li>
                              ))}
                            </ul>
                          </div>

                          <div>
                            <h4 className="font-semibold mb-3 flex items-center gap-2">
                              <AlertCircle className="h-5 w-5 text-warning" />
                              Key Concerns
                            </h4>
                            <ul className="space-y-2">
                              {completeAnalysis.final_recommendation.key_concerns?.map((concern: string, idx: number) => (
                                <li key={idx} className="flex items-start gap-2">
                                  <span className="text-warning mt-0.5">⚠</span>
                                  <span className="text-sm">{concern}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>

                        {completeAnalysis.final_recommendation.conditions?.length > 0 && (
                          <div>
                            <h4 className="font-semibold mb-3">Conditions</h4>
                            <ul className="space-y-2">
                              {completeAnalysis.final_recommendation.conditions.map((condition: string, idx: number) => (
                                <li key={idx} className="flex items-start gap-2 text-sm">
                                  <span className="text-primary mt-0.5">→</span>
                                  <span>{condition}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        <div>
                          <h4 className="font-semibold mb-3">Next Steps</h4>
                          <ul className="space-y-2">
                            {completeAnalysis.final_recommendation.next_steps?.map((step: string, idx: number) => (
                              <li key={idx} className="flex items-start gap-2 text-sm">
                                <span className="text-muted-foreground">{idx + 1}.</span>
                                <span>{step}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        {completeAnalysis.final_recommendation.timeline_urgency && (
                          <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                            <div className="font-semibold mb-1">Timeline & Urgency</div>
                            <p className="text-sm">{completeAnalysis.final_recommendation.timeline_urgency}</p>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>Generate analysis to see hiring recommendation</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Background Verification Tab */}
              <TabsContent value="background" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Shield className="h-5 w-5" />
                      Background Verification
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {!backgroundVerification ? (
                      <>
                        <p className="text-sm text-muted-foreground mb-4">
                          Run AI-powered background verification to validate candidate information, work history, and credentials using public data sources.
                        </p>
                        <Button 
                          onClick={verifyBackground}
                          disabled={isVerifyingBackground}
                        >
                          {isVerifyingBackground ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Verifying...
                            </>
                          ) : (
                            <>
                              <Shield className="mr-2 h-4 w-4" />
                              Run Background Check
                            </>
                          )}
                        </Button>
                      </>
                    ) : (
                      <div className="space-y-6">
                        {/* Overall Assessment */}
                        <div className={`p-6 rounded-lg ${
                          backgroundVerification.recommendation === 'APPROVED' ? 'bg-success/10 border border-success/20' :
                          backgroundVerification.recommendation === 'APPROVED_WITH_CONDITIONS' ? 'bg-warning/10 border border-warning/20' :
                          'bg-destructive/10 border border-destructive/20'
                        }`}>
                          <div className="flex items-center justify-between mb-4">
                            <div>
                              <div className="text-sm text-muted-foreground mb-1">Recommendation</div>
                              <div className="text-2xl font-bold">{backgroundVerification.recommendation.replace(/_/g, ' ')}</div>
                            </div>
                            <div className="text-right">
                              <div className="text-sm text-muted-foreground mb-1">Risk Score</div>
                              <div className="text-2xl font-bold">{backgroundVerification.overall_risk_score}/100</div>
                            </div>
                          </div>
                          <p className="text-sm">{backgroundVerification.summary}</p>
                        </div>

                        {/* Identity Verification */}
                        <div>
                          <h4 className="font-semibold mb-3">Identity Verification</h4>
                          <div className="grid md:grid-cols-2 gap-4 mb-3">
                            <div className="p-4 rounded-lg bg-muted">
                              <div className="text-xs text-muted-foreground mb-1">Score</div>
                              <div className="text-2xl font-bold">{backgroundVerification.identity_verification.score}/100</div>
                            </div>
                            <div className="p-4 rounded-lg bg-muted">
                              <div className="text-xs text-muted-foreground mb-1">Confidence</div>
                              <div className="text-2xl font-bold capitalize">{backgroundVerification.identity_verification.confidence}</div>
                            </div>
                          </div>
                          {backgroundVerification.identity_verification.verified_details.length > 0 && (
                            <div className="mb-2">
                              <div className="text-sm font-medium mb-1">Verified Details:</div>
                              <ul className="space-y-1">
                                {backgroundVerification.identity_verification.verified_details.map((detail: string, idx: number) => (
                                  <li key={idx} className="flex items-start gap-2 text-sm">
                                    <span className="text-success mt-0.5">✓</span>
                                    <span>{detail}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {backgroundVerification.identity_verification.unverified_details.length > 0 && (
                            <div>
                              <div className="text-sm font-medium mb-1">Unverified Details:</div>
                              <ul className="space-y-1">
                                {backgroundVerification.identity_verification.unverified_details.map((detail: string, idx: number) => (
                                  <li key={idx} className="flex items-start gap-2 text-sm text-muted-foreground">
                                    <span className="mt-0.5">○</span>
                                    <span>{detail}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>

                        {/* Employment Verification */}
                        {backgroundVerification.employment_verification.length > 0 && (
                          <div>
                            <h4 className="font-semibold mb-3">Employment Verification</h4>
                            <div className="space-y-3">
                              {backgroundVerification.employment_verification.map((emp: any, idx: number) => (
                                <div key={idx} className="p-4 rounded-lg border border-border">
                                  <div className="flex items-start justify-between mb-2">
                                    <div>
                                      <div className="font-medium">{emp.position} at {emp.company}</div>
                                      <div className="text-sm text-muted-foreground">{emp.stated_duration}</div>
                                    </div>
                                    <Badge variant={
                                      emp.verification_status === 'verified' ? 'default' :
                                      emp.verification_status === 'likely_valid' ? 'secondary' : 'outline'
                                    }>
                                      {emp.verification_status}
                                    </Badge>
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    <span className="font-medium">Confidence:</span> {emp.confidence} • 
                                    <span className="font-medium ml-1">Source:</span> {emp.source}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Education Verification */}
                        {backgroundVerification.education_verification.length > 0 && (
                          <div>
                            <h4 className="font-semibold mb-3">Education Verification</h4>
                            <div className="space-y-3">
                              {backgroundVerification.education_verification.map((edu: any, idx: number) => (
                                <div key={idx} className="p-4 rounded-lg border border-border">
                                  <div className="flex items-start justify-between mb-2">
                                    <div>
                                      <div className="font-medium">{edu.degree}</div>
                                      <div className="text-sm text-muted-foreground">{edu.institution}</div>
                                    </div>
                                    <Badge variant={
                                      edu.verification_status === 'verified' ? 'default' :
                                      edu.verification_status === 'likely_valid' ? 'secondary' : 'outline'
                                    }>
                                      {edu.verification_status}
                                    </Badge>
                                  </div>
                                  {edu.notes && (
                                    <p className="text-xs text-muted-foreground">{edu.notes}</p>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Professional Reputation */}
                        <div>
                          <h4 className="font-semibold mb-3">Professional Reputation</h4>
                          <div className="p-4 rounded-lg bg-muted space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="text-sm font-medium">Overall Score</span>
                              <span className="text-lg font-bold">{backgroundVerification.professional_reputation.score}/100</span>
                            </div>
                            <div className="text-sm space-y-1">
                              {backgroundVerification.professional_reputation.github_activity && (
                                <div><span className="font-medium">GitHub:</span> {backgroundVerification.professional_reputation.github_activity}</div>
                              )}
                              {backgroundVerification.professional_reputation.linkedin_endorsements && (
                                <div><span className="font-medium">LinkedIn:</span> {backgroundVerification.professional_reputation.linkedin_endorsements}</div>
                              )}
                              {backgroundVerification.professional_reputation.online_presence && (
                                <div><span className="font-medium">Online Presence:</span> {backgroundVerification.professional_reputation.online_presence}</div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Red Flags */}
                        {backgroundVerification.red_flags.length > 0 && (
                          <div>
                            <h4 className="font-semibold mb-3 flex items-center gap-2 text-destructive">
                              <AlertCircle className="h-5 w-5" />
                              Red Flags
                            </h4>
                            <ul className="space-y-2">
                              {backgroundVerification.red_flags.map((flag: string, idx: number) => (
                                <li key={idx} className="flex items-start gap-2 text-sm p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                                  <span className="text-destructive mt-0.5">⚠</span>
                                  <span>{flag}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Verification Sources */}
                        <div>
                          <h4 className="font-semibold mb-2 text-sm">Verification Sources</h4>
                          <div className="flex flex-wrap gap-2">
                            {backgroundVerification.verification_sources.map((source: string, idx: number) => (
                              <Badge key={idx} variant="outline">{source}</Badge>
                            ))}
                          </div>
                        </div>

                        <Button 
                          onClick={() => setBackgroundVerification(null)}
                          variant="outline"
                          size="sm"
                        >
                          <RefreshCw className="mr-2 h-4 w-4" />
                          Run New Verification
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>

      <SendMessageDialog
        open={sendMessageOpen}
        onOpenChange={setSendMessageOpen}
        candidateId={candidateId!}
        candidateName={candidate.full_name}
      />

      <ScheduleInterviewDialog
        open={scheduleInterviewOpen}
        onOpenChange={setScheduleInterviewOpen}
        candidateId={candidateId!}
        candidateName={candidate.full_name}
      />
    </div>
  );
};

export default CandidateProfile;
