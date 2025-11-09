import { useState, useEffect, useMemo } from "react";
import { Navbar } from "@/components/Navbar";
import { Card } from "@/components/ui/card";
import { Calendar, momentLocalizer, View } from "react-big-calendar";
import moment from "moment";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Calendar as CalendarIcon, MapPin, Clock, User } from "lucide-react";
import { useNavigate } from "react-router-dom";

const localizer = momentLocalizer(moment);

interface InterviewEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resource: {
    candidateId: string;
    candidateName: string;
    type: string;
    location: string;
    notes: string;
    status: string;
  };
}

const InterviewsCalendar = () => {
  const navigate = useNavigate();
  const [interviews, setInterviews] = useState<InterviewEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [view, setView] = useState<View>("month");
  const [selectedEvent, setSelectedEvent] = useState<InterviewEvent | null>(null);

  useEffect(() => {
    loadInterviews();

    // Set up realtime subscription
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'interviews'
        },
        () => {
          loadInterviews();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadInterviews = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('interviews')
        .select(`
          id,
          interview_type,
          scheduled_date,
          duration_minutes,
          location,
          notes,
          status,
          candidate_id,
          candidates (
            full_name,
            email
          )
        `)
        .order('scheduled_date', { ascending: true });

      if (error) throw error;

      const events: InterviewEvent[] = (data || []).map((interview: any) => {
        const start = new Date(interview.scheduled_date);
        const end = new Date(start.getTime() + interview.duration_minutes * 60000);
        
        return {
          id: interview.id,
          title: `${interview.candidates?.full_name || 'Unknown'} - ${interview.interview_type}`,
          start,
          end,
          resource: {
            candidateId: interview.candidate_id,
            candidateName: interview.candidates?.full_name || 'Unknown',
            type: interview.interview_type,
            location: interview.location,
            notes: interview.notes,
            status: interview.status,
          }
        };
      });

      setInterviews(events);
    } catch (error: any) {
      console.error('Error loading interviews:', error);
      toast({
        title: "Error",
        description: "Failed to load interviews",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const eventStyleGetter = (event: InterviewEvent) => {
    let backgroundColor = '#3b82f6'; // primary blue
    
    if (event.resource.status === 'completed') {
      backgroundColor = '#22c55e'; // green
    } else if (event.resource.status === 'cancelled') {
      backgroundColor = '#ef4444'; // red
    } else if (new Date(event.start) < new Date()) {
      backgroundColor = '#f59e0b'; // amber
    }

    return {
      style: {
        backgroundColor,
        borderRadius: '4px',
        opacity: 0.9,
        color: 'white',
        border: '0px',
        display: 'block'
      }
    };
  };

  const handleSelectEvent = (event: InterviewEvent) => {
    setSelectedEvent(event);
  };

  const handleNavigateToCandidate = () => {
    if (selectedEvent) {
      navigate(`/candidates/${selectedEvent.resource.candidateId}`);
    }
  };

  const { components } = useMemo(() => ({
    components: {
      event: ({ event }: { event: InterviewEvent }) => (
        <div className="text-xs p-1 truncate">
          <div className="font-medium">{event.resource.candidateName}</div>
          <div className="opacity-90">{event.resource.type}</div>
        </div>
      ),
    },
  }), []);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto py-8 px-4">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Interview Calendar</h1>
          <p className="text-muted-foreground">
            View and manage all scheduled interviews across candidates
          </p>
        </div>

        <Card className="p-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              <p className="ml-4 text-muted-foreground">Loading interviews...</p>
            </div>
          ) : (
            <div className="calendar-container" style={{ height: '700px' }}>
              <Calendar
                localizer={localizer}
                events={interviews}
                startAccessor="start"
                endAccessor="end"
                view={view}
                onView={setView}
                views={['month', 'week', 'day', 'agenda']}
                eventPropGetter={eventStyleGetter}
                onSelectEvent={handleSelectEvent}
                components={components}
                popup
                selectable
                style={{ height: '100%' }}
              />
            </div>
          )}
        </Card>

        {/* Event Details Dialog */}
        <Dialog open={!!selectedEvent} onOpenChange={() => setSelectedEvent(null)}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Interview Details</DialogTitle>
            </DialogHeader>
            
            {selectedEvent && (
              <div className="space-y-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <User className="h-5 w-5 text-primary" />
                    <h3 className="text-lg font-semibold">{selectedEvent.resource.candidateName}</h3>
                  </div>
                  <Badge variant={selectedEvent.resource.status === 'scheduled' ? 'default' : 'secondary'}>
                    {selectedEvent.resource.status}
                  </Badge>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Type:</span>
                    <span>{selectedEvent.resource.type}</span>
                  </div>

                  <div className="flex items-center gap-2 text-sm">
                    <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Date & Time:</span>
                    <span>{moment(selectedEvent.start).format('MMMM D, YYYY [at] h:mm A')}</span>
                  </div>

                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Duration:</span>
                    <span>{moment(selectedEvent.end).diff(moment(selectedEvent.start), 'minutes')} minutes</span>
                  </div>

                  {selectedEvent.resource.location && (
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">Location:</span>
                      <span className="break-all">{selectedEvent.resource.location}</span>
                    </div>
                  )}

                  {selectedEvent.resource.notes && (
                    <div className="mt-4 pt-4 border-t">
                      <p className="text-sm font-medium mb-2">Notes:</p>
                      <p className="text-sm text-muted-foreground p-3 bg-muted/30 rounded-lg">
                        {selectedEvent.resource.notes}
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex gap-2 pt-4">
                  <Button onClick={handleNavigateToCandidate} className="flex-1">
                    View Candidate Profile
                  </Button>
                  <Button variant="outline" onClick={() => setSelectedEvent(null)}>
                    Close
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};

export default InterviewsCalendar;
