import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Briefcase, DollarSign, Award } from "lucide-react";
import type { AIAnalysis } from "@/lib/aiAnalysisEngine";

interface CareerTrajectoryProps {
  analysis: AIAnalysis;
}

export function CareerTrajectory({ analysis }: CareerTrajectoryProps) {
  const getTrajectoryColor = (trajectory: string) => {
    switch (trajectory) {
      case 'fast':
        return 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-400';
      case 'steady':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-400';
      case 'slow':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-400';
      default:
        return '';
    }
  };

  return (
    <div className="space-y-6">
      {/* Career Timeline */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-primary" />
            <CardTitle>Career Timeline</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {analysis.careerTimeline.map((position, index) => (
              <div key={index} className="relative pl-8 pb-6 border-l-2 border-primary/30 last:pb-0">
                <div className="absolute left-[-9px] top-0 w-4 h-4 rounded-full bg-primary border-2 border-background" />
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h4 className="font-semibold">{position.title}</h4>
                      <p className="text-sm text-muted-foreground">
                        {position.company} • {position.duration}
                      </p>
                    </div>
                    <Badge variant="outline">{position.year}</Badge>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <DollarSign className="h-4 w-4 text-primary" />
                    <span className="font-medium">${position.salary.toLocaleString()}</span>
                    {index > 0 && (
                      <span className="text-green-600 dark:text-green-400">
                        +{Math.round(((position.salary - analysis.careerTimeline[index - 1].salary) / analysis.careerTimeline[index - 1].salary) * 100)}%
                      </span>
                    )}
                  </div>
                  {position.skillsGained.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {position.skillsGained.map((skill, idx) => (
                        <Badge key={idx} variant="secondary" className="text-xs">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Career Velocity Metrics */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            <CardTitle>Career Velocity Metrics</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Average Promotion Frequency</p>
              <p className="text-2xl font-bold">Every {analysis.careerVelocity.avgPromotionYears} years</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Salary Growth Rate</p>
              <p className="text-2xl font-bold">{analysis.careerVelocity.salaryGrowthRate}% per year</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Skills Acquired</p>
              <p className="text-2xl font-bold">{analysis.careerVelocity.skillsPerYear} per year</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Trajectory Ranking</p>
              <Badge className={getTrajectoryColor(analysis.careerVelocity.trajectory)}>
                {analysis.careerVelocity.trajectory.toUpperCase()} TRAJECTORY
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Growth Potential Assessment */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Award className="h-5 w-5 text-primary" />
            <CardTitle>Growth Potential Assessment</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="text-4xl font-bold text-primary">
                {analysis.growthPotential.score}/100
              </div>
              <div className="flex-1">
                <p className="font-semibold">
                  {analysis.growthPotential.score >= 80 ? 'High' : analysis.growthPotential.score >= 65 ? 'Medium' : 'Moderate'} Growth Potential
                </p>
                <p className="text-sm text-muted-foreground">
                  Ready for next level in {analysis.growthPotential.timelineToNextLevel}
                </p>
              </div>
            </div>
            <div className="p-4 rounded-lg bg-muted/50">
              <p className="text-sm font-medium mb-2">AI Analysis</p>
              <p className="text-sm">{analysis.growthPotential.reasoning}</p>
            </div>
            <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
              <p className="text-sm font-medium mb-2">Recommendation</p>
              <p className="text-sm">{analysis.growthPotential.recommendation}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Job Stability Analysis */}
      <Card>
        <CardHeader>
          <CardTitle>Job Stability Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Average Tenure</p>
                <p className="text-2xl font-bold">{analysis.jobStability.avgTenure} years</p>
              </div>
            </div>
            <div className="p-4 rounded-lg bg-muted/50">
              <p className="text-sm font-medium mb-2">Assessment</p>
              <p className="text-sm">{analysis.jobStability.assessment}</p>
            </div>
            <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900">
              <p className="text-sm font-medium mb-2">Retention Recommendation</p>
              <p className="text-sm">{analysis.jobStability.retentionRecommendation}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Career Aspirations */}
      <Card>
        <CardHeader>
          <CardTitle>Career Aspirations (AI Inferred)</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-relaxed">{analysis.careerAspirations}</p>
        </CardContent>
      </Card>
    </div>
  );
}
