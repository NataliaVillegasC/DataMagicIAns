import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CheckCircle2, AlertCircle, XCircle, TrendingUp, Target } from "lucide-react";
import type { AIAnalysis } from "@/lib/aiAnalysisEngine";

interface SkillMatchDeepDiveProps {
  analysis: AIAnalysis;
}

export function SkillMatchDeepDive({ analysis }: SkillMatchDeepDiveProps) {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'exceed':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'meet':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'below':
        return <AlertCircle className="h-4 w-4 text-amber-500" />;
      case 'missing':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'exceed':
        return 'Exceeds';
      case 'meet':
        return 'Meets';
      case 'below':
        return 'Below';
      case 'missing':
        return 'Missing';
      default:
        return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'exceed':
        return 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-400';
      case 'meet':
        return 'bg-green-50 text-green-700 dark:bg-green-950/50 dark:text-green-500';
      case 'below':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-400';
      case 'missing':
        return 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-400';
      default:
        return '';
    }
  };

  return (
    <div className="space-y-6">
      {/* Overview Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            <CardTitle>Skill Match Overview</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-4xl font-bold text-primary">{analysis.skillMatchScore}%</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {analysis.skillMatchScore} of 100 points in required skills detected
                </p>
              </div>
              <div className="w-32 h-32">
                <Progress 
                  value={analysis.skillMatchScore} 
                  className="h-32 w-32 [&>div]:rounded-full"
                  style={{ transform: 'rotate(-90deg)' }}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Skills Comparison Table */}
      <Card>
        <CardHeader>
          <CardTitle>Required vs. Actual Skills Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Skill</TableHead>
                  <TableHead>Required</TableHead>
                  <TableHead>Candidate</TableHead>
                  <TableHead>Confidence</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Gap</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {analysis.skillComparisons.map((skill, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{skill.skillName}</TableCell>
                    <TableCell>{skill.requiredLevel}%</TableCell>
                    <TableCell>{skill.candidateLevel}%</TableCell>
                    <TableCell>
                      <Badge variant="outline">{skill.confidence}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(skill.status)}
                        <Badge className={getStatusColor(skill.status)}>
                          {getStatusText(skill.status)}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className={skill.gap >= 0 ? 'text-green-600' : 'text-red-600'}>
                      {skill.gap > 0 ? '+' : ''}{skill.gap}%
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Skill Categories Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Skill Categories Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {analysis.skillCategories.map((category, index) => (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{category.name}</span>
                  <span className="text-sm font-bold">{category.coverage}%</span>
                </div>
                <Progress value={category.coverage} />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Skill Gap Recommendations */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            <CardTitle>Skill Gap Recommendations</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3">
            {analysis.skillGapRecommendations.map((rec, index) => (
              <li key={index} className="flex items-start gap-2">
                <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <p className="text-sm">{rec}</p>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
