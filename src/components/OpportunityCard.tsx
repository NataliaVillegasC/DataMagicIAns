import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { CheckCircle2, XCircle, MinusCircle, Heart, Share2 } from "lucide-react";
import { ConfidenceBar } from "./ConfidenceBar";
import { toast } from "sonner";

interface Skill {
  name: string;
  required: boolean;
  userHas: boolean;
  userScore: number;
  targetScore: number;
}

interface OpportunityCardProps {
  opportunity: {
    id: string;
    title: string;
    type: string;
    department: string;
    reportsTo: string;
    matchScore: number;
    description: string;
    requiredSkills: Skill[];
    timeline: string;
    applicationCount: number;
    salary?: string;
  };
  onExpressInterest?: () => void;
}

export const OpportunityCard = ({ opportunity, onExpressInterest }: OpportunityCardProps) => {
  const typeColors: Record<string, string> = {
    "Promoción": "bg-success/10 text-success border-success/20",
    "Lateral": "bg-primary/10 text-primary border-primary/20",
    "Proyectos Especiales": "bg-warning/10 text-warning border-warning/20"
  };

  const handleExpressInterest = () => {
    toast.success("Interés registrado", {
      description: `${opportunity.reportsTo} será notificado de tu interés en ${opportunity.title}`
    });
    onExpressInterest?.();
  };

  const handleShare = () => {
    toast.success("Enlace copiado al portapapeles");
  };

  return (
    <Card className="p-6 card-hover">
      <div className="space-y-4">
        {/* Header */}
        <div className="space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <h3 className="font-bold text-xl mb-1">{opportunity.title}</h3>
              <p className="text-sm text-muted-foreground">{opportunity.department}</p>
            </div>
            <Badge variant="outline" className={typeColors[opportunity.type] || typeColors["Lateral"]}>
              {opportunity.type}
            </Badge>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-muted-foreground">
              Reporta a: <span className="text-foreground font-medium">{opportunity.reportsTo}</span>
            </span>
            <span className="text-primary font-semibold">
              {opportunity.matchScore}% Coincidencia
            </span>
          </div>
        </div>

        {/* Description */}
        <p className="text-sm text-foreground">{opportunity.description}</p>

        {/* Required Skills */}
        <div className="space-y-2">
          <h4 className="font-semibold text-sm">Habilidades Requeridas</h4>
          <div className="space-y-2">
            {opportunity.requiredSkills.map((skill, idx) => (
              <div key={idx} className="space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-1">
                    {skill.userHas ? (
                      skill.userScore >= skill.targetScore ? (
                        <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
                      ) : (
                        <MinusCircle className="h-4 w-4 text-warning shrink-0" />
                      )
                    ) : (
                      <XCircle className="h-4 w-4 text-destructive shrink-0" />
                    )}
                    <span className="text-sm font-medium">{skill.name}</span>
                    {skill.required && (
                      <Badge variant="outline" className="text-xs">Requerida</Badge>
                    )}
                  </div>
                  {skill.userHas && (
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      Tienes {skill.userScore}%
                    </span>
                  )}
                </div>
                {skill.userHas && (
                  <ConfidenceBar 
                    confidence={skill.userScore} 
                    showLabel={false} 
                    height="sm" 
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-3 border-t border-border">
          <div className="space-y-1 text-sm">
            <p className="text-muted-foreground">{opportunity.timeline}</p>
            {opportunity.salary && (
              <p className="font-semibold text-primary">{opportunity.salary}</p>
            )}
            <p className="text-xs text-muted-foreground">
              {opportunity.applicationCount} candidatos aplicaron
            </p>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button variant="outline" size="icon" onClick={handleShare}>
              <Share2 className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon">
              <Heart className="h-4 w-4" />
            </Button>
            <Button onClick={handleExpressInterest} className="flex-1 sm:flex-initial">
              Expresar Interés
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
};
