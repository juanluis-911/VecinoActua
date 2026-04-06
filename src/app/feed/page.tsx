import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import StatusBadge from "@/components/ui/StatusBadge";
import CategoryIcon from "@/components/ui/CategoryIcon";
import type { ReportWithAuthor, ReportCategory, ReportStatus } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

export default async function FeedPage() {
  const supabase = await createClient();

  const { data: reports, error } = await supabase
    .from("reports")
    .select("*, profiles(id, full_name, avatar_url, role, is_verified)")
    .order("created_at", { ascending: false })
    .limit(50);

  const feed = (reports ?? []) as unknown as ReportWithAuthor[];

  function timeAgo(date: string) {
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `hace ${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `hace ${hrs}h`;
    return `hace ${Math.floor(hrs / 24)}d`;
  }

  return (
    <main className="flex-1 bg-slate-50 dark:bg-slate-900">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Reportes recientes
          </h1>
          <Link
            href="/reporte/nuevo"
            className="px-4 py-2 bg-[#FF5A5F] hover:bg-[#e04e53] text-white text-sm font-semibold rounded-xl transition-colors"
          >
            + Nuevo reporte
          </Link>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-red-50 text-red-600 text-sm mb-4">
            Error cargando reportes: {error.message}
          </div>
        )}

        {feed.length === 0 && !error && (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">📭</div>
            <p className="text-slate-500 dark:text-slate-400 mb-4">
              Todavía no hay reportes. ¡Sé el primero!
            </p>
            <Link
              href="/reporte/nuevo"
              className="inline-block px-6 py-3 bg-[#FF5A5F] text-white font-semibold rounded-xl hover:bg-[#e04e53] transition-colors"
            >
              Crear primer reporte
            </Link>
          </div>
        )}

        <div className="space-y-4">
          {feed.map((report) => (
            <article
              key={report.id}
              className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 hover:shadow-md transition-shadow overflow-hidden group"
            >
              {report.image_url && (
                <div className="w-full h-48 bg-slate-100 dark:bg-slate-700 overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={report.image_url}
                    alt={report.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
              )}

              <div className="p-5">
                <div className="flex items-start gap-4">
                  {!report.image_url && (
                    <div className="shrink-0">
                      <CategoryIcon category={report.category as ReportCategory} />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h2 className="font-semibold text-slate-900 dark:text-white group-hover:text-[#2D9CDB] transition-colors">
                        {report.title}
                      </h2>
                      <StatusBadge status={report.status as ReportStatus} />
                    </div>

                    {report.colonia && (
                      <p className="text-xs text-slate-400 mb-2">📍 {report.colonia}</p>
                    )}

                    {report.description && (
                      <p className="text-sm text-slate-600 dark:text-slate-300 mb-3 line-clamp-2">
                        {report.description}
                      </p>
                    )}

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {report.profiles?.avatar_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={report.profiles.avatar_url}
                            alt={report.profiles.full_name ?? ""}
                            className="w-6 h-6 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-[#2D9CDB] flex items-center justify-center text-white text-xs font-bold">
                            {report.profiles?.full_name?.[0]?.toUpperCase() ?? "?"}
                          </div>
                        )}
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          {report.profiles?.full_name ?? "Ciudadano"}
                          {report.profiles?.is_verified && (
                            <span className="ml-1 text-[#2D9CDB]">✓</span>
                          )}
                        </span>
                        <span className="text-xs text-slate-300 dark:text-slate-600">·</span>
                        <span className="text-xs text-slate-400">{timeAgo(report.created_at)}</span>
                      </div>

                      <div className="flex items-center gap-3 text-xs text-slate-400">
                        <span>❤️ {report.likes_count}</span>
                        <span>💬 {report.comments_count}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </main>
  );
}
