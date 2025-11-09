import { Card } from "./ui/card";
import { SkillBadge } from "./SkillBadge";
import { ConfidenceBar } from "./ConfidenceBar";
import { Star, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";

interface Source {
  source: string;
  credibility: number;
  evidence: string;
}

interface SkillCardProps {
  skill: {
    id: string;
    name: string;
    type: string;
    confidence: number;
    level: number;
    category: string;
    lastUpdated: string;
    sources: Source[];
  };
}

export const SkillCard = ({ skill }: SkillCardProps) => {
  const [expanded, setExpanded] = useState(false);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return "Hoy";
    if (diffDays === 1) return "Hace 1 día";
    if (diffDays < 7) return `Hace ${diffDays} días`;
    if (diffDays < 30) return `Hace ${Math.floor(diffDays / 7)} semanas`;
    return `Hace ${Math.floor(diffDays / 30)} meses`;
  };

  return (
    <Card className="p-4 card-hover cursor-pointer" onClick={() => setExpanded(!expanded)}>
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-lg">{skill.name}</h3>
              <SkillBadge type={skill.type} />
            </div>
            <p className="text-xs text-muted-foreground">{skill.category}</p>
          </div>
          <Button variant="ghost" size="icon" className="h-6 w-6">
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>

        {/* Confidence Bar */}
        <div>
          <ConfidenceBar confidence={skill.confidence} />
        </div>

        {/* Level Stars */}
        <div className="flex items-center gap-2">
          <div className="flex gap-0.5">
            {[...Array(5)].map((_, i) => (
              <Star
                key={i}
                className={`h-4 w-4 ${
                  i < skill.level
                    ? "fill-warning text-warning"
                    : "fill-muted text-muted"
                }`}
              />
            ))}
          </div>
          <span className="text-xs text-muted-foreground">
            Actualizado {formatDate(skill.lastUpdated)}
          </span>
        </div>

        {/* Evidence Trail (Expanded) */}
        {expanded && (
          <div className="pt-3 border-t border-border space-y-3 animate-in fade-in-50 duration-300">
            <h4 className="font-semibold text-sm">Evidencia Detallada</h4>
            <div className="space-y-2">
              {skill.sources.map((source, idx) => (
                <div key={idx} className="p-3 bg-muted rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <Badge variant="secondary" className="font-medium">
                      {source.source}
                    </Badge>
                    <span className="text-xs font-semibold text-success">
                      {source.credibility}% credibilidad
                    </span>
                  </div>
                  <p className="text-sm text-foreground">{source.evidence}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};
