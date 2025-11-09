import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

interface ScheduleInterviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  candidateId: string;
  candidateName: string;
}

export const ScheduleInterviewDialog = ({
  open,
  onOpenChange,
  candidateId,
  candidateName
}: ScheduleInterviewDialogProps) => {
  const [interviewDate, setInterviewDate] = useState("");
  const [interviewTime, setInterviewTime] = useState("");
  const [duration, setDuration] = useState("60");
  const [interviewType, setInterviewType] = useState("Phone Screening");
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSchedule = async () => {
    if (!interviewDate || !interviewTime || !location.trim()) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    // Validate date is in the future
    const selectedDateTime = new Date(`${interviewDate}T${interviewTime}`);
    if (selectedDateTime <= new Date()) {
      toast({
        title: "Error",
        description: "Interview date must be in the future",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase.functions.invoke('schedule-interview', {
        body: {
          candidateId,
          interviewDate,
          interviewTime,
          duration: parseInt(duration),
          location: location.trim(),
          notes: notes.trim(),
          interviewType,
        }
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Interview scheduled and calendar invites sent",
      });

      // Reset form
      setInterviewDate("");
      setInterviewTime("");
      setDuration("60");
      setInterviewType("Phone Screening");
      setLocation("");
      setNotes("");
      onOpenChange(false);
      
      // Reload page to show new interview
      setTimeout(() => window.location.reload(), 500);
    } catch (error: any) {
      console.error('Error scheduling interview:', error);
      toast({
        title: "Error",
        description: "Failed to schedule interview. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Schedule Interview with {candidateName}</DialogTitle>
          <DialogDescription>
            Schedule an interview and send calendar invites to both you and the candidate
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="interview-type">Interview Type *</Label>
            <Select value={interviewType} onValueChange={setInterviewType}>
              <SelectTrigger id="interview-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Phone Screening">Phone Screening</SelectItem>
                <SelectItem value="Technical Interview">Technical Interview</SelectItem>
                <SelectItem value="Behavioral Interview">Behavioral Interview</SelectItem>
                <SelectItem value="Final Interview">Final Interview</SelectItem>
                <SelectItem value="Video Call">Video Call</SelectItem>
                <SelectItem value="On-site Interview">On-site Interview</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date">Date *</Label>
              <Input
                id="date"
                type="date"
                value={interviewDate}
                onChange={(e) => setInterviewDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="time">Time *</Label>
              <Input
                id="time"
                type="time"
                value={interviewTime}
                onChange={(e) => setInterviewTime(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="duration">Duration *</Label>
            <Select value={duration} onValueChange={setDuration}>
              <SelectTrigger id="duration">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="30">30 minutes</SelectItem>
                <SelectItem value="45">45 minutes</SelectItem>
                <SelectItem value="60">1 hour</SelectItem>
                <SelectItem value="90">1.5 hours</SelectItem>
                <SelectItem value="120">2 hours</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Location / Meeting Link *</Label>
            <Input
              id="location"
              placeholder="e.g., Zoom link, office address, phone number"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              maxLength={300}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Additional Notes</Label>
            <Textarea
              id="notes"
              placeholder="Any additional information for the candidate..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              maxLength={1000}
            />
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button onClick={handleSchedule} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Scheduling...
              </>
            ) : (
              "Schedule Interview"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
