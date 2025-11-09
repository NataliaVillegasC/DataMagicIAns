import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { CheckCircle2, Clock, AlertCircle } from "lucide-react";
import type { AIAnalysis } from "@/lib/aiAnalysisEngine";

interface ActionableRecommendationsProps {
  analysis: AIAnalysis;
}

export function ActionableRecommendations({ analysis }: ActionableRecommendationsProps) {
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical':
        return 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-400';
      case 'high':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-400';
      case 'medium':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-400';
      case 'low':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-400';
      default:
        return '';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'critical':
        return <AlertCircle className="h-5 w-5 text-red-600" />;
      case 'high':
        return <Clock className="h-5 w-5 text-orange-600" />;
      case 'medium':
        return <Clock className="h-5 w-5 text-amber-600" />;
      case 'low':
        return <Clock className="h-5 w-5 text-blue-600" />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Primary Recommendation */}
      <Card className="border-2 border-primary">
        <CardHeader>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-primary" />
            <CardTitle>AI Primary Recommendation</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="text-4xl">{analysis.primaryRecommendation.includes('🟢') ? '🟢' : analysis.primaryRecommendation.includes('🟡') ? '🟡' : '🔴'}</div>
              <div className="flex-1">
                <p className="text-xl font-bold mb-2">
                  {analysis.primaryRecommendation.replace(/[🟢🟡🔴]/g, '').trim()}
                </p>
                <div className="flex items-center gap-3">
                  <Badge variant="outline">
                    Confidence: {analysis.recommendationConfidence}%
                  </Badge>
                  <Badge className="bg-primary/10 text-primary">
                    Model: {analysis.modelVersion}
                  </Badge>
                </div>
              </div>
            </div>
            
            <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
              <p className="text-sm font-medium mb-1">Reasoning</p>
              <p className="text-sm">
                {analysis.verdict === 'STRONG_FIT' 
                  ? 'Strong technical fit, excellent growth potential, and manageable risks. Ideal candidate for immediate advancement.'
                  : analysis.verdict === 'GOOD_FIT'
                  ? 'Solid alignment with requirements and positive cultural indicators. Proceed with standard process.'
                  : analysis.verdict === 'MODERATE_FIT'
                  ? 'Mixed signals with some gaps. Additional evaluation recommended to mitigate risks.'
                  : 'Significant gaps in critical areas. Consider alternative candidates.'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Next Steps */}
      <Card>
        <CardHeader>
          <CardTitle>Immediate Next Steps (Priority-Ordered)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {analysis.nextSteps.map((step, index) => (
              <div 
                key={index} 
                className="p-4 rounded-lg border bg-card hover:shadow-md transition-shadow"
              >
                <div className="flex items-start gap-3">
                  <Checkbox className="mt-1" />
                  <div className="flex-1 space-y-3">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-2">
                        {getPriorityIcon(step.priority)}
                        <div>
                          <Badge className={getPriorityColor(step.priority)}>
                            {step.priority.toUpperCase()}
                          </Badge>
                          <Badge variant="outline" className="ml-2">
                            {step.timeframe}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="font-semibold mb-2">{step.task}</h4>
                      <p className="text-sm text-muted-foreground">{step.details}</p>
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground">Responsibility:</span>
                      <Badge variant="secondary">{step.responsibility}</Badge>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Conditional Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Conditional Action Plan</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="p-4 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900">
              <p className="text-sm font-medium text-green-900 dark:text-green-400 mb-1">
                ✓ If Interview Goes Well
              </p>
              <p className="text-sm text-green-800 dark:text-green-300">
                Prepare offer for fast-track delivery within 3 days. Include competitive compensation package and clear growth path.
              </p>
            </div>
            
            <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900">
              <p className="text-sm font-medium text-amber-900 dark:text-amber-400 mb-1">
                ⚠ If Concerns Raised
              </p>
              <p className="text-sm text-amber-800 dark:text-amber-300">
                Schedule follow-up assessment within 1 week. Focus on specific areas of concern identified during interview.
              </p>
            </div>
            
            <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900">
              <p className="text-sm font-medium text-blue-900 dark:text-blue-400 mb-1">
                ℹ If No Response After Initial Contact
              </p>
              <p className="text-sm text-blue-800 dark:text-blue-300">
                Follow up after 1 week with personalized message highlighting role opportunities and company culture.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Offer Strategy (if applicable) */}
      {analysis.verdict !== 'NOT_RECOMMENDED' && (
        <Card>
          <CardHeader>
            <CardTitle>Offer Strategy (If Proceeding)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-card border">
                <p className="text-sm text-muted-foreground mb-1">Base Salary</p>
                <p className="text-xl font-bold">{analysis.offerStrategy.recommendedSalary}</p>
              </div>
              <div className="p-4 rounded-lg bg-card border">
                <p className="text-sm text-muted-foreground mb-1">Equity</p>
                <p className="text-xl font-bold">{analysis.offerStrategy.equity}</p>
              </div>
              <div className="p-4 rounded-lg bg-card border md:col-span-2">
                <p className="text-sm text-muted-foreground mb-1">Negotiation Buffer</p>
                <p className="text-sm">{analysis.offerStrategy.negotiationBuffer}</p>
              </div>
              <div className="p-4 rounded-lg bg-primary/5 border border-primary/20 md:col-span-2">
                <p className="text-sm font-medium mb-1">Justification</p>
                <p className="text-sm">Competitive positioning aligned with market rates and candidate value. Structured to attract and retain top talent.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Retention Strategy */}
      {analysis.verdict === 'STRONG_FIT' || analysis.verdict === 'GOOD_FIT' ? (
        <Card>
          <CardHeader>
            <CardTitle>Long-Term Retention Strategy</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium">Frame role as growth opportunity</p>
                  <p className="text-sm text-muted-foreground">
                    Position as stepping stone to {analysis.careerAspirations.includes('Leadership') ? 'leadership' : 'technical specialization'} roles
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium">Assign senior mentor for growth</p>
                  <p className="text-sm text-muted-foreground">
                    Pair with experienced team member for knowledge transfer and career guidance
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium">Plan 1-year review for promotion/raise</p>
                  <p className="text-sm text-muted-foreground">
                    Set clear milestones and expectations for advancement
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium">Professional development budget</p>
                  <p className="text-sm text-muted-foreground">
                    Encourage conference attendance, certifications, and continuous learning
                  </p>
                </div>
              </li>
            </ul>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
