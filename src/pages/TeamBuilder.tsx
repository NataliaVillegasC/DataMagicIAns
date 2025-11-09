import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, User, CheckCircle2, Loader2, Users, Plus } from "lucide-react";
import { useState } from "react";
import { ConfidenceBar } from "@/components/ConfidenceBar";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface TeamMember {
  name: string;
  role: string;
  avatar: string;
  fit: number;
  skills: {
    name: string;
    score: number;
    required: number;
  }[];
  availability: string;
}

const TeamBuilder = () => {
  const [projectName, setProjectName] = useState("");
  const [requiredSkills, setRequiredSkills] = useState<string[]>([]);
  const [newSkill, setNewSkill] = useState("");
  const [recommendedTeam, setRecommendedTeam] = useState<TeamMember[]>([]);
  const [alternativeTeams, setAlternativeTeams] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const analyzeTeam = async () => {
    if (!projectName.trim()) {
      toast({
        title: "Project name required",
        description: "Please enter a project name",
        variant: "destructive"
      });
      return;
    }

    if (requiredSkills.length === 0) {
      toast({
        title: "Skills required",
        description: "Please add at least one required skill",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('build-team', {
        body: { projectName, requiredSkills }
      });

      if (error) {
        if (error.message?.includes('Rate limit')) {
          toast({
            title: "Rate Limit Exceeded",
            description: "Please wait a moment before trying again.",
            variant: "destructive"
          });
        } else if (error.message?.includes('credits')) {
          toast({
            title: "AI Credits Exhausted",
            description: "Please add credits to continue using AI features.",
            variant: "destructive"
          });
        } else {
          throw error;
        }
        return;
      }

      setRecommendedTeam(data.recommendedTeam || []);
      setAlternativeTeams(data.alternativeTeams || []);
      
      if (!data.recommendedTeam || data.recommendedTeam.length === 0) {
        toast({
          title: "No matches found",
          description: "No candidates match the required skills. Try adjusting your requirements.",
        });
      } else {
        toast({
          title: "Team recommendations ready",
          description: `Found ${data.recommendedTeam.length} candidate(s) matching your requirements`,
        });
      }
    } catch (error: any) {
      console.error('Error analyzing team:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to analyze team",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const addSkill = () => {
    if (newSkill.trim() && !requiredSkills.includes(newSkill.trim())) {
      setRequiredSkills([...requiredSkills, newSkill.trim()]);
      setNewSkill("");
    }
  };

  const removeSkill = (skill: string) => {
    setRequiredSkills(requiredSkills.filter(s => s !== skill));
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Users className="h-8 w-8 text-primary" />
            <h1 className="text-3xl md:text-4xl font-bold">
              Team Builder
            </h1>
          </div>
          <p className="text-muted-foreground">
            Build optimal teams with AI-powered candidate matching based on your project requirements
          </p>
        </div>

        {/* Project Input */}
        <Card className="p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Define Your Project</h2>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Project Name *</label>
              <Input
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="e.g., Build AI Chatbot for HR, Develop Mobile App"
                className="max-w-2xl"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Required Skills *</label>
              <div className="flex gap-2 flex-wrap mb-3">
                {requiredSkills.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No skills added yet. Add skills to start building your team.</p>
                ) : (
                  requiredSkills.map((skill) => (
                    <Badge 
                      key={skill} 
                      variant="secondary"
                      className="cursor-pointer hover:bg-destructive/20 text-sm"
                      onClick={() => removeSkill(skill)}
                    >
                      {skill} ×
                    </Badge>
                  ))
                )}
              </div>
              <div className="flex gap-2 max-w-2xl">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={newSkill}
                    onChange={(e) => setNewSkill(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addSkill()}
                    placeholder="e.g., Python, React, Project Management, UI/UX"
                    className="pl-10"
                  />
                </div>
                <Button onClick={addSkill} type="button" variant="secondary">
                  <Plus className="mr-2 h-4 w-4" />
                  Add
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Press Enter or click Add to include a skill
              </p>
            </div>
            <Button 
              onClick={analyzeTeam} 
              disabled={isLoading || !projectName.trim() || requiredSkills.length === 0} 
              className="w-full max-w-md"
              size="lg"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Analyzing candidates...
                </>
              ) : (
                <>
                  <Users className="mr-2 h-4 w-4" />
                  Build Team
                </>
              )}
            </Button>
          </div>
        </Card>

        {/* Recommended Team */}
        {(recommendedTeam.length > 0 || isLoading) && (
          <Card className="p-6 mb-8">
            <CardHeader className="px-0 pt-0">
              <CardTitle>Recommended Team</CardTitle>
            </CardHeader>
            <CardContent className="px-0 pb-0">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : recommendedTeam.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No candidates found matching your requirements.
                </p>
              ) : (
                <div className="space-y-6">
                  {recommendedTeam.map((member, idx) => (
                    <div key={idx} className="p-4 border border-border rounded-lg hover:border-primary/50 transition-colors">
                      <div className="flex items-start gap-4 mb-4">
                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center shrink-0">
                          <User className="h-8 w-8 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <h3 className="font-semibold text-lg">{member.name}</h3>
                              <p className="text-sm text-muted-foreground">{member.role}</p>
                            </div>
                            <Badge 
                              variant="outline" 
                              className={
                                member.fit >= 90 
                                  ? "bg-success/10 text-success border-success/20" 
                                  : member.fit >= 70
                                  ? "bg-primary/10 text-primary border-primary/20"
                                  : "bg-warning/10 text-warning border-warning/20"
                              }
                            >
                              {member.fit}% Match
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{member.availability}</p>
                        </div>
                      </div>

                      {/* Skills Coverage */}
                      <div className="space-y-3">
                        <h4 className="text-sm font-semibold">Skills Coverage</h4>
                        {member.skills.map((skill, skillIdx) => (
                          <div key={skillIdx} className="space-y-1">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                {skill.score >= skill.required ? (
                                  <CheckCircle2 className="h-4 w-4 text-success" />
                                ) : (
                                  <div className="h-4 w-4 rounded-full border-2 border-warning" />
                                )}
                                <span className="text-sm font-medium">{skill.name}</span>
                              </div>
                              <span className="text-xs text-muted-foreground">
                                {skill.score}% proficiency (needs {skill.required}%)
                              </span>
                            </div>
                            <ConfidenceBar confidence={skill.score} showLabel={false} height="sm" />
                          </div>
                        ))}
                      </div>

                      <div className="mt-4 pt-4 border-t border-border flex justify-end gap-2">
                        <Button size="sm" variant="outline">View Profile</Button>
                        <Button size="sm">Add to Team</Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Alternative Recommendations */}
        {alternativeTeams.length > 0 && (
          <Card className="p-6">
            <CardHeader className="px-0 pt-0">
              <CardTitle>Alternative Team Compositions</CardTitle>
            </CardHeader>
            <CardContent className="px-0 pb-0">
              <div className="space-y-3">
                {alternativeTeams.map((team, idx) => (
                  <div key={idx} className="p-4 bg-muted/30 rounded-lg border border-border">
                    <div className="flex items-start justify-between mb-2">
                      <p className="font-medium">{team.name}</p>
                      <Badge 
                        variant="outline" 
                        className={
                          team.coverage >= 90
                            ? "bg-success/10 text-success border-success/20"
                            : "bg-primary/10 text-primary border-primary/20"
                        }
                      >
                        {team.coverage}% Coverage
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      {team.description}
                    </p>
                    {team.members && team.members.length > 0 && (
                      <div className="flex gap-1 flex-wrap mt-2">
                        {team.members.map((member: string, i: number) => (
                          <Badge key={i} variant="secondary" className="text-xs">
                            {member}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Empty State */}
        {!isLoading && recommendedTeam.length === 0 && requiredSkills.length === 0 && (
          <Card className="p-12 text-center">
            <Users className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-semibold mb-2">Build Your Dream Team</h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Define your project requirements and let AI match you with the best candidates from your talent pool
            </p>
          </Card>
        )}
      </main>
    </div>
  );
};

export default TeamBuilder;
