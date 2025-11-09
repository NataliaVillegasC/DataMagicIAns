import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, AlertTriangle, XCircle, Shield, FileCheck, Building2, GraduationCap, Globe } from "lucide-react";

interface BackgroundVerificationProps {
  verification: any;
}

export const BackgroundVerification = ({ verification }: BackgroundVerificationProps) => {
  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-success";
    if (score >= 60) return "text-warning";
    return "text-destructive";
  };

  const getScoreBg = (score: number) => {
    if (score >= 80) return "bg-success/10 border-success/20";
    if (score >= 60) return "bg-warning/10 border-warning/20";
    return "bg-destructive/10 border-destructive/20";
  };

  const getRecommendationBadge = (recommendation: string) => {
    const variants: Record<string, any> = {
      APPROVED: { variant: "default", className: "bg-success text-white" },
      APPROVED_WITH_CONDITIONS: { variant: "secondary", className: "bg-warning text-white" },
      FURTHER_REVIEW_NEEDED: { variant: "secondary", className: "bg-warning text-white" },
      NOT_RECOMMENDED: { variant: "destructive" }
    };
    return variants[recommendation] || { variant: "secondary" };
  };

  const getVerificationIcon = (status: string) => {
    if (status === 'verified') return <CheckCircle2 className="h-4 w-4 text-success" />;
    if (status === 'likely_valid') return <CheckCircle2 className="h-4 w-4 text-warning" />;
    return <AlertTriangle className="h-4 w-4 text-warning" />;
  };

  return (
    <div className="space-y-6">
      {/* Overall Assessment */}
      <Card className={`p-6 border-2 ${getScoreBg(100 - verification.overall_risk_score)}`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Shield className="h-8 w-8" />
            <div>
              <h3 className="text-xl font-bold">Background Verification</h3>
              <p className="text-sm text-muted-foreground">{verification.summary}</p>
            </div>
          </div>
          <Badge {...getRecommendationBadge(verification.recommendation)}>
            {verification.recommendation.replace(/_/g, ' ')}
          </Badge>
        </div>

        <div className="grid grid-cols-2 gap-4 mt-6">
          <div>
            <p className="text-sm font-medium mb-2">Identity Verification</p>
            <div className="flex items-center gap-2">
              <Progress value={verification.identity_verification.score} className="flex-1" />
              <span className={`text-sm font-bold ${getScoreColor(verification.identity_verification.score)}`}>
                {verification.identity_verification.score}%
              </span>
            </div>
          </div>
          <div>
            <p className="text-sm font-medium mb-2">Overall Risk Score</p>
            <div className="flex items-center gap-2">
              <Progress value={100 - verification.overall_risk_score} className="flex-1" />
              <span className={`text-sm font-bold ${getScoreColor(100 - verification.overall_risk_score)}`}>
                {verification.overall_risk_score}%
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* Identity Verification Details */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <FileCheck className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-lg">Identity Verification</h3>
          <Badge variant="outline" className="ml-auto">
            {verification.identity_verification.confidence} confidence
          </Badge>
        </div>

        {verification.identity_verification.verified_details.length > 0 && (
          <div className="mb-4">
            <p className="text-sm font-medium mb-2 text-success">Verified Details</p>
            <div className="space-y-2">
              {verification.identity_verification.verified_details.map((detail: string, idx: number) => (
                <div key={idx} className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-success mt-0.5 flex-shrink-0" />
                  <span>{detail}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {verification.identity_verification.unverified_details.length > 0 && (
          <div>
            <p className="text-sm font-medium mb-2 text-warning">Unverified Details</p>
            <div className="space-y-2">
              {verification.identity_verification.unverified_details.map((detail: string, idx: number) => (
                <div key={idx} className="flex items-start gap-2 text-sm">
                  <AlertTriangle className="h-4 w-4 text-warning mt-0.5 flex-shrink-0" />
                  <span>{detail}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* Employment Verification */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Building2 className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-lg">Employment History Verification</h3>
        </div>

        <div className="space-y-4">
          {verification.employment_verification.map((employment: any, idx: number) => (
            <div key={idx} className="p-4 bg-muted/50 rounded-lg border">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-medium">{employment.position}</p>
                  <p className="text-sm text-muted-foreground">{employment.company}</p>
                  <p className="text-xs text-muted-foreground">{employment.stated_duration}</p>
                </div>
                <div className="flex items-center gap-2">
                  {getVerificationIcon(employment.verification_status)}
                  <Badge variant="outline" className="text-xs">
                    {employment.confidence} confidence
                  </Badge>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                <span className="font-medium">Source:</span> {employment.source}
              </p>
            </div>
          ))}
        </div>
      </Card>

      {/* Education Verification */}
      {verification.education_verification && verification.education_verification.length > 0 && (
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <GraduationCap className="h-5 w-5 text-primary" />
            <h3 className="font-semibold text-lg">Education Verification</h3>
          </div>

          <div className="space-y-4">
            {verification.education_verification.map((education: any, idx: number) => (
              <div key={idx} className="p-4 bg-muted/50 rounded-lg border">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-medium">{education.degree}</p>
                    <p className="text-sm text-muted-foreground">{education.institution}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {getVerificationIcon(education.verification_status)}
                    <Badge variant="outline" className="text-xs">
                      {education.confidence} confidence
                    </Badge>
                  </div>
                </div>
                {education.notes && (
                  <p className="text-sm text-muted-foreground mt-2">{education.notes}</p>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Professional Reputation */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Globe className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-lg">Professional Reputation</h3>
          <Badge variant="outline" className="ml-auto">
            Score: {verification.professional_reputation.score}/100
          </Badge>
        </div>

        <div className="space-y-3">
          {verification.professional_reputation.github_activity && (
            <div className="flex items-start gap-2 text-sm">
              <CheckCircle2 className="h-4 w-4 text-success mt-0.5 flex-shrink-0" />
              <div>
                <span className="font-medium">GitHub:</span> {verification.professional_reputation.github_activity}
              </div>
            </div>
          )}
          {verification.professional_reputation.linkedin_endorsements && (
            <div className="flex items-start gap-2 text-sm">
              <CheckCircle2 className="h-4 w-4 text-success mt-0.5 flex-shrink-0" />
              <div>
                <span className="font-medium">LinkedIn:</span> {verification.professional_reputation.linkedin_endorsements}
              </div>
            </div>
          )}
          {verification.professional_reputation.online_presence && (
            <div className="flex items-start gap-2 text-sm">
              <CheckCircle2 className="h-4 w-4 text-success mt-0.5 flex-shrink-0" />
              <div>
                <span className="font-medium">Online Presence:</span> {verification.professional_reputation.online_presence}
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Red Flags */}
      {verification.red_flags && verification.red_flags.length > 0 && (
        <Card className="p-6 border-destructive/50 bg-destructive/5">
          <div className="flex items-center gap-2 mb-4">
            <XCircle className="h-5 w-5 text-destructive" />
            <h3 className="font-semibold text-lg text-destructive">Red Flags Identified</h3>
          </div>

          <div className="space-y-3">
            {verification.red_flags.map((flag: any, idx: number) => (
              <div key={idx} className="p-4 bg-background rounded-lg border border-destructive/20">
                <p className="font-medium text-destructive">{flag.title || flag}</p>
                {flag.description && (
                  <p className="text-sm text-muted-foreground mt-1">{flag.description}</p>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Verification Sources */}
      <Card className="p-6 bg-muted/50">
        <h3 className="font-semibold mb-3">Verification Sources Used</h3>
        <div className="flex flex-wrap gap-2">
          {verification.verification_sources.map((source: string, idx: number) => (
            <Badge key={idx} variant="secondary">
              {source}
            </Badge>
          ))}
        </div>
      </Card>
    </div>
  );
};
