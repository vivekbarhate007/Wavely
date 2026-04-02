interface BadgeProps {
  value: string;
  variant?: "sentiment" | "severity" | "default";
}

const SENTIMENT: Record<string, string> = {
  positive: "text-emerald-700 bg-emerald-50 border-emerald-200",
  negative: "text-red-700 bg-red-50 border-red-200",
  neutral:  "text-gray-600 bg-gray-100 border-gray-200",
};

const SEVERITY: Record<string, string> = {
  high:   "text-red-700 bg-red-50 border-red-200",
  medium: "text-amber-700 bg-amber-50 border-amber-200",
  low:    "text-sky-700 bg-sky-50 border-sky-200",
};

const DOTS: Record<string, string> = {
  positive: "bg-emerald-500",
  negative: "bg-red-500",
  neutral:  "bg-gray-400",
  high:     "bg-red-500",
  medium:   "bg-amber-500",
  low:      "bg-sky-500",
};

export default function Badge({ value, variant = "default" }: BadgeProps) {
  const map = variant === "sentiment" ? SENTIMENT : variant === "severity" ? SEVERITY : {};
  const cls = map[value?.toLowerCase()] ?? "text-gray-600 bg-gray-100 border-gray-200";
  const dot = DOTS[value?.toLowerCase()] ?? "bg-gray-400";
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
      {value}
    </span>
  );
}
