"use client";

import Link from "next/link";
import StatusBadge from "@/components/ui/StatusBadge";
import CategoryIcon from "@/components/ui/CategoryIcon";
import LikeButton from "@/components/ui/LikeButton";
import type { ReportWithAuthor, ReportStatus, ReportCategory } from "@/lib/supabase/types";

interface Props {
  reports:  ReportWithAuthor[];
  likedIds: string[];
  userId:   string | null;
}

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 2)   return "justo ahora";
  if (mins < 60)  return `hace ${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)   return `hace ${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return "ayer";
  if (days < 30)  return `hace ${days}d`;
  return new Date(date).toLocaleDateString("es-MX", { day: "numeric", month: "short" });
}

export default function FeedClient({ reports, likedIds, userId }: Props) {
  const likedSet = new Set(likedIds);

  return (
    <div className="space-y-4">
      {reports.map((report) => (
        <article
          key={report.id}
          className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 hover:shadow-md transition-shadow overflow-hidden group"
        >
          {/* ── Clickable content area ── */}
          <Link href={`/reporte/${report.id}`} className="block">
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

                  {/* Author */}
                  <div className="flex items-center gap-2">
                    {report.author?.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={report.author.avatar_url}
                        alt={report.author.full_name ?? ""}
                        className="w-6 h-6 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-[#2D9CDB] flex items-center justify-center text-white text-xs font-bold">
                        {report.author?.full_name?.[0]?.toUpperCase() ?? "?"}
                      </div>
                    )}
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {report.author?.full_name ?? "Ciudadano"}
                      {report.author?.is_verified && (
                        <span className="ml-1 text-[#2D9CDB]">✓</span>
                      )}
                    </span>
                    <span className="text-xs text-slate-300 dark:text-slate-600">·</span>
                    <span className="text-xs text-slate-400">{timeAgo(report.created_at)}</span>
                  </div>
                </div>
              </div>
            </div>
          </Link>

          {/* ── Acciones (fuera del Link para no navegar) ── */}
          <div className="flex items-center gap-4 px-5 py-3 border-t border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-700/20">
            <LikeButton
              reportId={report.id}
              initialCount={report.likes_count}
              initialLiked={likedSet.has(report.id)}
              userId={userId}
              redirectPath="/feed"
            />

            <Link
              href={`/reporte/${report.id}#comentarios`}
              className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-[#2D9CDB] transition-colors font-medium"
            >
              <span>💬</span>
              <span>{report.comments_count}</span>
              <span className="text-xs font-normal hidden sm:inline">
                {report.comments_count === 1 ? "comentario" : "comentarios"}
              </span>
            </Link>

            <Link
              href={`/reporte/${report.id}`}
              className="ml-auto text-xs text-slate-400 hover:text-[#2D9CDB] transition-colors"
            >
              Ver reporte →
            </Link>
          </div>
        </article>
      ))}
    </div>
  );
}
