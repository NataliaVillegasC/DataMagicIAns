import { Navbar } from "@/components/Navbar";
import { StatCard } from "@/components/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  TrendingUp, 
  Clock, 
  Target,
  Briefcase,
  Calendar,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Award
} from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Progress } from "@/components/ui/progress";

const HiringAnalytics = () => {
  const [analytics, setAnalytics] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    setIsLoading(true);
    try {
      // Fetch all data
      const [candidatesRes, applicationsRes, jobsRes, interviewsRes] = await Promise.all([
        supabase.from('candidates').select('*'),
        supabase.from('applications').select('*, job_openings(title, department)'),
        supabase.from('job_openings').select('*'),
        supabase.from('interviews').select('*')
      ]);

      const candidates = candidatesRes.data || [];
      const applications = applicationsRes.data || [];
      const jobs = jobsRes.data || [];
      const interviews = interviewsRes.data || [];

      // Calculate metrics
      const totalCandidates = candidates.length;
      const totalApplications = applications.length;
      const totalJobs = jobs.length;
      const activeJobs = jobs.filter(j => j.status === 'open').length;

      // Application status breakdown
      const statusBreakdown = applications.reduce((acc: any, app: any) => {
        acc[app.status] = (acc[app.status] || 0) + 1;
        return acc;
      }, {});

      // Department breakdown
      const departmentBreakdown = applications.reduce((acc: any, app: any) => {
        const dept = app.job_openings?.department || 'Unknown';
        acc[dept] = (acc[dept] || 0) + 1;
        return acc;
      }, {});

      // Skills inventory
      const allSkills = candidates.flatMap((c: any) => c.extracted_skills || []);
      const skillCounts = allSkills.reduce((acc: any, skill: any) => {
        const skillName = typeof skill === 'string' ? skill : skill.name || skill.skill;
        acc[skillName] = (acc[skillName] || 0) + 1;
        return acc;
      }, {});
      const topSkills = Object.entries(skillCounts)
        .sort(([, a]: any, [, b]: any) => b - a)
        .slice(0, 10)
        .map(([skill, count]) => ({ skill, count }));

      // Interview completion rate
      const completedInterviews = interviews.filter((i: any) => i.status === 'completed').length;
      const interviewCompletionRate = interviews.length > 0 
        ? Math.round((completedInterviews / interviews.length) * 100)
        : 0;

      // Average AI match score
      const scoresWithValues = applications.filter((app: any) => app.ai_match_score != null);
      const avgMatchScore = scoresWithValues.length > 0
        ? Math.round(scoresWithValues.reduce((sum: number, app: any) => sum + app.ai_match_score, 0) / scoresWithValues.length)
        : 0;

      setAnalytics({
        totalCandidates,
        totalApplications,
        totalJobs,
        activeJobs,
        statusBreakdown,
        departmentBreakdown,
        topSkills,
        interviewCompletionRate,
        avgMatchScore,
        totalInterviews: interviews.length
      });

    } catch (error: any) {
      console.error('Error loading analytics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />
        <main className="flex-1 container mx-auto px-4 py-8">
          <Card className="p-12 text-center">
            <p className="text-muted-foreground">Loading analytics...</p>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-2">
            Hiring Analytics
          </h1>
          <p className="text-muted-foreground">
            Real-time insights into your recruitment pipeline and talent pool
          </p>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            icon={Users}
            value={analytics?.totalCandidates?.toString() || '0'}
            label="Total Candidates"
            iconColor="text-primary"
          />
          <StatCard
            icon={Briefcase}
            value={`${analytics?.activeJobs || 0}/${analytics?.totalJobs || 0}`}
            label="Active Job Openings"
            iconColor="text-success"
          />
          <StatCard
            icon={Target}
            value={`${analytics?.avgMatchScore || 0}%`}
            label="Avg Match Score"
            iconColor="text-accent"
          />
          <StatCard
            icon={CheckCircle2}
            value={`${analytics?.interviewCompletionRate || 0}%`}
            label="Interview Completion"
            iconColor="text-success"
          />
        </div>

        <div className="grid lg:grid-cols-2 gap-6 mb-6">
          {/* Application Pipeline */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Application Pipeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(analytics?.statusBreakdown || {}).map(([status, count]: any) => {
                  const percentage = analytics?.totalApplications 
                    ? Math.round((count / analytics.totalApplications) * 100)
                    : 0;
                  
                  return (
                    <div key={status}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Badge variant={
                            status === 'hired' ? 'default' :
                            status === 'rejected' ? 'destructive' :
                            status === 'interviewing' ? 'secondary' : 'outline'
                          }>
                            {status}
                          </Badge>
                        </div>
                        <span className="text-sm font-semibold">{count} ({percentage}%)</span>
                      </div>
                      <Progress value={percentage} />
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Department Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="h-5 w-5" />
                Applications by Department
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(analytics?.departmentBreakdown || {})
                  .sort(([, a]: any, [, b]: any) => b - a)
                  .slice(0, 6)
                  .map(([dept, count]: any) => {
                    const percentage = analytics?.totalApplications 
                      ? Math.round((count / analytics.totalApplications) * 100)
                      : 0;
                    
                    return (
                      <div key={dept}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium">{dept}</span>
                          <span className="text-sm font-semibold">{count} ({percentage}%)</span>
                        </div>
                        <Progress value={percentage} />
                      </div>
                    );
                  })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Skills Inventory */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5" />
              Top Skills in Talent Pool
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {analytics?.topSkills?.map((item: any, idx: number) => (
                <div key={idx} className="flex items-center gap-2 px-4 py-2 bg-muted rounded-lg">
                  <Badge variant="secondary">{item.count}</Badge>
                  <span className="font-medium">{item.skill}</span>
                </div>
              ))}
            </div>
            {(!analytics?.topSkills || analytics.topSkills.length === 0) && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No skills data available. Upload candidates with CVs to see skill analysis.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <div className="grid md:grid-cols-3 gap-6 mt-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Calendar className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{analytics?.totalInterviews || 0}</div>
                  <div className="text-sm text-muted-foreground">Total Interviews</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-success/10 flex items-center justify-center">
                  <CheckCircle2 className="h-6 w-6 text-success" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{analytics?.statusBreakdown?.hired || 0}</div>
                  <div className="text-sm text-muted-foreground">Successful Hires</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-warning/10 flex items-center justify-center">
                  <Clock className="h-6 w-6 text-warning" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{analytics?.statusBreakdown?.interviewing || 0}</div>
                  <div className="text-sm text-muted-foreground">In Progress</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default HiringAnalytics;
