import { LucideIcon } from "lucide-react";
import { Card } from "./ui/card";

interface StatCardProps {
  icon: LucideIcon;
  value: string;
  label: string;
  trend?: "up" | "down" | "stable";
  trendValue?: string;
  iconColor?: string;
}

export const StatCard = ({ icon: Icon, value, label, trend, trendValue, iconColor = "text-primary" }: StatCardProps) => {
  const trendIcons = {
    up: "↑",
    down: "↓",
    stable: "→"
  };

  const trendColors = {
    up: "text-success",
    down: "text-destructive",
    stable: "text-muted-foreground"
  };

  return (
    <Card className="p-6 card-hover relative overflow-hidden">
      <div className="absolute top-4 right-4 opacity-10">
        <Icon className={`h-16 w-16 ${iconColor}`} />
      </div>
      <div className="relative z-10">
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-lg bg-primary/10`}>
            <Icon className={`h-6 w-6 ${iconColor}`} />
          </div>
          <div className="flex-1">
            <p className="text-3xl font-bold text-primary mb-1">{value}</p>
            <p className="text-sm text-muted-foreground">{label}</p>
            {trend && (
              <p className={`text-xs mt-1 ${trendColors[trend]}`}>
                {trendIcons[trend]} {trendValue || (trend === "up" ? "Aumentando" : trend === "down" ? "Disminuyendo" : "Estable")}
              </p>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
};
