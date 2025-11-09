import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createApplication } from "@/lib/supabase";
import { toast } from "@/hooks/use-toast";
import { Plus, Loader2 } from "lucide-react";

interface AddApplicationDialogProps {
  candidates?: any[];
  jobOpenings?: any[];
  candidateId?: string;
  jobId?: string;
  onSuccess?: () => void;
  trigger?: React.ReactNode;
}

export const AddApplicationDialog = ({ 
  candidates, 
  jobOpenings, 
  candidateId, 
  jobId, 
  onSuccess,
  trigger 
}: AddApplicationDialogProps) => {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState(candidateId || "");
  const [selectedJob, setSelectedJob] = useState(jobId || "");

  const handleSubmit = async () => {
    if (!selectedCandidate || !selectedJob) {
      toast({
        title: "Error",
        description: "Please select both a candidate and a job opening",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSubmitting(true);
      await createApplication(selectedCandidate, selectedJob);
      toast({
        title: "Success",
        description: "Application created successfully",
      });
      setOpen(false);
      setSelectedCandidate(candidateId || "");
      setSelectedJob(jobId || "");
      onSuccess?.();
    } catch (error: any) {
      console.error('Error creating application:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create application",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Application
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Candidate to Job Opening</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          {!candidateId && candidates && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Candidate</label>
              <Select value={selectedCandidate} onValueChange={setSelectedCandidate}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a candidate" />
                </SelectTrigger>
                <SelectContent>
                  {candidates.map((candidate) => (
                    <SelectItem key={candidate.id} value={candidate.id}>
                      {candidate.full_name} - {candidate.current_position || 'No position'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {!jobId && jobOpenings && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Job Opening</label>
              <Select value={selectedJob} onValueChange={setSelectedJob}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a job opening" />
                </SelectTrigger>
                <SelectContent>
                  {jobOpenings.map((job) => (
                    <SelectItem key={job.id} value={job.id}>
                      {job.title} - {job.department || 'No department'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Application'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
