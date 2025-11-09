import { useState, useEffect } from "react";
import { Navbar } from "@/components/Navbar";
import { StatCard } from "@/components/StatCard";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getAllJobOpenings, getJobApplications } from "@/lib/supabase";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  Briefcase, 
  Clock, 
  TrendingUp, 
  AlertTriangle,
  ArrowRight,
  Users,
  CheckCircle2,
  AlertCircle,
  Lightbulb,
  TrendingDown,
  Target,
  Award
} from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

const Index = () => {
  const [jobs, setJobs] = useState<any[]>([]);
  const [totalCandidates, setTotalCandidates] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [insights, setInsights] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const { user } = useAuth();
  
  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || '';
  const itemsPerPage = 5;

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      const jobData = await getAllJobOpenings();
      
      // Get total candidates count from candidates table
      const { data: candidatesData, error: candidatesError } = await supabase
        .from('candidates')
        .select('id', { count: 'exact' });
      
      if (candidatesError) throw candidatesError;
      setTotalCandidates(candidatesData?.length || 0);
      
      // Load applications and interviews for each job
      const jobsWithData = await Promise.all(
        jobData.map(async (job) => {
          const applications = await getJobApplications(job.id);
          
          // Get all interviews for this job
          const { data: allInterviews, error: interviewsError } = await supabase
            .from('interviews')
            .select('status')
            .eq('job_opening_id', job.id);
          
          if (interviewsError) {
            console.error('Error loading interviews:', interviewsError);
          }
          
          // Count interviews by status
          const scheduledOrCompleted = allInterviews?.filter(i => 
            i.status === 'scheduled' || i.status === 'completed'
          ).length || 0;
          
          const completedInterviews = allInterviews?.filter(i => 
            i.status === 'completed'
          ).length || 0;
          
          const now = new Date();
          
          return {
            ...job,
            daysOpen: Math.floor((now.getTime() - new Date(job.created_at).getTime()) / (1000 * 60 * 60 * 24)),
            pipeline: {
              totalApplications: applications?.length || 0,
              screened: applications?.filter((a: any) => a.status !== 'applied').length || 0,
              interviewsScheduled: scheduledOrCompleted,
              interviewsCompleted: completedInterviews,
              offerStage: applications?.filter((a: any) => a.status === 'offer').length || 0,
            },
            applications,
            topCandidates: applications?.slice(0, 3).map((a: any) => a.candidate_id) || [],
          };
        })
      );
      
      setJobs(jobsWithData);
      
      // Generate AI insights based on real data
      generateInsights(jobsWithData);
    } catch (error: any) {
      console.error('Error loading dashboard:', error);
      toast({
        title: "Error",
        description: "Failed to load dashboard data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const generateInsights = (jobsData: any[]) => {
    const generatedInsights: any[] = [];
    
    // Check for urgent positions
    const urgentJobs = jobsData.filter(j => j.urgency === "critical" || j.urgency === "high");
    if (urgentJobs.length > 0) {
      generatedInsights.push({
        type: "risk",
        text: `${urgentJobs.length} critical position${urgentJobs.length > 1 ? 's' : ''} need${urgentJobs.length === 1 ? 's' : ''} attention`,
        details: urgentJobs.map(j => j.title).join(', '),
        actionLink: "/openings"
      });
    }

    // Check for stale jobs (open > 30 days)
    const staleJobs = jobsData.filter(j => j.daysOpen > 30);
    if (staleJobs.length > 0) {
      generatedInsights.push({
        type: "recommendation",
        text: `${staleJobs.length} position${staleJobs.length > 1 ? 's' : ''} open for over 30 days`,
        details: `Consider reviewing job requirements or expanding talent search for: ${staleJobs.map(j => j.title).join(', ')}`,
        actionLink: "/openings"
      });
    }

    // Check for jobs with low application volume
    const lowVolumeJobs = jobsData.filter(j => j.pipeline.totalApplications < 5 && j.daysOpen > 7);
    if (lowVolumeJobs.length > 0) {
      generatedInsights.push({
        type: "opportunity",
        text: `${lowVolumeJobs.length} role${lowVolumeJobs.length > 1 ? 's' : ''} with low candidate volume`,
        details: `Consider boosting outreach or adjusting requirements for: ${lowVolumeJobs.map(j => j.title).join(', ')}`,
        actionLink: "/openings"
      });
    }

    // Check for interviews needing completion
    const pendingInterviews = jobsData.reduce((sum, j) => 
      sum + (j.pipeline.interviewsScheduled - j.pipeline.interviewsCompleted), 0);
    if (pendingInterviews > 0) {
      generatedInsights.push({
        type: "recommendation",
        text: `${pendingInterviews} scheduled interview${pendingInterviews > 1 ? 's' : ''} awaiting feedback`,
        details: "Complete interview evaluations to keep candidates engaged and move pipeline forward",
        actionLink: "/interviews-calendar"
      });
    }

    // Success: Jobs moving well
    const healthyJobs = jobsData.filter(j => 
      j.pipeline.totalApplications >= 5 && 
      j.pipeline.interviewsCompleted > 0 && 
      j.daysOpen <= 21
    );
    if (healthyJobs.length > 0) {
      generatedInsights.push({
        type: "opportunity",
        text: `${healthyJobs.length} position${healthyJobs.length > 1 ? 's are' : ' is'} progressing well`,
        details: `Strong pipelines for: ${healthyJobs.map(j => j.title).join(', ')}`,
        actionLink: "/openings"
      });
    }

    setInsights(generatedInsights);
  };

  // Calculate real metrics
  const openRequisitions = jobs.length;
  const urgentRequisitions = jobs.filter(j => j.urgency === "critical" || j.urgency === "high").length;
  const averageDaysToFill = jobs.length > 0 
    ? Math.round(jobs.reduce((sum, j) => sum + j.daysOpen, 0) / jobs.length)
    : 0;
  const targetDays = 21;
  
  // Calculate interview completion rate (meaningful metric)
  const totalInterviewsScheduled = jobs.reduce((sum, j) => sum + (j.pipeline.interviewsScheduled || 0), 0);
  const totalInterviewsCompleted = jobs.reduce((sum, j) => sum + (j.pipeline.interviewsCompleted || 0), 0);
  const interviewCompletionRate = totalInterviewsScheduled > 0 
    ? Math.round((totalInterviewsCompleted / totalInterviewsScheduled) * 100)
    : 0;
  
  const getStatusColor = (status: string) => {
    if (!status) return "bg-muted text-muted-foreground";
    switch(status) {
      case "screening": return "bg-primary/10 text-primary border-primary/20";
      case "interviews": return "bg-accent/10 text-accent border-accent/20";
      case "slow_progress": return "bg-destructive/10 text-destructive border-destructive/20";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch(urgency) {
      case "critical": return "text-destructive";
      case "high": return "text-warning";
      case "medium": return "text-primary";
      default: return "text-muted-foreground";
    }
  };

  const getInsightIcon = (type: string) => {
    switch(type) {
      case "risk": return <AlertTriangle className="h-5 w-5" />;
      case "opportunity": return <CheckCircle2 className="h-5 w-5" />;
      case "market": return <TrendingUp className="h-5 w-5" />;
      case "recommendation": return <Lightbulb className="h-5 w-5" />;
      default: return <AlertCircle className="h-5 w-5" />;
    }
  };

  const getInsightColor = (type: string) => {
    switch(type) {
      case "risk": return "bg-destructive/10 border-destructive/20";
      case "opportunity": return "bg-success/10 border-success/20";
      case "market": return "bg-primary/10 border-primary/20";
      case "recommendation": return "bg-accent/10 border-accent/20";
      default: return "bg-muted";
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      
      <main className="flex-1 container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-2">
            Recruiting Intelligence Dashboard
          </h1>
          <p className="text-muted-foreground">
            Welcome back{userName ? `, ${userName}` : ''}. Here's your talent overview for today.
          </p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            icon={Briefcase}
            value={openRequisitions.toString()}
            label="Open Requisitions"
            trend={urgentRequisitions > 0 ? "down" : undefined}
            trendValue={urgentRequisitions > 0 ? `${urgentRequisitions} urgent` : undefined}
            iconColor={urgentRequisitions > 0 ? "text-destructive" : "text-primary"}
          />
          <StatCard
            icon={Clock}
            value={averageDaysToFill > 0 ? `${averageDaysToFill} days` : "Not Available"}
            label="Average Days Open"
            trend={averageDaysToFill > targetDays ? "down" : averageDaysToFill > 0 ? "up" : undefined}
            trendValue={averageDaysToFill > 0 ? `versus ${targetDays} day target` : undefined}
            iconColor={averageDaysToFill > targetDays ? "text-warning" : "text-success"}
          />
          <StatCard
            icon={Users}
            value={totalCandidates.toString()}
            label="Total Candidates"
            iconColor="text-primary"
          />
          <StatCard
            icon={Award}
            value={totalInterviewsScheduled > 0 ? `${interviewCompletionRate}%` : "Not Available"}
            label="Interview Completion Rate"
            trend={interviewCompletionRate >= 80 ? "up" : interviewCompletionRate > 0 ? "down" : undefined}
            trendValue={totalInterviewsScheduled > 0 ? `${totalInterviewsCompleted} of ${totalInterviewsScheduled} completed` : undefined}
            iconColor={interviewCompletionRate >= 80 ? "text-success" : "text-warning"}
          />
        </div>

        {/* AI Insights Panel */}
        <Card className="p-6 mb-8 bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-950/20 dark:to-blue-950/20 border-2">
          <div className="flex items-center gap-2 mb-4">
            <Lightbulb className="h-6 w-6 text-accent" />
            <h2 className="text-xl font-semibold">AI Insights</h2>
          </div>
          {jobs.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No insights yet. Create job openings and add candidates to see AI recommendations.
            </p>
          ) : insights.length === 0 ? (
            <div className="p-4 rounded-lg border bg-success/10 border-success/20">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 mt-0.5 text-success" />
                <div className="flex-1">
                  <p className="font-medium mb-1">All systems looking good!</p>
                  <p className="text-sm text-muted-foreground">
                    Your hiring pipeline is running smoothly. Keep up the great work!
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {insights.map((insight, idx) => (
                <div 
                  key={idx}
                  className={`p-4 rounded-lg border hover:shadow-md transition-shadow ${getInsightColor(insight.type)}`}
                >
                  <div className="flex items-start gap-3">
                    <div className={insight.type === "risk" ? "text-destructive" : insight.type === "opportunity" ? "text-success" : "text-primary"}>
                      {getInsightIcon(insight.type)}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium mb-1">{insight.text}</p>
                      <p className="text-sm text-muted-foreground mb-3">
                        {insight.details}
                      </p>
                      {insight.actionLink && (
                        <Link to={insight.actionLink}>
                          <Button size="sm" variant="outline">
                            Take Action
                            <ArrowRight className="h-3 w-3 ml-1" />
                          </Button>
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Active Requisitions */}
        <Card className="p-6 mb-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">Active Requisitions</h2>
            <Link to="/openings">
              <Button variant="outline">View All</Button>
            </Link>
          </div>

          {isLoading ? (
            <p className="text-center text-muted-foreground py-8">Loading job openings...</p>
          ) : jobs.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">No active job openings yet</p>
              <Link to="/openings/create">
                <Button>
                  <Briefcase className="h-4 w-4 mr-2" />
                  Create First Job Opening
                </Button>
              </Link>
            </div>
          ) : (
            <>
              <div className="space-y-4">
                {jobs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((job) => (
                <div 
                  key={job.id}
                  className="p-4 border border-border rounded-lg hover:border-primary/50 transition-colors"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-lg">{job.title}</h3>
                        <Badge variant="outline" className={getStatusColor(job.status)}>
                          {job.status ? job.status.replace('_', ' ') : 'open'}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{job.department || 'No department'}</p>
                    </div>
                    
                    <div className="flex items-center gap-6 text-sm">
                      <div className="flex items-center gap-2">
                        <Clock className={`h-4 w-4 ${getUrgencyColor(job.urgency)}`} />
                        <span className="font-medium">{job.daysOpen} days open</span>
                      </div>
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-primary" />
                      <span className="font-medium">{job.pipeline.totalApplications} application{job.pipeline.totalApplications !== 1 ? 's' : ''}</span>
                    </div>
                  </div>
                </div>

                  {/* Pipeline Progress */}
                  <div className="mb-3">
                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                      <span>Pipeline Progress</span>
                      <span>{job.pipeline.interviewsCompleted} of {job.pipeline.totalApplications} interviewed</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-primary to-accent rounded-full transition-all"
                        style={{ width: `${job.pipeline.totalApplications > 0 ? (job.pipeline.interviewsCompleted / job.pipeline.totalApplications) * 100 : 0}%` }}
                      />
                    </div>
                  </div>

                  {/* Required Skills */}
                  {job.required_skills && job.required_skills.length > 0 && (
                    <div className="mb-3">
                      <p className="text-sm font-medium mb-2">Required Skills:</p>
                      <div className="flex gap-2 flex-wrap">
                        {job.required_skills.slice(0, 5).map((skill: any, idx: number) => (
                          <Badge 
                            key={idx}
                            variant="outline"
                            className={
                              skill.importance === 'critical' 
                                ? "bg-destructive/10 text-destructive border-destructive/20"
                                : "bg-primary/10 text-primary border-primary/20"
                            }
                          >
                            {skill.name}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Link to={`/search?jobId=${job.id}`}>
                      <Button size="sm" variant="default">
                        View Candidates ({job.pipeline.totalApplications})
                      </Button>
                    </Link>
                    <Link to={`/openings/${job.id}/pipeline`}>
                      <Button size="sm" variant="outline">
                        Manage Pipeline
                      </Button>
                  </Link>
                </div>
              </div>
            ))}
              </div>
              
              {jobs.length > itemsPerPage && (
                <div className="mt-8">
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious 
                          onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                          className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                        />
                      </PaginationItem>
                      {Array.from({ length: Math.ceil(jobs.length / itemsPerPage) }, (_, i) => i + 1).map((page) => (
                        <PaginationItem key={page}>
                          <PaginationLink
                            onClick={() => setCurrentPage(page)}
                            isActive={currentPage === page}
                            className="cursor-pointer"
                          >
                            {page}
                          </PaginationLink>
                        </PaginationItem>
                      ))}
                      <PaginationItem>
                        <PaginationNext 
                          onClick={() => setCurrentPage(prev => Math.min(Math.ceil(jobs.length / itemsPerPage), prev + 1))}
                          className={currentPage === Math.ceil(jobs.length / itemsPerPage) ? "pointer-events-none opacity-50" : "cursor-pointer"}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
            </>
          )}
        </Card>

        {/* Actionable Recommendations */}
        {jobs.length > 0 && (
          <Card className="p-6">
            <h2 className="text-2xl font-bold mb-4">What Should You Do Today?</h2>
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm font-bold mt-0.5">
                  1
                </div>
                <div className="flex-1">
                  <p className="font-medium">Review new candidates in the pipeline</p>
                  <p className="text-sm text-muted-foreground">You have {jobs.reduce((sum, j) => sum + j.pipeline.totalApplications, 0)} total candidates to review · 15 min</p>
                </div>
                <Link to="/search">
                  <Button size="sm">Review</Button>
                </Link>
              </div>
            </div>
          </Card>
        )}
      </main>
    </div>
  );
};

export default Index;
