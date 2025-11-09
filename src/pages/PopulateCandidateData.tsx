import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Navbar } from "@/components/Navbar";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { Progress } from "@/components/ui/progress";

export default function PopulateCandidateData() {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentBatch, setCurrentBatch] = useState(0);
  const [totalStats, setTotalStats] = useState({
    updated: 0,
    surveys: 0,
    applications: 0,
    interviews: 0,
    totalProcessed: 0
  });
  const { toast } = useToast();

  const handlePopulate = async () => {
    setLoading(true);
    setProgress(0);
    setCurrentBatch(1);
    setTotalStats({
      updated: 0,
      surveys: 0,
      applications: 0,
      interviews: 0,
      totalProcessed: 0
    });

    try {
      console.log('Starting database population...');
      
      // Simulate progress stages
      const stages = [
        { progress: 10, message: 'Cleaning existing data...' },
        { progress: 30, message: 'Creating job openings...' },
        { progress: 50, message: 'Creating candidates...' },
        { progress: 70, message: 'Generating surveys...' },
        { progress: 85, message: 'Creating applications...' },
        { progress: 95, message: 'Scheduling interviews...' }
      ];

      // Update progress through stages
      for (const stage of stages) {
        setProgress(stage.progress);
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      const { data, error } = await supabase.functions.invoke('populate-database');

      if (error) {
        console.error('Error invoking function:', error);
        toast({
          title: "Error",
          description: error.message || "Failed to populate database",
          variant: "destructive",
        });
        return;
      }

      if (data && data.success) {
        setProgress(100);
        setTotalStats({
          updated: data.stats.candidates,
          surveys: data.stats.surveys,
          applications: data.stats.applications,
          interviews: data.stats.interviews,
          totalProcessed: data.stats.candidates + data.stats.jobOpenings
        });

        toast({
          title: "Success",
          description: `Created ${data.stats.jobOpenings} job openings, ${data.stats.candidates} candidates, ${data.stats.surveys} surveys, ${data.stats.applications} applications, and ${data.stats.interviews} interviews`,
        });
      } else {
        throw new Error('Unexpected response from server');
      }
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle>Populate Candidate Data</CardTitle>
            <CardDescription>
              This will create diverse job openings and candidates across various professions, generate surveys,
              applications, and interviews. Warning: This will delete existing data (except candidate with CV).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Button
              onClick={handlePopulate}
              disabled={loading}
              size="lg"
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Populating Database...
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-2 h-5 w-5" />
                  Start Population
                </>
              )}
            </Button>

            {loading && (
              <div className="space-y-2">
                <Progress value={progress} className="w-full" />
                <p className="text-sm text-muted-foreground text-center">
                  {Math.round(progress)}% Complete
                </p>
              </div>
            )}

            {!loading && totalStats.totalProcessed > 0 && (
              <Card className="border-green-200 bg-green-50">
                <CardHeader>
                  <CardTitle className="text-green-900 flex items-center">
                    <CheckCircle2 className="mr-2 h-5 w-5" />
                    Process Complete
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm text-green-900">
                    <div className="flex justify-between">
                      <span className="font-medium">Job Openings Created:</span>
                      <span>{totalStats.totalProcessed - totalStats.updated}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">Candidates Created:</span>
                      <span>{totalStats.updated}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">Surveys Generated:</span>
                      <span>{totalStats.surveys}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">Applications Created:</span>
                      <span>{totalStats.applications}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">Interviews Scheduled:</span>
                      <span>{totalStats.interviews}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}