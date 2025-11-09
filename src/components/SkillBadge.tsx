import { Badge } from "./ui/badge";

interface SkillBadgeProps {
  type: string;
}

export const SkillBadge = ({ type }: SkillBadgeProps) => {
  const variants: Record<string, { className: string }> = {
    "Técnica": { className: "bg-primary/10 text-primary border-primary/20" },
    "Soft Skill": { className: "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-300" },
    "Liderazgo": { className: "bg-warning/10 text-warning border-warning/20" }
  };

  const variant = variants[type] || variants["Técnica"];

  return (
    <Badge variant="outline" className={variant.className}>
      {type}
    </Badge>
  );
};
