import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import type { AIAnalysis } from "@/lib/aiAnalysisEngine";

interface PredictivePerformanceProps {
  analysis: AIAnalysis;
}

export function PredictivePerformance({ analysis }: PredictivePerformanceProps) {
  const getFactorIcon = (status: string) => {
    switch (status) {
      case 'positive':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'neutral':
        return <AlertTriangle className="h-4 w-4 text-amber-600" />;
      case 'negative':
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Predicted Success Score */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            <CardTitle>Predicted Success Score</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-6">
              <div className="text-6xl font-bold text-primary">
                {analysis.predictedSuccessScore}
              </div>
              <div className="flex-1">
                <p className="text-2xl font-semibold">
                  {analysis.predictedSuccessScore >= 80 ? 'High' : analysis.predictedSuccessScore >= 65 ? 'Medium' : 'Moderate'} Success Probability
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Model Confidence: {analysis.modelConfidence}%
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-4 rounded-lg bg-muted/50">
              <Clock className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-medium">Time to Full Productivity</p>
                <p className="text-sm text-muted-foreground">{analysis.timeToProductivity}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Success Factors */}
      <Card>
        <CardHeader>
          <CardTitle>Success Factors (Weighted)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {analysis.successFactors.map((factor, index) => (
              <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-3 flex-1">
                  {getFactorIcon(factor.status)}
                  <span className="text-sm font-medium">{factor.factor}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-primary">+{factor.points} pts</span>
                  <Badge variant={factor.status === 'positive' ? 'default' : 'secondary'}>
                    {factor.status}
                  </Badge>
                </div>
              </div>
            ))}
            <div className="mt-4 p-4 rounded-lg bg-primary/5 border border-primary/20">
              <div className="flex items-center justify-between">
                <span className="font-semibold">Total Score (normalized)</span>
                <span className="text-2xl font-bold text-primary">
                  {analysis.successFactors.reduce((sum, f) => sum + f.points, 0)} → {analysis.predictedSuccessScore}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Risk Assessment */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-primary" />
            <CardTitle>Risk Assessment</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <span className="text-lg font-semibold">Overall Risk Level</span>
              <Badge className={
                analysis.riskFactors.reduce((sum, r) => sum + r.percentage, 0) / analysis.riskFactors.length < 20 
                  ? 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-400'
                  : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-400'
              }>
                {analysis.riskFactors.reduce((sum, r) => sum + r.percentage, 0) / analysis.riskFactors.length < 20 ? 'LOW' : 'MEDIUM'}
                {' '}({Math.round(analysis.riskFactors.reduce((sum, r) => sum + r.percentage, 0) / analysis.riskFactors.length)}%)
              </Badge>
            </div>
            
            {analysis.riskFactors.map((risk, index) => (
              <div key={index} className="space-y-2 p-4 rounded-lg bg-muted/50">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{risk.type}</span>
                  <span className="text-sm font-bold">{risk.percentage}%</span>
                </div>
                <Progress value={risk.percentage} className="h-2" />
                <p className="text-sm text-muted-foreground">{risk.description}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Performance Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Expected Performance Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {analysis.performanceTimeline.map((milestone, index) => (
              <div key={index} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                <div className="w-2 h-2 rounded-full bg-primary mt-2" />
                <p className="text-sm flex-1">{milestone}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
