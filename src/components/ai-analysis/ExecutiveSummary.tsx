import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Brain, TrendingUp, Users, Target, AlertTriangle } from "lucide-react";
import type { AIAnalysis } from "@/lib/aiAnalysisEngine";

interface ExecutiveSummaryProps {
  analysis: AIAnalysis;
  onProceedToInterview?: () => void;
  onFlagConcern?: () => void;
}

export function ExecutiveSummary({ analysis, onProceedToInterview, onFlagConcern }: ExecutiveSummaryProps) {
  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 75) return 'text-green-500';
    if (score >= 60) return 'text-amber-500';
    if (score >= 45) return 'text-orange-500';
    return 'text-red-500';
  };

  const getScoreBg = (score: number) => {
    if (score >= 90) return 'bg-green-50 dark:bg-green-950';
    if (score >= 75) return 'bg-green-50 dark:bg-green-950';
    if (score >= 60) return 'bg-amber-50 dark:bg-amber-950';
    if (score >= 45) return 'bg-orange-50 dark:bg-orange-950';
    return 'bg-red-50 dark:bg-red-950';
  };

  const getVerdictDisplay = () => {
    switch (analysis.verdict) {
      case 'STRONG_FIT':
        return { text: '✅ STRONG FIT', color: 'text-green-600 dark:text-green-400' };
      case 'GOOD_FIT':
        return { text: '✅ GOOD FIT', color: 'text-green-600 dark:text-green-400' };
      case 'MODERATE_FIT':
        return { text: '⚠️ MODERATE FIT', color: 'text-amber-600 dark:text-amber-400' };
      case 'NOT_RECOMMENDED':
        return { text: '❌ NOT RECOMMENDED', color: 'text-red-600 dark:text-red-400' };
    }
  };

  const verdict = getVerdictDisplay();

  return (
    <Card className="border-primary/20 shadow-lg">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Brain className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Executive Summary</h2>
              <p className="text-sm text-muted-foreground mt-1">
                AI-powered comprehensive candidate assessment
              </p>
            </div>
          </div>
          <Badge variant="secondary" className="bg-[hsl(262,83%,58%)] text-white">
            Powered by AI
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Generated: {new Date(analysis.generatedAt).toLocaleString()} • Model: {analysis.modelVersion}
        </p>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Overall Score Circle */}
        <div className="flex flex-col items-center py-6">
          <div className={`relative w-40 h-40 rounded-full ${getScoreBg(analysis.overallScore)} flex items-center justify-center border-4 ${getScoreColor(analysis.overallScore)} border-current`}>
            <div className="text-center">
              <div className={`text-5xl font-bold ${getScoreColor(analysis.overallScore)}`}>
                {analysis.overallScore}
              </div>
              <div className="text-sm font-medium text-muted-foreground">/100</div>
            </div>
          </div>
          <div className="mt-4 text-center">
            <p className="text-sm text-muted-foreground mb-1">Overall Match Score</p>
            <p className={`text-2xl font-bold ${verdict.color}`}>
              {verdict.text}
            </p>
          </div>
        </div>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-lg bg-card border">
            <div className="flex items-center gap-2 mb-2">
              <Target className="h-4 w-4 text-primary" />
              <p className="text-xs font-medium text-muted-foreground">Skill Match</p>
            </div>
            <p className={`text-2xl font-bold ${getScoreColor(analysis.skillMatchScore)}`}>
              {analysis.skillMatchScore}%
            </p>
            <Progress value={analysis.skillMatchScore} className="mt-2 h-1.5" />
          </div>

          <div className="p-4 rounded-lg bg-card border">
            <div className="flex items-center gap-2 mb-2">
              <Users className="h-4 w-4 text-primary" />
              <p className="text-xs font-medium text-muted-foreground">Culture Fit</p>
            </div>
            <p className={`text-2xl font-bold ${getScoreColor(analysis.cultureFitScore)}`}>
              {analysis.cultureFitScore}%
            </p>
            <Progress value={analysis.cultureFitScore} className="mt-2 h-1.5" />
          </div>

          <div className="p-4 rounded-lg bg-card border">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              <p className="text-xs font-medium text-muted-foreground">Growth Potential</p>
            </div>
            <p className={`text-2xl font-bold ${getScoreColor(analysis.growthPotentialScore)}`}>
              {analysis.growthPotentialScore}%
            </p>
            <Progress value={analysis.growthPotentialScore} className="mt-2 h-1.5" />
          </div>

          <div className="p-4 rounded-lg bg-card border">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-primary" />
              <p className="text-xs font-medium text-muted-foreground">Retention Risk</p>
            </div>
            <p className={`text-2xl font-bold ${getScoreColor(100 - analysis.retentionRiskScore)}`}>
              {analysis.retentionRiskScore}%
            </p>
            <Progress value={analysis.retentionRiskScore} className="mt-2 h-1.5" />
            <p className="text-xs text-muted-foreground mt-1">Lower is better</p>
          </div>
        </div>

        {/* Executive Recommendation */}
        <div className="p-4 rounded-lg bg-muted/50">
          <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
            <Brain className="h-4 w-4" />
            AI Recommendation
          </h3>
          <p className="text-sm leading-relaxed">
            {analysis.executiveRecommendation}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-2">
          <Button 
            className="flex-1" 
            size="lg"
            onClick={onProceedToInterview}
            disabled={analysis.verdict === 'NOT_RECOMMENDED'}
          >
            Proceed to Interview
          </Button>
          <Button 
            variant="outline" 
            className="flex-1" 
            size="lg"
            onClick={onFlagConcern}
          >
            Flag Concern
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
