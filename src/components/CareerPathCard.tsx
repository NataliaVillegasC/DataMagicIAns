import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { ConfidenceBar } from "./ConfidenceBar";
import { CheckCircle2, AlertCircle, TrendingUp, Clock, Briefcase } from "lucide-react";
import { useState } from "react";

interface Gap {
  name: string;
  current: number;
  target: number;
  importance: string;
}

interface CareerPathCardProps {
  path: {
    id: string;
    title: string;
    fit: number;
    timeline: string;
    currentSkills: { name: string; score: number }[];
    gaps: Gap[];
    availableRoles: number;
    suggestedActions: string[];
    estimatedSalary: string;
    growthPotential: string;
  };
}

export const CareerPathCard = ({ path }: CareerPathCardProps) => {
  const [expanded, setExpanded] = useState(false);

  const importanceColors: Record<string, string> = {
    "crítica": "text-destructive",
    "alta": "text-warning",
    "media": "text-primary"
  };

  return (
    <Card className="p-6 card-hover">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <h3 className="font-bold text-xl mb-2">{path.title}</h3>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm text-muted-foreground">Fit Score:</span>
              <div className="flex-1 max-w-[200px]">
                <ConfidenceBar confidence={path.fit} height="md" />
              </div>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            <div>
              <p className="text-xs text-muted-foreground">Timeline</p>
              <p className="text-sm font-semibold">{path.timeline}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Briefcase className="h-4 w-4 text-primary" />
            <div>
              <p className="text-xs text-muted-foreground">Roles Disponibles</p>
              <p className="text-sm font-semibold">{path.availableRoles}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 col-span-2 sm:col-span-1">
            <TrendingUp className="h-4 w-4 text-success" />
            <div>
              <p className="text-xs text-muted-foreground">Salario Estimado</p>
              <p className="text-sm font-semibold">{path.estimatedSalary}</p>
            </div>
          </div>
        </div>

        {/* Current Skills */}
        <div className="space-y-2">
          <h4 className="font-semibold text-sm flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-success" />
            Habilidades Actuales que te Ayudan
          </h4>
          <div className="flex flex-wrap gap-2">
            {path.currentSkills.map((skill, idx) => (
              <Badge key={idx} variant="outline" className="bg-success/10 text-success border-success/20">
                {skill.name} ({skill.score}%)
              </Badge>
            ))}
          </div>
        </div>

        {/* Skill Gaps */}
        <div className="space-y-2">
          <h4 className="font-semibold text-sm flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-warning" />
            Skills Gaps Identificados
          </h4>
          <div className="space-y-2">
            {path.gaps.map((gap, idx) => (
              <div key={idx} className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{gap.name}</span>
                  <span className={`text-xs font-semibold ${importanceColors[gap.importance]}`}>
                    {gap.importance}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <ConfidenceBar confidence={gap.current} showLabel={false} height="sm" />
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {gap.current}% → {gap.target}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Suggested Actions */}
        {expanded && (
          <div className="space-y-2 animate-in fade-in-50 duration-300">
            <h4 className="font-semibold text-sm">Plan de Desarrollo Recomendado</h4>
            <ul className="space-y-1">
              {path.suggestedActions.map((action, idx) => (
                <li key={idx} className="text-sm text-foreground flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>{action}</span>
                </li>
              ))}
            </ul>
            <div className="p-3 bg-muted rounded-lg mt-3">
              <p className="text-sm">
                <span className="font-semibold">Potencial de Crecimiento:</span> {path.growthPotential}
              </p>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <Button onClick={() => setExpanded(!expanded)} className="flex-1">
            {expanded ? "Ver Menos" : "Explorar esta Ruta"}
          </Button>
          <Button variant="outline">Contactar Mentor</Button>
        </div>
      </div>
    </Card>
  );
};
