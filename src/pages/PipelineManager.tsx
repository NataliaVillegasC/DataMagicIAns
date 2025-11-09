import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  ChevronRight,
  X,
  Check
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Application {
  id: string;
  status: 'applied' | 'screening' | 'interview_scheduled' | 'interviewing' | 'offer' | 'accepted' | 'rejected' | 'withdrawn';
  candidate_id: string;
  ai_match_score?: number;
  candidates: {
    id: string;
    full_name: string;
    email: string;
    phone?: string;
    location?: string;
    current_position?: string;
    current_company?: string;
    years_experience?: number;
    extracted_skills?: any;
  };
}

const PIPELINE_STAGES = [
  { id: 'applied', label: 'Applied', color: 'bg-blue-100 border-blue-300 text-blue-700' },
  { id: 'screening', label: 'Screening', color: 'bg-yellow-100 border-yellow-300 text-yellow-700' },
  { id: 'interview_scheduled', label: 'Interview Scheduled', color: 'bg-purple-100 border-purple-300 text-purple-700' },
  { id: 'interviewing', label: 'Interviewing', color: 'bg-indigo-100 border-indigo-300 text-indigo-700' },
  { id: 'offer', label: 'Offer', color: 'bg-green-100 border-green-300 text-green-700' },
  { id: 'accepted', label: 'Accepted', color: 'bg-emerald-100 border-emerald-300 text-emerald-700' },
  { id: 'rejected', label: 'Rejected', color: 'bg-red-100 border-red-300 text-red-700' },
];

const PipelineManager = () => {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const [job, setJob] = useState<any>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCandidate, setSelectedCandidate] = useState<Application | null>(null);
  const [isMoving, setIsMoving] = useState(false);

  useEffect(() => {
    if (jobId) {
      loadPipelineData();
    }
  }, [jobId]);

  const loadPipelineData = async () => {
    try {
      setIsLoading(true);
      
      // Load job opening details
      const { data: jobData, error: jobError } = await supabase
        .from('job_openings')
        .select('*')
        .eq('id', jobId)
        .single();
      
      if (jobError) throw jobError;
      setJob(jobData);
      
      // Load all applications with candidate details
      const { data: applicationsData, error: appsError } = await supabase
        .from('applications')
        .select(`
          id,
          status,
          candidate_id,
          ai_match_score,
          candidates (
            id,
            full_name,
            email,
            phone,
            location,
            current_position,
            current_company,
            years_experience,
            extracted_skills
          )
        `)
        .eq('job_opening_id', jobId);
      
      if (appsError) throw appsError;
      setApplications(applicationsData as Application[] || []);
    } catch (error: any) {
      console.error('Error loading pipeline:', error);
      toast({
        title: "Error",
        description: "Failed to load pipeline data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusChange = async (applicationId: string, newStatus: string) => {
    try {
      setIsMoving(true);
      
      const { error } = await supabase
        .from('applications')
        .update({ 
          status: newStatus as 'applied' | 'screening' | 'interview_scheduled' | 'interviewing' | 'offer' | 'accepted' | 'rejected' | 'withdrawn',
          updated_at: new Date().toISOString()
        })
        .eq('id', applicationId);
      
      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Candidate moved successfully",
      });
      
      // Reload data
      await loadPipelineData();
      setSelectedCandidate(null);
    } catch (error: any) {
      console.error('Error updating status:', error);
      toast({
        title: "Error",
        description: "Failed to move candidate",
        variant: "destructive",
      });
    } finally {
      setIsMoving(false);
    }
  };

  const getApplicationsByStage = (stageId: string) => {
    return applications.filter(app => app.status === stageId);
  };

  const getNextStage = (currentStage: string) => {
    const currentIndex = PIPELINE_STAGES.findIndex(s => s.id === currentStage);
    if (currentIndex < PIPELINE_STAGES.length - 1) {
      return PIPELINE_STAGES[currentIndex + 1];
    }
    return null;
  };

  const getPreviousStage = (currentStage: string) => {
    const currentIndex = PIPELINE_STAGES.findIndex(s => s.id === currentStage);
    if (currentIndex > 0) {
      return PIPELINE_STAGES[currentIndex - 1];
    }
    return null;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />
        <main className="flex-1 container mx-auto px-4 py-8">
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">Loading pipeline...</p>
          </Card>
        </main>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />
        <main className="flex-1 container mx-auto px-4 py-8">
          <Card className="p-8 text-center">
            <p className="text-muted-foreground mb-4">Job opening not found</p>
            <Button onClick={() => navigate('/openings')}>
              Back to Openings
            </Button>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      
      <main className="flex-1 container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/openings')}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Openings
          </Button>
          
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold mb-2">
                Pipeline: {job.title}
              </h1>
              <p className="text-muted-foreground">
                {job.department} • {applications.length} total candidates
              </p>
            </div>
            <Link to={`/search?jobId=${jobId}`}>
              <Button variant="outline">
                View All Candidates
              </Button>
            </Link>
          </div>
        </div>

        {/* Pipeline Stages */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-4">
          {PIPELINE_STAGES.map((stage) => {
            const stageApplications = getApplicationsByStage(stage.id);
            
            return (
              <Card key={stage.id} className="p-4">
                <div className="mb-4">
                  <Badge className={`${stage.color} mb-2`}>
                    {stage.label}
                  </Badge>
                  <p className="text-sm text-muted-foreground">
                    {stageApplications.length} candidate{stageApplications.length !== 1 ? 's' : ''}
                  </p>
                </div>
                
                <div className="space-y-3">
                  {stageApplications.map((app) => (
                    <Card 
                      key={app.id}
                      className="p-3 cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => setSelectedCandidate(app)}
                    >
                      <div className="flex items-start gap-2 mb-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                          {app.candidates.full_name?.split(' ').map(n => n[0]).join('') || 'U'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">
                            {app.candidates.full_name}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {app.candidates.current_position || 'No position'}
                          </p>
                        </div>
                      </div>
                      
                      {app.ai_match_score && (
                        <div className="mt-2">
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-muted-foreground">Match</span>
                            <span className="font-medium">{app.ai_match_score}%</span>
                          </div>
                          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-primary rounded-full"
                              style={{ width: `${app.ai_match_score}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </Card>
                  ))}
                  
                  {stageApplications.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-4">
                      No candidates
                    </p>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      </main>

      {/* Candidate Detail Dialog */}
      <Dialog open={!!selectedCandidate} onOpenChange={(open) => !open && setSelectedCandidate(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Candidate Details</DialogTitle>
            <DialogDescription>
              Manage candidate pipeline stage and view details
            </DialogDescription>
          </DialogHeader>
          
          {selectedCandidate && (
            <div className="space-y-6">
              {/* Candidate Info */}
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white text-2xl font-bold flex-shrink-0">
                  {selectedCandidate.candidates.full_name?.split(' ').map(n => n[0]).join('') || 'U'}
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold mb-1">
                    {selectedCandidate.candidates.full_name}
                  </h3>
                  <p className="text-muted-foreground mb-3">
                    {selectedCandidate.candidates.current_position} at {selectedCandidate.candidates.current_company}
                  </p>
                  
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    {selectedCandidate.candidates.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span className="truncate">{selectedCandidate.candidates.email}</span>
                      </div>
                    )}
                    {selectedCandidate.candidates.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span>{selectedCandidate.candidates.phone}</span>
                      </div>
                    )}
                    {selectedCandidate.candidates.location && (
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span>{selectedCandidate.candidates.location}</span>
                      </div>
                    )}
                    {selectedCandidate.candidates.years_experience && (
                      <div className="flex items-center gap-2">
                        <Briefcase className="h-4 w-4 text-muted-foreground" />
                        <span>{selectedCandidate.candidates.years_experience} years exp.</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Skills */}
              {selectedCandidate.candidates.extracted_skills && Array.isArray(selectedCandidate.candidates.extracted_skills) && selectedCandidate.candidates.extracted_skills.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2">Skills</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedCandidate.candidates.extracted_skills.slice(0, 8).map((skill: any, idx: number) => (
                      <Badge key={idx} variant="secondary">
                        {skill.name || skill}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Current Stage */}
              <div>
                <h4 className="font-semibold mb-3">Current Stage</h4>
                <div className="flex items-center gap-3">
                  <Badge className={PIPELINE_STAGES.find(s => s.id === selectedCandidate.status)?.color || ''}>
                    {PIPELINE_STAGES.find(s => s.id === selectedCandidate.status)?.label}
                  </Badge>
                  {selectedCandidate.ai_match_score && (
                    <span className="text-sm text-muted-foreground">
                      Match Score: <span className="font-semibold">{selectedCandidate.ai_match_score}%</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Move Actions */}
              <div>
                <h4 className="font-semibold mb-3">Move Candidate</h4>
                <div className="space-y-3">
                  <Select
                    value={selectedCandidate.status}
                    onValueChange={(value) => handleStatusChange(selectedCandidate.id, value)}
                    disabled={isMoving}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PIPELINE_STAGES.map((stage) => (
                        <SelectItem key={stage.id} value={stage.id}>
                          {stage.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <div className="flex gap-2">
                    {getPreviousStage(selectedCandidate.status) && (
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() => {
                          const prevStage = getPreviousStage(selectedCandidate.status);
                          if (prevStage) {
                            handleStatusChange(selectedCandidate.id, prevStage.id);
                          }
                        }}
                        disabled={isMoving}
                      >
                        ← Move to {getPreviousStage(selectedCandidate.status)?.label}
                      </Button>
                    )}
                    
                    {getNextStage(selectedCandidate.status) && (
                      <Button
                        className="flex-1"
                        onClick={() => {
                          const nextStage = getNextStage(selectedCandidate.status);
                          if (nextStage) {
                            handleStatusChange(selectedCandidate.id, nextStage.id);
                          }
                        }}
                        disabled={isMoving}
                      >
                        Move to {getNextStage(selectedCandidate.status)?.label} →
                      </Button>
                    )}
                  </div>

                  <div className="flex gap-2">
                    {selectedCandidate.status !== 'rejected' && (
                      <Button
                        variant="destructive"
                        className="flex-1"
                        onClick={() => handleStatusChange(selectedCandidate.id, 'rejected')}
                        disabled={isMoving}
                      >
                        <X className="h-4 w-4 mr-2" />
                        Reject
                      </Button>
                    )}
                    
                    {selectedCandidate.status === 'offer' && (
                      <Button
                        variant="default"
                        className="flex-1 bg-green-600 hover:bg-green-700"
                        onClick={() => handleStatusChange(selectedCandidate.id, 'accepted')}
                        disabled={isMoving}
                      >
                        <Check className="h-4 w-4 mr-2" />
                        Mark as Accepted
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="flex gap-2 pt-4 border-t">
                <Link to={`/candidates/${selectedCandidate.candidate_id}`} className="flex-1">
                  <Button variant="outline" className="w-full">
                    View Full Profile
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PipelineManager;
