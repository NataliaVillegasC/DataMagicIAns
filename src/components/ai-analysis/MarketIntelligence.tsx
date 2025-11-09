import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DollarSign, TrendingUp, AlertCircle } from "lucide-react";
import type { AIAnalysis } from "@/lib/aiAnalysisEngine";

interface MarketIntelligenceProps {
  analysis: AIAnalysis;
}

export function MarketIntelligence({ analysis }: MarketIntelligenceProps) {
  return (
    <div className="space-y-6">
      {/* Market Position */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            <CardTitle>Market Position</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Role</p>
              <p className="text-lg font-semibold">{analysis.marketPosition.role}</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Location</p>
              <p className="text-lg font-semibold">{analysis.marketPosition.location}</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Your Offer Range</p>
              <p className="text-lg font-semibold">{analysis.marketPosition.yourRange}</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Market Average</p>
              <p className="text-lg font-semibold">{analysis.marketPosition.marketAverage}</p>
            </div>
            <div className="space-y-2 md:col-span-2">
              <p className="text-sm text-muted-foreground">Candidate Expectation (Inferred)</p>
              <p className="text-lg font-semibold">{analysis.marketPosition.candidateExpectation}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Market Rates Comparison */}
      <Card>
        <CardHeader>
          <CardTitle>Market Rates Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-lg bg-muted/50 text-center">
                <p className="text-sm text-muted-foreground mb-1">Your Position</p>
                <Badge variant="outline">Competitive</Badge>
                <p className="text-xs text-muted-foreground mt-2">50th percentile</p>
              </div>
              <div className="p-4 rounded-lg bg-primary/5 border border-primary/20 text-center">
                <p className="text-sm text-muted-foreground mb-1">Market Movement</p>
                <p className="text-lg font-bold text-green-600">+3%</p>
                <p className="text-xs text-muted-foreground mt-2">from last quarter</p>
              </div>
              <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 text-center">
                <p className="text-sm text-muted-foreground mb-1">Scarcity Level</p>
                <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-400">
                  HIGH
                </Badge>
                <p className="text-xs text-muted-foreground mt-2">+30% demand premium</p>
              </div>
            </div>
            
            <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900">
              <p className="text-sm font-medium text-blue-900 dark:text-blue-400 mb-2">
                To Be Competitive
              </p>
              <p className="text-sm text-blue-800 dark:text-blue-300">
                Suggest offering in the 65th-75th percentile range for this skill level and location. 
                Consider +10-15% above market average to secure top talent quickly.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Candidate Valuation */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" />
            <CardTitle>Candidate Valuation</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Current Salary (Inferred)</p>
                <p className="text-3xl font-bold">${analysis.candidateValuation.currentSalary.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Estimated Market Value</p>
                <p className="text-3xl font-bold text-primary">{analysis.candidateValuation.marketValue}</p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pt-4 border-t">
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <p className="text-sm text-muted-foreground mb-1">Skill Premium</p>
                <p className="text-xl font-bold text-green-600">+{analysis.candidateValuation.skillPremium}%</p>
                <p className="text-xs text-muted-foreground mt-1">High-demand skills</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <p className="text-sm text-muted-foreground mb-1">Experience Premium</p>
                <p className="text-xl font-bold text-green-600">+{analysis.candidateValuation.experiencePremium}%</p>
                <p className="text-xs text-muted-foreground mt-1">Years in field</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-muted/50 md:col-span-1 col-span-2">
                <p className="text-sm text-muted-foreground mb-1">Total Premium</p>
                <p className="text-xl font-bold text-primary">
                  +{analysis.candidateValuation.skillPremium + analysis.candidateValuation.experiencePremium}%
                </p>
                <p className="text-xs text-muted-foreground mt-1">Above base rate</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Offer Strategy */}
      <Card>
        <CardHeader>
          <CardTitle>Recommended Offer Strategy</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900">
                <p className="text-sm font-medium text-green-900 dark:text-green-400 mb-1">
                  Recommended Base Salary
                </p>
                <p className="text-2xl font-bold text-green-800 dark:text-green-300">
                  {analysis.offerStrategy.recommendedSalary}
                </p>
              </div>
              <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                <p className="text-sm font-medium mb-1">Equity Recommendation</p>
                <p className="text-lg font-bold">{analysis.offerStrategy.equity}</p>
              </div>
            </div>
            
            <div className="p-4 rounded-lg bg-muted/50">
              <p className="text-sm font-medium mb-2">Negotiation Buffer</p>
              <p className="text-sm">{analysis.offerStrategy.negotiationBuffer}</p>
            </div>
            
            <div className="flex items-center gap-3 p-4 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900">
              <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-amber-900 dark:text-amber-400">
                  Decision Urgency: <Badge className="ml-2 bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-400">
                    {analysis.offerStrategy.urgency}
                  </Badge>
                </p>
                <p className="text-sm text-amber-800 dark:text-amber-300 mt-1">
                  {analysis.offerStrategy.urgency === 'HIGH' 
                    ? 'Offer needed within 3-5 days. Candidate likely receiving competing offers.'
                    : analysis.offerStrategy.urgency === 'MEDIUM'
                    ? 'Offer should be prepared within 1-2 weeks to maintain interest.'
                    : 'Standard timeline acceptable. Monitor candidate engagement.'}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Competitive Threat */}
      <Card>
        <CardHeader>
          <CardTitle>Competitive Landscape</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-sm">
                <span className="font-medium">Market Activity: </span>
                Candidate profile suggests passive job seeking but open to opportunities
              </p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-sm">
                <span className="font-medium">Competition: </span>
                Likely receiving 2-3 inbound opportunities from recruiters based on profile strength
              </p>
            </div>
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900">
              <p className="text-sm font-medium text-red-900 dark:text-red-400 mb-1">
                Risk if Delayed
              </p>
              <p className="text-sm text-red-800 dark:text-red-300">
                If offer is delayed beyond 1 week, candidate likely to accept alternative offers
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
