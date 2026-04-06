import { cn } from "@/lib/utils";

type Category = "bache" | "lampara" | "agua" | "basura" | "fuga" | "otro";

const categories: Record<Category, { label: string; emoji: string; bg: string }> = {
  bache:   { label: "Bache",          emoji: "🕳️",  bg: "bg-orange-50 dark:bg-orange-900/20" },
  lampara: { label: "Lámpara",        emoji: "💡",  bg: "bg-yellow-50 dark:bg-yellow-900/20" },
  agua:    { label: "Agua",           emoji: "💧",  bg: "bg-blue-50 dark:bg-blue-900/20" },
  basura:  { label: "Basura",         emoji: "🗑️",  bg: "bg-green-50 dark:bg-green-900/20" },
  fuga:    { label: "Fuga de gas",    emoji: "⚠️",  bg: "bg-red-50 dark:bg-red-900/20" },
  otro:    { label: "Otro",           emoji: "📋",  bg: "bg-slate-50 dark:bg-slate-800" },
};

export default function CategoryIcon({
  category,
  showLabel = false,
  className,
}: {
  category: Category;
  showLabel?: boolean;
  className?: string;
}) {
  const { label, emoji, bg } = categories[category];
  return (
    <div className={cn("flex flex-col items-center gap-1", className)}>
      <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center text-2xl", bg)}>
        {emoji}
      </div>
      {showLabel && (
        <span className="text-xs text-slate-500 dark:text-slate-400 text-center leading-tight">
          {label}
        </span>
      )}
    </div>
  );
}

export { categories };
export type { Category };
