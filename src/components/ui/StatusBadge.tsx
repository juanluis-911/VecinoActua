import { cn } from "@/lib/utils";

type Status = "open" | "in_progress" | "resolved";

const config: Record<Status, { label: string; className: string }> = {
  open: {
    label: "Nuevo",
    className: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
  },
  in_progress: {
    label: "En proceso",
    className: "bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-900/20 dark:text-amber-400",
  },
  resolved: {
    label: "Resuelto",
    className: "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400",
  },
};

export default function StatusBadge({ status }: { status: Status }) {
  const { label, className } = config[status];
  return (
    <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold", className)}>
      {label}
    </span>
  );
}
