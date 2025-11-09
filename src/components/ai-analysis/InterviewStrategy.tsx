import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { MessageSquare, CheckCircle2, Target } from "lucide-react";
import type { AIAnalysis } from "@/lib/aiAnalysisEngine";

interface InterviewStrategyProps {
  analysis: AIAnalysis;
}

export function InterviewStrategy({ analysis }: InterviewStrategyProps) {
  const getReadinessColor = (level: string) => {
    switch (level) {
      case 'HIGH':
        return 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-400';
      case 'MEDIUM':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-400';
      case 'LOW':
        return 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-400';
      default:
        return '';
    }
  };

  return (
    <div className="space-y-6">
      {/* Interview Readiness */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            <CardTitle>Interview Readiness Assessment</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-6">
            <Badge className={`text-lg px-4 py-2 ${getReadinessColor(analysis.interviewReadiness)}`}>
              {analysis.interviewReadiness} READINESS
            </Badge>
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">
                {analysis.interviewReadiness === 'HIGH' 
                  ? 'Candidate is well-prepared and likely to perform strongly. Start with technical deep-dive.'
                  : analysis.interviewReadiness === 'MEDIUM'
                  ? 'Candidate shows moderate readiness. Begin with behavioral assessment before technical evaluation.'
                  : 'Additional screening recommended before full interview process.'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Suggested Interview Questions */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            <CardTitle>AI-Generated Interview Questions</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {analysis.suggestedQuestions.map((q, index) => (
              <div key={index} className="p-4 rounded-lg border bg-card">
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold flex-shrink-0">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{q.question}</p>
                  </div>
                </div>
                <div className="ml-9 space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {q.focusArea}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    <span className="font-medium">Purpose: </span>
                    {q.purpose}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Interview Focus Areas */}
      <Card>
        <CardHeader>
          <CardTitle>Interview Focus Areas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900">
              <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
              <p className="text-sm text-green-900 dark:text-green-300">
                Confirm technical competency in identified skill areas
              </p>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900">
              <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
              <p className="text-sm text-green-900 dark:text-green-300">
                Assess leadership potential and growth mindset
              </p>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900">
              <Target className="h-5 w-5 text-amber-600 flex-shrink-0" />
              <p className="text-sm text-amber-900 dark:text-amber-300">
                Probe retention factors and long-term career goals
              </p>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900">
              <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
              <p className="text-sm text-green-900 dark:text-green-300">
                Explore team dynamics and cultural alignment
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Expected Performance */}
      <Card>
        <CardHeader>
          <CardTitle>Expected Interview Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Technical Questions</span>
                <span className="text-sm font-bold">{analysis.expectedPerformance.technical}/10</span>
              </div>
              <Progress value={analysis.expectedPerformance.technical * 10} />
              <p className="text-xs text-muted-foreground">
                Likely to score {analysis.expectedPerformance.technical >= 8 ? 'excellently' : 'well'} on technical assessment
              </p>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Behavioral Questions</span>
                <span className="text-sm font-bold">{analysis.expectedPerformance.behavioral}/10</span>
              </div>
              <Progress value={analysis.expectedPerformance.behavioral * 10} />
              <p className="text-xs text-muted-foreground">
                Expected to demonstrate {analysis.expectedPerformance.behavioral >= 8 ? 'strong' : 'solid'} soft skills
              </p>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Communication Clarity</span>
                <span className="text-sm font-bold">{analysis.expectedPerformance.communication}/10</span>
              </div>
              <Progress value={analysis.expectedPerformance.communication * 10} />
              <p className="text-xs text-muted-foreground">
                Predicted to be articulate and well-prepared
              </p>
            </div>
            
            <div className="mt-6 p-4 rounded-lg bg-primary/5 border border-primary/20">
              <p className="text-sm font-medium mb-2">Interview Preparation Recommendation</p>
              <p className="text-sm">
                {analysis.expectedPerformance.technical >= 8 
                  ? 'Prepare challenging questions to properly assess candidate\'s upper skill limits.'
                  : 'Standard interview questions should suffice. Focus on practical application scenarios.'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Post-Interview Guidance */}
      <Card>
        <CardHeader>
          <CardTitle>Post-Interview Guidance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="p-4 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900">
              <p className="text-sm font-medium text-green-900 dark:text-green-400 mb-1">
                If Score {'>'} 8/10 in Technical
              </p>
              <p className="text-sm text-green-800 dark:text-green-300">
                Move to offer stage quickly (within 48 hours). Fast-track to avoid losing to competitors.
              </p>
            </div>
            
            <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900">
              <p className="text-sm font-medium text-blue-900 dark:text-blue-400 mb-1">
                Reference Check Priority
              </p>
              <p className="text-sm text-blue-800 dark:text-blue-300">
                Gather reference data immediately after interview. Focus on technical competency and team collaboration.
              </p>
            </div>
            
            <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900">
              <p className="text-sm font-medium text-amber-900 dark:text-amber-400 mb-1">
                If Concerns Arise
              </p>
              <p className="text-sm text-amber-800 dark:text-amber-300">
                Schedule follow-up technical screen within 1 week. Focus on specific areas of concern.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
