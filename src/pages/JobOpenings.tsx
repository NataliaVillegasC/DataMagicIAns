import { useState, useEffect } from "react";
import { Navbar } from "@/components/Navbar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { getAllJobOpenings, getJobApplications, deleteJobOpening, getAllCandidates } from "@/lib/supabase";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import {
  Briefcase,
  Clock,
  Users,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Target,
  Edit,
  Trash2,
  Plus,
  UserPlus
} from "lucide-react";
import { EditJobOpeningDialog } from "@/components/EditJobOpeningDialog";
import { DeleteConfirmDialog } from "@/components/DeleteConfirmDialog";
import { AddApplicationDialog } from "@/components/AddApplicationDialog";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

const JobOpenings = () => {
  const [jobs, setJobs] = useState<any[]>([]);
  const [candidates, setCandidates] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingJob, setEditingJob] = useState<any>(null);
  const [deletingJob, setDeletingJob] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  
  const itemsPerPage = 5;

  useEffect(() => {
    loadJobs();
  }, []);

  const loadJobs = async () => {
    try {
      setIsLoading(true);
      const [jobData, candidateData] = await Promise.all([
        getAllJobOpenings(),
        getAllCandidates()
      ]);
      
      setCandidates(candidateData || []);
      
      // Load applications and interviews for each job
      const jobsWithApplications = await Promise.all(
        jobData.map(async (job) => {
          const applications = await getJobApplications(job.id);
          
          // Get interviews count for this job - use any to avoid type recursion
          const interviewsResult = await (supabase as any)
            .from('interviews')
            .select('*', { count: 'exact', head: true })
            .eq('job_opening_id', job.id);
          
          const interviewsTotal = interviewsResult.count || 0;
          
          const interviewsCompletedResult = await (supabase as any)
            .from('interviews')
            .select('*', { count: 'exact', head: true })
            .eq('job_opening_id', job.id)
            .eq('status', 'completed');
          
          const interviewsCompletedCount = interviewsCompletedResult.count || 0;
          
          return {
            ...job,
            daysOpen: Math.floor((new Date().getTime() - new Date(job.created_at).getTime()) / (1000 * 60 * 60 * 24)),
            pipeline: {
              totalApplications: applications?.length || 0,
              screened: applications?.filter((a: any) => a.status !== 'applied').length || 0,
              interviewsScheduled: interviewsTotal,
              interviewsCompleted: interviewsCompletedCount,
              offerStage: applications?.filter((a: any) => a.status === 'offer').length || 0,
            },
            applications,
          };
        })
      );
      
      setJobs(jobsWithApplications);
    } catch (error: any) {
      console.error('Error loading jobs:', error);
      toast({
        title: "Error",
        description: "Failed to load job openings",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteJob = async () => {
    if (!deletingJob) return;
    
    try {
      await deleteJobOpening(deletingJob.id);
      toast({
        title: "Success",
        description: "Job opening deleted successfully",
      });
      loadJobs();
      setDeletingJob(null);
    } catch (error: any) {
      console.error('Error deleting job:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete job opening",
        variant: "destructive",
      });
    }
  };

  const getUrgencyColor = (urgency?: string) => {
    if (!urgency) return "text-muted-foreground";
    switch(urgency) {
      case "critical": return "text-destructive";
      case "high": return "text-warning";
      case "medium": return "text-primary";
      default: return "text-muted-foreground";
    }
  };

  const getUrgencyBg = (urgency?: string) => {
    if (!urgency) return "bg-muted";
    switch(urgency) {
      case "critical": return "bg-destructive/10 border-destructive/20";
      case "high": return "bg-warning/10 border-warning/20";
      case "medium": return "bg-primary/10 border-primary/20";
      default: return "bg-muted";
    }
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case "screening": return "bg-primary/10 text-primary border-primary/20";
      case "interviews": return "bg-success/10 text-success border-success/20";
      case "slow_progress": return "bg-destructive/10 text-destructive border-destructive/20";
      default: return "bg-muted";
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold mb-2">
                Job Openings Management
              </h1>
              <p className="text-muted-foreground">
                Track and manage all open positions
              </p>
            </div>
            <Link to="/openings/create">
              <Button size="lg">
                <Briefcase className="h-4 w-4 mr-2" />
                New Opening
              </Button>
            </Link>
          </div>

          {/* Quick Stats */}
          {!isLoading && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <Briefcase className="h-8 w-8 text-primary" />
                  <div>
                    <p className="text-2xl font-bold">{jobs.length}</p>
                    <p className="text-sm text-muted-foreground">Total Open</p>
                  </div>
                </div>
              </Card>
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="h-8 w-8 text-destructive" />
                  <div>
                    <p className="text-2xl font-bold">
                      {jobs.filter(j => j.urgency === "critical").length}
                    </p>
                    <p className="text-sm text-muted-foreground">Critical</p>
                  </div>
                </div>
              </Card>
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <Users className="h-8 w-8 text-success" />
                  <div>
                    <p className="text-2xl font-bold">
                      {jobs.reduce((sum, j) => sum + j.pipeline.totalApplications, 0)}
                    </p>
                    <p className="text-sm text-muted-foreground">Candidates</p>
                  </div>
                </div>
              </Card>
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-8 w-8 text-accent" />
                  <div>
                    <p className="text-2xl font-bold">
                      {jobs.reduce((sum, j) => sum + j.pipeline.offerStage, 0)}
                    </p>
                    <p className="text-sm text-muted-foreground">In Offers</p>
                  </div>
                </div>
              </Card>
            </div>
          )}
        </div>

        {/* Job Opening Cards */}
        {isLoading ? (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">Loading job openings...</p>
          </Card>
        ) : jobs.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground mb-4">No job openings yet</p>
            <Link to="/openings/create">
              <Button>
                <Briefcase className="h-4 w-4 mr-2" />
                Create First Job Opening
              </Button>
            </Link>
          </Card>
        ) : (
          <>
            <div className="space-y-6">
              {jobs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((job) => (
            <Card key={job.id} className="p-6">
              {/* Header */}
              <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-6">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h2 className="text-2xl font-bold">{job.title}</h2>
                    <Badge variant="outline" className={getStatusColor(job.status)}>
                      {job.status.replace('_', ' ')}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">{job.department}</p>
                  
                  <div className="flex flex-wrap gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Clock className={`h-4 w-4 ${getUrgencyColor(job.urgency)}`} />
                      <span className="font-medium">{job.daysOpen} days open</span>
                    </div>
                    {job.target_close_date && (
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span>Target: {new Date(job.target_close_date).toLocaleDateString()}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Target className="h-4 w-4 text-muted-foreground" />
                      <span className={job.daysOpen < 30 ? "text-success" : "text-destructive"}>
                        {job.daysOpen < 30 ? "On track" : "Behind pace"}
                      </span>
                    </div>
                  </div>
                </div>

                <Badge variant="outline" className={`${getUrgencyBg(job.urgency)} px-4 py-2 text-sm`}>
                  {(job.urgency || 'medium').toUpperCase()} PRIORITY
                </Badge>
              </div>

              {/* Pipeline Funnel */}
              <div className="mb-6">
                <h3 className="font-semibold mb-4">Candidate Pipeline</h3>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div className="text-center">
                    <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 mb-2">
                      <p className="text-3xl font-bold text-primary">{job.pipeline.totalApplications}</p>
                    </div>
                    <p className="text-sm text-muted-foreground">Applications</p>
                  </div>
                  <div className="text-center">
                    <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 mb-2">
                      <p className="text-3xl font-bold text-primary">{job.pipeline.screened}</p>
                    </div>
                    <p className="text-sm text-muted-foreground">Screened</p>
                    <p className="text-xs text-muted-foreground">
                      {Math.round((job.pipeline.screened / job.pipeline.totalApplications) * 100)}%
                    </p>
                  </div>
                  <div className="text-center">
                    <div className="bg-accent/10 border border-accent/20 rounded-lg p-4 mb-2">
                      <p className="text-3xl font-bold text-accent">{job.pipeline.interviewsScheduled}</p>
                    </div>
                    <p className="text-sm text-muted-foreground">Scheduled</p>
                    <p className="text-xs text-muted-foreground">
                      {Math.round((job.pipeline.interviewsScheduled / job.pipeline.totalApplications) * 100)}%
                    </p>
                  </div>
                  <div className="text-center">
                    <div className="bg-success/10 border border-success/20 rounded-lg p-4 mb-2">
                      <p className="text-3xl font-bold text-success">{job.pipeline.interviewsCompleted}</p>
                    </div>
                    <p className="text-sm text-muted-foreground">Interviewed</p>
                    <p className="text-xs text-muted-foreground">
                      {Math.round((job.pipeline.interviewsCompleted / job.pipeline.totalApplications) * 100)}%
                    </p>
                  </div>
                  <div className="text-center">
                    <div className="bg-success/20 border border-success/30 rounded-lg p-4 mb-2">
                      <p className="text-3xl font-bold text-success">{job.pipeline.offerStage}</p>
                    </div>
                    <p className="text-sm text-muted-foreground">Offers</p>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mt-4">
                  <div className="flex justify-between text-xs text-muted-foreground mb-1">
                    <span>Overall Progress</span>
                    <span>{job.pipeline.interviewsCompleted} of {job.pipeline.totalApplications} candidates through interviews</span>
                  </div>
                  <Progress 
                    value={(job.pipeline.interviewsCompleted / job.pipeline.totalApplications) * 100} 
                    className="h-2"
                  />
                </div>
              </div>

              {/* Required Skills */}
              {job.required_skills && job.required_skills.length > 0 && (
                <div className="mb-6">
                  <h3 className="font-semibold mb-4">Required Skills</h3>
                  <div className="flex flex-wrap gap-2">
                    {job.required_skills.map((skill: any, idx: number) => (
                      <Badge 
                        key={idx}
                        variant={skill.importance === 'critical' ? 'destructive' : 'default'}
                      >
                        {skill.name} - {skill.importance}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-wrap gap-3 pt-4 border-t border-border">
                <AddApplicationDialog
                  jobId={job.id}
                  candidates={candidates}
                  onSuccess={loadJobs}
                  trigger={
                    <Button>
                      <UserPlus className="h-4 w-4 mr-2" />
                      Add Candidate
                    </Button>
                  }
                />
                <Link to={`/search?jobId=${job.id}`}>
                  <Button variant="outline">
                    <Users className="h-4 w-4 mr-2" />
                    View All Candidates
                  </Button>
                </Link>
                <Button 
                  variant="outline"
                  onClick={() => setEditingJob(job)}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
                <Button 
                  variant="outline"
                  className="text-destructive hover:text-destructive"
                  onClick={() => setDeletingJob(job)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </div>
            </Card>
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
        
        {/* Dialogs */}
        <EditJobOpeningDialog
          job={editingJob}
          open={!!editingJob}
          onOpenChange={(open) => !open && setEditingJob(null)}
          onSuccess={loadJobs}
        />
        
        <DeleteConfirmDialog
          open={!!deletingJob}
          onOpenChange={(open) => !open && setDeletingJob(null)}
          onConfirm={handleDeleteJob}
          title="Delete Job Opening"
          description="Are you sure you want to delete this job opening? This action cannot be undone and will remove all associated applications."
          itemName={deletingJob?.title}
        />
      </main>
    </div>
  );
};

export default JobOpenings;