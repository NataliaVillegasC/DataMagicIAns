import { useState, useEffect } from "react";
import { Navbar } from "@/components/Navbar";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getAllCandidates, deleteCandidate } from "@/lib/supabase";
import { Link, useSearchParams } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  Search as SearchIcon,
  MapPin,
  Briefcase,
  Mail,
  Calendar,
  SlidersHorizontal,
  Edit,
  Trash2,
  Upload,
  Plus
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EditCandidateDialog } from "@/components/EditCandidateDialog";
import { DeleteConfirmDialog } from "@/components/DeleteConfirmDialog";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

const Search = () => {
  const [searchParams] = useSearchParams();
  const jobOpeningId = searchParams.get('jobId');
  
  const [candidates, setCandidates] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [locationFilter, setLocationFilter] = useState("all");
  const [experienceFilter, setExperienceFilter] = useState("all");
  const [sortBy, setSortBy] = useState("recent");
  const [editingCandidate, setEditingCandidate] = useState<any>(null);
  const [deletingCandidate, setDeletingCandidate] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [jobTitle, setJobTitle] = useState<string>("");
  const [availableLocations, setAvailableLocations] = useState<string[]>([]);
  
  const itemsPerPage = 10;

  useEffect(() => {
    loadCandidates();
  }, []);

  useEffect(() => {
    // Reset status filter when switching between all candidates and job-specific view
    setStatusFilter("all");
  }, [jobOpeningId]);

  const loadCandidates = async () => {
    try {
      setIsLoading(true);
      let loadedCandidates: any[] = [];
      
      if (jobOpeningId) {
        // Load candidates filtered by job opening
        const { data: jobData } = await supabase
          .from('job_openings')
          .select('title')
          .eq('id', jobOpeningId)
          .single();
        
        if (jobData) {
          setJobTitle(jobData.title);
        }
        
        const { data: applications, error: appsError } = await supabase
          .from('applications')
          .select(`
            id,
            status,
            candidate_id,
            candidates (*)
          `)
          .eq('job_opening_id', jobOpeningId);
        
        if (appsError) throw appsError;
        
        loadedCandidates = applications?.map(app => ({
          ...app.candidates,
          application_status: app.status,
          application_id: app.id
        })) || [];
        
        setCandidates(loadedCandidates);
      } else {
        const data = await getAllCandidates();
        loadedCandidates = data || [];
        setCandidates(loadedCandidates);
      }
      
      // Extract unique locations for filter
      const locations = Array.from(new Set(
        loadedCandidates
          .map((c: any) => c.location)
          .filter((l: string) => l)
      )) as string[];
      setAvailableLocations(locations);
    } catch (error: any) {
      console.error('Error loading candidates:', error);
      toast({
        title: "Error",
        description: "Failed to load candidates",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteCandidate = async () => {
    if (!deletingCandidate) return;
    
    try {
      await deleteCandidate(deletingCandidate.id);
      toast({
        title: "Success",
        description: "Candidate deleted successfully",
      });
      loadCandidates();
      setDeletingCandidate(null);
    } catch (error: any) {
      console.error('Error deleting candidate:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete candidate",
        variant: "destructive",
      });
    }
  };

  const filteredCandidates = candidates.filter(candidate => {
    // Comprehensive search across multiple fields
    const matchesSearch = searchTerm === "" || 
      candidate.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      candidate.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      candidate.current_position?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      candidate.current_company?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      candidate.location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (Array.isArray(candidate.extracted_skills) && 
        candidate.extracted_skills.some((skill: string) => 
          skill.toLowerCase().includes(searchTerm.toLowerCase())
        ));
    
    // When viewing job-specific candidates, filter by application_status
    // When viewing all candidates, filter by candidate status
    const matchesStatus = statusFilter === "all" || 
      (jobOpeningId 
        ? candidate.application_status === statusFilter 
        : candidate.status === statusFilter);
    
    const matchesLocation = locationFilter === "all" || candidate.location === locationFilter;
    
    const matchesExperience = experienceFilter === "all" || (() => {
      const years = candidate.years_experience || 0;
      switch(experienceFilter) {
        case "0-2": return years >= 0 && years <= 2;
        case "3-5": return years >= 3 && years <= 5;
        case "6-10": return years >= 6 && years <= 10;
        case "10+": return years >= 10;
        default: return true;
      }
    })();
    
    return matchesSearch && matchesStatus && matchesLocation && matchesExperience;
  });

  // Sort candidates based on selected option
  const sortedCandidates = [...filteredCandidates].sort((a, b) => {
    switch(sortBy) {
      case "recent":
        return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
      case "experience":
        return (b.years_experience || 0) - (a.years_experience || 0);
      case "name":
        return (a.full_name || '').localeCompare(b.full_name || '');
      default:
        return 0;
    }
  });

  const getScoreColor = (score: number) => {
    if (score >= 85) return "bg-success/10 text-success border-success/20";
    if (score >= 70) return "bg-primary/10 text-primary border-primary/20";
    return "bg-warning/10 text-warning border-warning/20";
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case "applied": return "bg-muted text-muted-foreground border-muted";
      case "screening": return "bg-primary/10 text-primary border-primary/20";
      case "interview_scheduled": return "bg-accent/10 text-accent border-accent/20";
      case "interviewing": return "bg-accent/10 text-accent border-accent/20";
      case "offer": return "bg-success/10 text-success border-success/20";
      case "accepted": return "bg-success/10 text-success border-success/20";
      case "hired": return "bg-success/10 text-success border-success/20";
      case "rejected": return "bg-destructive/10 text-destructive border-destructive/20";
      case "withdrawn": return "bg-muted text-muted-foreground border-muted";
      case "new": return "bg-muted text-muted-foreground border-muted";
      default: return "bg-muted text-muted-foreground border-muted";
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-2">
            {jobOpeningId ? `Candidates for ${jobTitle}` : 'Candidate Search & Sourcing'}
          </h1>
          <p className="text-muted-foreground">
            {jobOpeningId 
              ? `Viewing all candidates who applied to this position` 
              : 'Find and evaluate candidates with AI-powered matching'}
          </p>
          {jobOpeningId && (
            <Link to="/search" className="inline-block mt-2">
              <Button variant="outline" size="sm">
                View All Candidates
              </Button>
            </Link>
          )}
        </div>

        {/* Search Bar */}
        <Card className="p-6 mb-6">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="Search candidates, skills, companies..."
                className="pl-10 text-lg h-12"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button size="lg" onClick={() => setShowFilters(!showFilters)}>
              <SlidersHorizontal className="h-5 w-5 mr-2" />
              Filters
            </Button>
            <Link to="/candidates/import">
              <Button size="lg" variant="outline">
                <Upload className="h-5 w-5 mr-2" />
                Bulk Import
              </Button>
            </Link>
            <Link to="/candidates/upload">
              <Button size="lg">
                <Plus className="h-5 w-5 mr-2" />
                Add Candidate
              </Button>
            </Link>
          </div>

          {/* Advanced Filters */}
          {showFilters && (
            <div className="mt-6 pt-6 border-t border-border grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Status</label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    {jobOpeningId ? (
                      // Application statuses when viewing job-specific candidates
                      <>
                        <SelectItem value="applied">Applied</SelectItem>
                        <SelectItem value="screening">Screening</SelectItem>
                        <SelectItem value="interview_scheduled">Interview Scheduled</SelectItem>
                        <SelectItem value="interviewing">Interviewing</SelectItem>
                        <SelectItem value="offer">Offer</SelectItem>
                        <SelectItem value="accepted">Accepted</SelectItem>
                        <SelectItem value="rejected">Rejected</SelectItem>
                        <SelectItem value="withdrawn">Withdrawn</SelectItem>
                      </>
                    ) : (
                      // Candidate statuses when viewing all candidates
                      <>
                        <SelectItem value="new">New</SelectItem>
                        <SelectItem value="screening">Screening</SelectItem>
                        <SelectItem value="interviewing">Interviewing</SelectItem>
                        <SelectItem value="offer">Offer</SelectItem>
                        <SelectItem value="hired">Hired</SelectItem>
                        <SelectItem value="rejected">Rejected</SelectItem>
                        <SelectItem value="withdrawn">Withdrawn</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Location</label>
                <Select value={locationFilter} onValueChange={setLocationFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select location" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Locations</SelectItem>
                    {availableLocations.map(loc => (
                      <SelectItem key={loc} value={loc}>{loc}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Years Experience</label>
                <Select value={experienceFilter} onValueChange={setExperienceFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select experience" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Experience</SelectItem>
                    <SelectItem value="0-2">0-2 years</SelectItem>
                    <SelectItem value="3-5">3-5 years</SelectItem>
                    <SelectItem value="6-10">6-10 years</SelectItem>
                    <SelectItem value="10+">10+ years</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </Card>

        {/* Results Header */}
        <div className="flex justify-between items-center mb-6">
          <p className="text-sm text-muted-foreground">
            Found {filteredCandidates.length} candidates matching your criteria
          </p>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="recent">Most Recent</SelectItem>
              <SelectItem value="experience">Experience</SelectItem>
              <SelectItem value="name">Name (A-Z)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Candidate Cards */}
        {isLoading ? (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">Loading candidates...</p>
          </Card>
        ) : filteredCandidates.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground mb-4">No candidates found</p>
            <Link to="/candidates/upload">
              <Button>
                <SearchIcon className="h-4 w-4 mr-2" />
                Add First Candidate
              </Button>
            </Link>
          </Card>
        ) : (
          <>
            <div className="space-y-4">
              {sortedCandidates.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((candidate) => (
            <Card key={candidate.id} className="p-6 hover:border-primary/50 transition-colors">
              <div className="flex flex-col md:flex-row gap-6">
                {/* Left - Avatar & Basic Info */}
                <div className="flex gap-4 md:w-1/3">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white text-2xl font-bold flex-shrink-0">
                    {candidate.full_name?.split(' ').map((n: string) => n[0]).join('') || 'U'}
                  </div>
                  <div className="flex-1">
                    <Link to={`/candidates/${candidate.id}`}>
                      <h3 className="font-semibold text-lg hover:text-primary mb-1">
                        {candidate.full_name || 'Unnamed'}
                      </h3>
                    </Link>
                    <p className="text-sm text-muted-foreground mb-1">{candidate.current_position || 'No position'}</p>
                    <p className="text-sm text-muted-foreground">{candidate.current_company || 'No company'}</p>
                    {candidate.location && (
                      <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        <span>{candidate.location}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Middle - Status & Skills */}
                <div className="flex-1">
                  <div className="flex items-center gap-4 mb-3">
                    <Badge variant="outline" className={getStatusColor(
                      jobOpeningId ? (candidate.application_status || 'applied') : (candidate.status || 'new')
                    )}>
                      {(jobOpeningId 
                        ? (candidate.application_status || 'applied') 
                        : (candidate.status || 'new')
                      ).replace(/_/g, ' ')}
                    </Badge>
                    <span className="text-sm text-muted-foreground">{candidate.email}</span>
                  </div>

                  {candidate.extracted_skills && Array.isArray(candidate.extracted_skills) && candidate.extracted_skills.length > 0 && (
                    <div className="flex gap-2 flex-wrap mb-3">
                      {candidate.extracted_skills.slice(0, 5).map((skill: string, idx: number) => (
                        <Badge 
                          key={idx} 
                          variant="default"
                          className="text-xs"
                        >
                          {skill}
                        </Badge>
                      ))}
                      {candidate.extracted_skills.length > 5 && (
                        <Badge variant="secondary" className="text-xs">
                          +{candidate.extracted_skills.length - 5} more
                        </Badge>
                      )}
                    </div>
                  )}

                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    {candidate.years_experience && (
                      <div className="flex items-center gap-1">
                        <Briefcase className="h-3 w-3" />
                        <span>{candidate.years_experience} years</span>
                      </div>
                    )}
                    {candidate.availability && (
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        <span>Available: {candidate.availability}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right - Actions */}
                <div className="flex flex-col gap-2 md:w-48">
                  <Link to={`/candidates/${candidate.id}`}>
                    <Button className="w-full">
                      View Profile
                    </Button>
                  </Link>
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => setEditingCandidate(candidate)}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full text-destructive hover:text-destructive"
                    onClick={() => setDeletingCandidate(candidate)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                </div>
              </div>

              {/* Notes Preview */}
              {candidate.notes && (
                <div className="mt-4 pt-4 border-t border-border">
                  <p className="text-sm">
                    <span className="font-medium">Notes:</span>{' '}
                    <span className="text-muted-foreground">
                      {candidate.notes}
                    </span>
                  </p>
                </div>
              )}
            </Card>
              ))}
            </div>
            
            {sortedCandidates.length > itemsPerPage && (
              <div className="mt-8">
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious 
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                      />
                    </PaginationItem>
                    {Array.from({ length: Math.ceil(sortedCandidates.length / itemsPerPage) }, (_, i) => i + 1).map((page) => (
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
                        onClick={() => setCurrentPage(prev => Math.min(Math.ceil(sortedCandidates.length / itemsPerPage), prev + 1))}
                        className={currentPage === Math.ceil(sortedCandidates.length / itemsPerPage) ? "pointer-events-none opacity-50" : "cursor-pointer"}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </>
        )}
        
        {/* Dialogs */}
        <EditCandidateDialog
          candidate={editingCandidate}
          open={!!editingCandidate}
          onOpenChange={(open) => !open && setEditingCandidate(null)}
          onSuccess={loadCandidates}
        />
        
        <DeleteConfirmDialog
          open={!!deletingCandidate}
          onOpenChange={(open) => !open && setDeletingCandidate(null)}
          onConfirm={handleDeleteCandidate}
          title="Delete Candidate"
          description="Are you sure you want to delete this candidate? This action cannot be undone and will remove all associated data."
          itemName={deletingCandidate?.full_name}
        />
      </main>
    </div>
  );
};

export default Search;
