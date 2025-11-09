import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, MessageSquare, Target } from "lucide-react";
import type { AIAnalysis } from "@/lib/aiAnalysisEngine";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
} from "recharts";

interface CultureFitAssessmentProps {
  analysis: AIAnalysis;
}

export function CultureFitAssessment({ analysis }: CultureFitAssessmentProps) {
  const radarData = analysis.softSkills.map(skill => ({
    subject: skill.name,
    value: skill.score,
    fullMark: 100,
  }));

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 65) return 'text-amber-600';
    return 'text-orange-600';
  };

  return (
    <div className="space-y-6">
      {/* Culture Fit Score */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <CardTitle>Culture Fit Score</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-6">
            <div className="text-6xl font-bold text-primary">
              {analysis.cultureFitScore}
            </div>
            <div className="flex-1">
              <p className="text-2xl font-semibold">
                {analysis.cultureFitScore >= 80 ? 'Excellent' : analysis.cultureFitScore >= 65 ? 'Good' : 'Moderate'} Cultural Alignment
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Based on behavioral patterns, communication style, and team dynamics
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Soft Skills Radar Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Soft Skills Assessment</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-80 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData}>
                  <PolarGrid strokeDasharray="3 3" />
                  <PolarAngleAxis 
                    dataKey="subject" 
                    tick={{ fontSize: 12 }}
                  />
                  <PolarRadiusAxis angle={90} domain={[0, 100]} />
                  <Radar
                    name="Skills"
                    dataKey="value"
                    stroke="hsl(var(--primary))"
                    fill="hsl(var(--primary))"
                    fillOpacity={0.3}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-3">
              {analysis.softSkills.map((skill, index) => (
                <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <span className="text-sm font-medium">{skill.name}</span>
                  <span className={`text-lg font-bold ${getScoreColor(skill.score)}`}>
                    {skill.score}%
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-6 p-4 rounded-lg bg-muted/50">
            <p className="text-sm">
              <span className="font-semibold">Interpretation: </span>
              {analysis.softSkills.find(s => s.score >= 85) 
                ? `Strong in ${analysis.softSkills.filter(s => s.score >= 85).map(s => s.name.toLowerCase()).join(', ')}`
                : 'Well-balanced soft skill profile'
              }
              {analysis.softSkills.find(s => s.score < 70) &&
                `, with development opportunities in ${analysis.softSkills.filter(s => s.score < 70).map(s => s.name.toLowerCase()).join(', ')}`
              }
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Behavioral Profile */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            <CardTitle>Behavioral Profile</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-relaxed mb-4">{analysis.behavioralProfile}</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div className="p-4 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900">
              <p className="text-sm font-medium text-green-900 dark:text-green-400 mb-1">
                Best Match For
              </p>
              <p className="text-sm text-green-800 dark:text-green-300">
                Teams valuing clarity, structure, and systematic processes
              </p>
            </div>
            <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900">
              <p className="text-sm font-medium text-amber-900 dark:text-amber-400 mb-1">
                Potential Challenges
              </p>
              <p className="text-sm text-amber-800 dark:text-amber-300">
                May need adjustment in highly chaotic or unstructured environments
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Communication Style */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            <CardTitle>Communication Style Analysis</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-relaxed">{analysis.communicationStyle}</p>
        </CardContent>
      </Card>

      {/* Team Fit Assessment */}
      <Card>
        <CardHeader>
          <CardTitle>Team Fit Assessment</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-relaxed">{analysis.teamFitAssessment}</p>
        </CardContent>
      </Card>
    </div>
  );
}
