import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquare, Save, X } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { updateCandidate } from "@/lib/supabase";

interface NotesSectionProps {
  candidateId: string;
  initialNotes: string | null;
  onNotesUpdated: (notes: string) => void;
}

export const NotesSection = ({ candidateId, initialNotes, onNotesUpdated }: NotesSectionProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [notes, setNotes] = useState(initialNotes || "");
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateCandidate(candidateId, { notes });
      onNotesUpdated(notes);
      setIsEditing(false);
      toast({
        title: "Notes saved",
        description: "Candidate notes have been updated successfully.",
      });
    } catch (error: any) {
      console.error('Error saving notes:', error);
      toast({
        title: "Error",
        description: "Failed to save notes. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setNotes(initialNotes || "");
    setIsEditing(false);
  };

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Notes
        </h3>
        {!isEditing && (
          <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
            Edit Notes
          </Button>
        )}
      </div>

      {isEditing ? (
        <div className="space-y-4">
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add notes about this candidate..."
            className="min-h-[200px]"
          />
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={handleCancel} disabled={isSaving}>
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? "Saving..." : "Save Notes"}
            </Button>
          </div>
        </div>
      ) : (
        <div className="prose max-w-none">
          {notes ? (
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{notes}</p>
          ) : (
            <p className="text-sm text-muted-foreground italic">No notes added yet.</p>
          )}
        </div>
      )}
    </Card>
  );
};
