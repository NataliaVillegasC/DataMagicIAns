import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle2, Flag } from "lucide-react";
import type { AIAnalysis } from "@/lib/aiAnalysisEngine";

interface RedFlagsSectionProps {
  analysis: AIAnalysis;
}

export function RedFlagsSection({ analysis }: RedFlagsSectionProps) {
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-400';
      case 'medium':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-400';
      case 'low':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-400';
      default:
        return '';
    }
  };

  const getSeverityIcon = (severity: string) => {
    return <AlertTriangle className={`h-5 w-5 ${
      severity === 'high' ? 'text-red-600' :
      severity === 'medium' ? 'text-amber-600' :
      'text-yellow-600'
    }`} />;
  };

  const overallSeverity = analysis.redFlags.length === 0 ? 'none' :
    analysis.redFlags.some(f => f.severity === 'high') ? 'high' :
    analysis.redFlags.some(f => f.severity === 'medium') ? 'medium' : 'low';

  return (
    <div className="space-y-6">
      {/* Red Flags Summary */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Flag className="h-5 w-5 text-primary" />
              <CardTitle>Red Flags Summary</CardTitle>
            </div>
            <Badge className={
              overallSeverity === 'none' ? 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-400' :
              overallSeverity === 'low' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-400' :
              overallSeverity === 'medium' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-400' :
              'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-400'
            }>
              {overallSeverity === 'none' ? '🟢 No Critical Issues' :
               overallSeverity === 'low' ? '🟡 Minor Concerns' :
               overallSeverity === 'medium' ? '🟠 Moderate Concerns' :
               '🔴 Significant Concerns'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="text-4xl font-bold text-primary">
              {analysis.redFlags.length}
            </div>
            <div>
              <p className="font-semibold">
                {analysis.redFlags.length === 0 ? 'No flags' : 
                 analysis.redFlags.length === 1 ? '1 flag' :
                 `${analysis.redFlags.length} flags`} identified
              </p>
              <p className="text-sm text-muted-foreground">
                {overallSeverity === 'none' ? 'All clear - no concerns detected' :
                 `All ${overallSeverity === 'low' ? 'minor' : overallSeverity}, no critical issues`}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Flags */}
      {analysis.redFlags.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Detailed Flags</h3>
          {analysis.redFlags.map((flag, index) => (
            <Card key={index} className="border-l-4" style={{
              borderLeftColor: flag.severity === 'high' ? 'rgb(220, 38, 38)' :
                              flag.severity === 'medium' ? 'rgb(245, 158, 11)' :
                              'rgb(234, 179, 8)'
            }}>
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    {getSeverityIcon(flag.severity)}
                    <div>
                      <h4 className="font-semibold">{flag.title}</h4>
                      <Badge className={`${getSeverityColor(flag.severity)} mt-2`}>
                        {flag.severity.toUpperCase()}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Description</p>
                  <p className="text-sm">{flag.description}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Impact</p>
                  <p className="text-sm">{flag.impact}</p>
                </div>
                <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                  <p className="text-sm font-medium mb-1">Recommendation</p>
                  <p className="text-sm">{flag.recommendation}</p>
                </div>
                {flag.mitigation && (
                  <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900">
                    <p className="text-sm font-medium text-green-900 dark:text-green-400 mb-1">
                      Mitigation Strategy
                    </p>
                    <p className="text-sm text-green-800 dark:text-green-300">{flag.mitigation}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Positive Signals */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            <CardTitle>Positive Signals</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3">
            {analysis.positiveSignals.map((signal, index) => (
              <div key={index} className="flex items-center gap-3 p-3 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900">
                <span className="text-lg">{signal.icon}</span>
                <span className="text-sm text-green-900 dark:text-green-300">{signal.text}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
