interface ConfidenceBarProps {
  confidence: number;
  showLabel?: boolean;
  height?: "sm" | "md" | "lg";
}

export const ConfidenceBar = ({ confidence, showLabel = true, height = "sm" }: ConfidenceBarProps) => {
  const heightClasses = {
    sm: "h-2",
    md: "h-3",
    lg: "h-4"
  };

  const getColor = (value: number) => {
    if (value >= 85) return "bg-success";
    if (value >= 70) return "bg-primary";
    if (value >= 50) return "bg-warning";
    return "bg-destructive";
  };

  return (
    <div className="w-full">
      <div className="flex items-center gap-2">
        <div className={`flex-1 bg-muted rounded-full overflow-hidden ${heightClasses[height]}`}>
          <div
            className={`${heightClasses[height]} ${getColor(confidence)} transition-all duration-500 rounded-full`}
            style={{ width: `${confidence}%` }}
          />
        </div>
        {showLabel && (
          <span className="text-sm font-semibold text-foreground min-w-[3rem] text-right">
            {confidence}%
          </span>
        )}
      </div>
    </div>
  );
};
