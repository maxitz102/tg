import { cn } from "@/lib/utils";

interface ShiftBlockProps {
  startTime: string;
  endTime: string;
  type: "morning" | "afternoon" | "evening" | "night";
  location?: string;
}

export const ShiftBlock = ({ startTime, endTime, type, location }: ShiftBlockProps) => {
  const shiftColors = {
    morning: "bg-shift-morning text-primary-foreground",
    afternoon: "bg-shift-afternoon text-secondary-foreground",
    evening: "bg-shift-evening text-white",
    night: "bg-shift-night text-white",
  };

  return (
    <div
      className={cn(
        "rounded-lg p-2 text-sm font-medium shadow-sm border border-border/20",
        shiftColors[type]
      )}
    >
      <div className="font-semibold">{`${startTime} - ${endTime}`}</div>
      {location && <div className="text-xs opacity-90 mt-0.5">{location}</div>}
    </div>
  );
};