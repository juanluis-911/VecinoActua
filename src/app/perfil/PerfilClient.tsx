"use client";

import { useState } from "react";
import Link from "next/link";
import StatusBadge from "@/components/ui/StatusBadge";
import CategoryIcon from "@/components/ui/CategoryIcon";
import type { ReportWithAuthor, ReportStatus, ReportCategory } from "@/lib/supabase/types";

type Tab = "all" | "open" | "in_progress" | "resolved";

const tabs: { key: Tab; label: string }[] = [
  { key: "all",         label: "Todos" },
  { key: "open",        label: "Abiertos" },
  { key: "in_progress", label: "En proceso" },
  { key: "resolved",    label: "Resueltos" },
];

const categoryLabels: Record<string, string> = {
  bache:   "Bache",
  lampara: "Lámpara",
  agua:    "Agua",
  basura:  "Basura",
  fuga:    "Fuga de gas",
  otro:    "Otro",
};

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 2)   return "justo ahora";
  if (mins < 60)  return `hace ${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)   return `hace ${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return "ayer";
  if (days < 30)  return `hace ${days} días`;
  return new Date(date).toLocaleDateString("es-MX", { day: "numeric", month: "short" });
}

function daysOpenLabel(date: string) {
  const days = Math.floor((Date.now() - new Date(date).getTime()) / 86400000);
  if (days === 0) return "hoy";
  if (days === 1) return "1 día";
  return `${days} días`;
}

interface Props {
  reports: ReportWithAuthor[];
}

export default function PerfilClient({ reports }: Props) {
  const [tab, setTab] = useState<Tab>("all");

  const counts: Record<Tab, number> = {
    all:         reports.length,
    open:        reports.filter((r) => r.status === "open").length,
    in_progress: reports.filter((r) => r.status === "in_progress").length,
    resolved:    reports.filter((r) => r.status === "resolved").length,
  };

  const displayed = tab === "all" ? reports : reports.filter((r) => r.status === tab);

  return (
    <>
      {/* ── Stats card — overlaps header ── */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-100 dark:border-slate-700 p-5 -mt-12 mb-6">
        <div className="grid grid-cols-4 gap-2 text-center">
          {(
            [
              { key: "all"         as Tab, label: "Total",      color: "text-slate-900 dark:text-white" },
              { key: "open"        as Tab, label: "Abiertos",   color: "text-orange-500" },
              { key: "in_progress" as Tab, label: "En proceso", color: "text-blue-500" },
              { key: "resolved"    as Tab, label: "Resueltos",  color: "text-emerald-500" },
            ] as const
          ).map(({ key, label, color }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`rounded-xl py-2.5 transition-all cursor-pointer ${
                tab === key
                  ? "bg-slate-50 dark:bg-slate-700/60 ring-1 ring-slate-200 dark:ring-slate-600"
                  : "hover:bg-slate-50 dark:hover:bg-slate-700/30 opacity-60 hover:opacity-80"
              }`}
            >
              <div className={`text-2xl font-bold ${color}`}>{counts[key]}</div>
              <div className="text-xs text-slate-400 mt-0.5">{label}</div>
            </button>
          ))}
        </div>
      </div>

      {/* ── Section header ── */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">Mis reportes</h2>
        <Link
          href="/reporte/nuevo"
          className="px-4 py-2 bg-[#FF5A5F] hover:bg-[#e04e53] text-white text-sm font-semibold rounded-xl transition-colors"
        >
          + Nuevo
        </Link>
      </div>

      {/* ── Tab bar ── */}
      <div className="flex gap-1 mb-5 bg-slate-100 dark:bg-slate-700/40 rounded-xl p-1">
        {tabs.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              tab === key
                ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm"
                : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            {label}
            {counts[key] > 0 && tab !== key && (
              <span className="ml-1 opacity-60 text-[10px]">{counts[key]}</span>
            )}
          </button>
        ))}
      </div>

      {/* ── Reports list ── */}
      {displayed.length === 0 ? (
        <div className="text-center py-14">
          <div className="text-4xl mb-3">
            {tab === "open" ? "🎉" : tab === "in_progress" ? "⏳" : tab === "resolved" ? "✅" : "📝"}
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            {tab === "open"
              ? "¡No tienes reportes pendientes!"
              : tab === "in_progress"
              ? "Ningún reporte en proceso."
              : tab === "resolved"
              ? "Todavía no tienes reportes resueltos."
              : "Todavía no has hecho ningún reporte."}
          </p>
          {tab === "all" && (
            <Link
              href="/reporte/nuevo"
              className="inline-block mt-4 px-5 py-2.5 bg-[#FF5A5F] text-white font-semibold rounded-xl hover:bg-[#e04e53] transition-colors text-sm"
            >
              Crear mi primer reporte
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {displayed.map((report) => (
            <Link key={report.id} href={`/reporte/${report.id}`} className="block group">
              <article className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 overflow-hidden hover:shadow-md hover:border-[#2D9CDB]/30 transition-all">

                {/* Main row */}
                <div className="flex gap-4 p-4">
                  {report.image_url ? (
                    <div className="w-20 h-20 shrink-0 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-700">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={report.image_url}
                        alt={report.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                  ) : (
                    <div className="shrink-0">
                      <CategoryIcon category={report.category as ReportCategory} />
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h3 className="font-semibold text-slate-900 dark:text-white text-sm group-hover:text-[#2D9CDB] transition-colors line-clamp-2 leading-snug">
                        {report.title}
                      </h3>
                      <StatusBadge status={report.status as ReportStatus} />
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                      <span className="text-xs text-slate-400">
                        {categoryLabels[report.category] ?? report.category}
                      </span>
                      {report.colonia && (
                        <>
                          <span className="text-slate-300 dark:text-slate-600">·</span>
                          <span className="text-xs text-slate-400 truncate max-w-[130px]">
                            📍 {report.colonia}
                          </span>
                        </>
                      )}
                    </div>

                    {report.description && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 mb-2">
                        {report.description}
                      </p>
                    )}

                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-400">{timeAgo(report.created_at)}</span>
                      <div className="flex items-center gap-3 text-xs text-slate-400">
                        <span>❤️ {report.likes_count}</span>
                        <span>💬 {report.comments_count}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Tracking footer */}
                <div
                  className={`px-4 py-2.5 border-t flex items-center justify-between text-xs font-medium ${
                    report.status === "resolved"
                      ? "bg-emerald-50/80 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/30 text-emerald-600 dark:text-emerald-400"
                      : report.status === "in_progress"
                      ? "bg-amber-50/80 dark:bg-amber-950/20 border-amber-100 dark:border-amber-900/30 text-amber-600 dark:text-amber-400"
                      : "bg-slate-50/80 dark:bg-slate-700/20 border-slate-100 dark:border-slate-700/50 text-slate-400"
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    {report.status === "resolved" ? (
                      <>
                        ✅ Resuelto
                        {report.resolved_at && (
                          <span className="font-normal opacity-80">
                            · {new Date(report.resolved_at).toLocaleDateString("es-MX", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </span>
                        )}
                        {report.evidence_url && (
                          <span className="ml-1 px-1.5 py-0.5 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 rounded text-[10px] font-semibold">
                            con evidencia
                          </span>
                        )}
                      </>
                    ) : report.status === "in_progress" ? (
                      <>🔄 En revisión · abierto hace {daysOpenLabel(report.created_at)}</>
                    ) : (
                      <>🕐 Pendiente · abierto hace {daysOpenLabel(report.created_at)}</>
                    )}
                  </span>
                  <span className="text-slate-400 group-hover:text-[#2D9CDB] transition-colors text-[11px] font-normal">
                    Ver detalles →
                  </span>
                </div>
              </article>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
