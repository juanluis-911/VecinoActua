import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import StatusBadge from "@/components/ui/StatusBadge";
import CategoryIcon from "@/components/ui/CategoryIcon";
import ComentariosClient from "./ComentariosClient";
import ReactionsButton from "@/components/ui/ReactionsButton";
import type { Database, ReportStatus, ReportCategory, ReactionType } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
type CommentRow = Database["public"]["Tables"]["comments"]["Row"];

type CommentWithAuthor = CommentRow & {
  author: Pick<ProfileRow, "id" | "full_name" | "avatar_url" | "is_verified"> | null;
};

type ReportRow = Database["public"]["Tables"]["reports"]["Row"];
type ReportWithAuthor = ReportRow & {
  author: Pick<ProfileRow, "id" | "full_name" | "avatar_url" | "role" | "is_verified"> | null;
};

const categoryLabels: Record<string, string> = {
  bache:   "Bache",
  lampara: "Lámpara apagada",
  agua:    "Problema de agua",
  basura:  "Basura / limpieza",
  fuga:    "Fuga de gas",
  otro:    "Otro",
};

const roleLabels: Record<string, string> = {
  citizen:    "Ciudadano",
  candidate:  "Candidato",
  official:   "Funcionario",
  influencer: "Influencer",
};

function formatDate(date: string, opts?: Intl.DateTimeFormatOptions) {
  return new Date(date).toLocaleDateString("es-MX", {
    day: "numeric",
    month: "long",
    year: "numeric",
    ...opts,
  });
}


export default async function ReporteDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  // Current user (opcional — para reacciones y comentarios)
  const { data: { user } } = await supabase.auth.getUser();

  let currentProfile: Pick<ProfileRow, "full_name" | "avatar_url"> | null = null;
  let reportReaction: ReactionType | null = null;

  if (user) {
    const [{ data: profile }, { data: likeRow }] = await Promise.all([
      supabase
        .from("profiles")
        .select("full_name, avatar_url")
        .eq("id", user.id)
        .single(),
      supabase
        .from("likes")
        .select("reaction_type")
        .eq("report_id", id)
        .eq("user_id", user.id)
        .maybeSingle(),
    ]);
    currentProfile  = profile;
    reportReaction  = (likeRow?.reaction_type as ReactionType) ?? null;
  }

  // Fetch report + author
  const { data: reportRaw } = await supabase
    .from("reports")
    .select("*, author:profiles!reports_author_id_fkey(id, full_name, avatar_url, role, is_verified)")
    .eq("id", id)
    .single();

  if (!reportRaw) notFound();
  const report = reportRaw as unknown as ReportWithAuthor;

  // Fetch comments + their authors
  const { data: commentsRaw } = await supabase
    .from("comments")
    .select("*, author:profiles!comments_author_id_fkey(id, full_name, avatar_url, is_verified)")
    .eq("report_id", id)
    .order("created_at", { ascending: true });

  const comments = (commentsRaw ?? []) as unknown as CommentWithAuthor[];

  // Reacciones en comentarios
  let userCommentReactions: Record<string, ReactionType> = {};
  let commentReactCounts:   Record<string, number>       = {};

  if (comments.length > 0) {
    const commentIds = comments.map((c) => c.id);
    const [{ data: allReacts }, { data: userReacts }] = await Promise.all([
      supabase
        .from("comment_reactions")
        .select("comment_id")
        .in("comment_id", commentIds),
      user
        ? supabase
            .from("comment_reactions")
            .select("comment_id, reaction_type")
            .in("comment_id", commentIds)
            .eq("user_id", user.id)
        : Promise.resolve({ data: [] }),
    ]);
    for (const r of allReacts ?? []) {
      commentReactCounts[r.comment_id] = (commentReactCounts[r.comment_id] ?? 0) + 1;
    }
    for (const r of (userReacts as { comment_id: string; reaction_type: string }[] | null) ?? []) {
      userCommentReactions[r.comment_id] = r.reaction_type as ReactionType;
    }
  }

  // Fetch resolver profile if resolved
  let resolver: Pick<ProfileRow, "full_name" | "role"> | null = null;
  if (report.resolved_by) {
    const { data } = await supabase
      .from("profiles")
      .select("full_name, role")
      .eq("id", report.resolved_by)
      .single();
    resolver = data;
  }

  // ── Timeline steps ──────────────────────────────────────────────────────────
  const steps = [
    {
      label:     "Reportado",
      date:      formatDate(report.created_at),
      done:      true,
      icon:      "📝",
    },
    {
      label:     "En revisión",
      date:      report.status !== "open" ? "Autoridades notificadas" : null,
      done:      report.status === "in_progress" || report.status === "resolved",
      icon:      "🔄",
    },
    {
      label:     "Resuelto",
      date:      report.resolved_at ? formatDate(report.resolved_at) : null,
      done:      report.status === "resolved",
      icon:      "✅",
    },
  ];

  const isOwner = user?.id === report.author_id;

  return (
    <main className="flex-1 bg-slate-50 dark:bg-slate-900">

      {/* ── Back nav ── */}
      <div className="bg-white dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700 px-4 py-3">
        <div className="mx-auto max-w-3xl flex items-center gap-3">
          <Link
            href={isOwner ? "/perfil" : "/feed"}
            className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-[#2D9CDB] transition-colors"
          >
            ← {isOwner ? "Mi perfil" : "Reportes"}
          </Link>
          <span className="text-slate-300 dark:text-slate-600">·</span>
          <span className="text-sm text-slate-400 truncate">{report.title}</span>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 sm:px-6 py-6 space-y-5">

        {/* ── Hero image / category header ── */}
        {report.image_url ? (
          <div className="w-full rounded-2xl overflow-hidden bg-slate-200 dark:bg-slate-700 aspect-video">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={report.image_url}
              alt={report.title}
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <div className="w-full rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800 py-10 flex items-center justify-center">
            <CategoryIcon category={report.category as ReportCategory} className="scale-150" />
          </div>
        )}

        {/* ── Title + status ── */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-5">
          <div className="flex items-start justify-between gap-3 mb-3">
            <h1 className="text-xl font-bold text-slate-900 dark:text-white leading-snug">
              {report.title}
            </h1>
            <StatusBadge status={report.status as ReportStatus} />
          </div>

          <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mb-4">
            <span className="px-2.5 py-1 bg-slate-100 dark:bg-slate-700 rounded-full text-xs font-medium">
              {categoryLabels[report.category] ?? report.category}
            </span>
            {(report.colonia || report.municipio || report.estado) && (
              <span className="flex items-center gap-1 text-xs">
                📍{" "}
                {[report.colonia, report.municipio, report.estado]
                  .filter(Boolean)
                  .join(", ")}
              </span>
            )}
            {report.address && (
              <span className="text-xs text-slate-400">{report.address}</span>
            )}
          </div>

          {report.description && (
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
              {report.description}
            </p>
          )}

          {/* Author + date */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-700">
            <div className="flex items-center gap-2">
              {report.author?.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={report.author.avatar_url}
                  alt={report.author.full_name ?? ""}
                  className="w-7 h-7 rounded-full object-cover"
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-[#2D9CDB] flex items-center justify-center text-white text-xs font-bold">
                  {report.author?.full_name?.[0]?.toUpperCase() ?? "?"}
                </div>
              )}
              <div>
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {report.author?.full_name ?? "Ciudadano anónimo"}
                </span>
                {report.author?.is_verified && (
                  <span className="ml-1 text-[#2D9CDB] text-xs">✓</span>
                )}
                {report.author?.role && (
                  <span className="ml-1.5 text-xs text-slate-400">
                    {roleLabels[report.author.role]}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-4">
              <ReactionsButton
                reportId={report.id}
                initialReaction={reportReaction}
                initialCount={report.likes_count}
                userId={user?.id ?? null}
                redirectPath={`/reporte/${id}`}
                size="md"
              />
              <a
                href="#comentarios"
                className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-[#2D9CDB] transition-colors font-medium"
              >
                <span>💬</span>
                <span>{report.comments_count}</span>
                <span className="text-xs font-normal">
                  {report.comments_count === 1 ? "comentario" : "comentarios"}
                </span>
              </a>
            </div>
          </div>
        </div>

        {/* ── Status timeline ── */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-5">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white mb-5">
            Seguimiento del reporte
          </h2>

          <div className="relative flex items-start">
            {steps.map((step, i) => (
              <div key={step.label} className="flex-1 relative flex flex-col items-center">
                {/* Connector line (before this node, except first) */}
                {i > 0 && (
                  <div
                    className={`absolute top-4 right-1/2 w-full h-0.5 -translate-y-1/2 ${
                      steps[i - 1].done && step.done
                        ? "bg-[#2D9CDB]"
                        : steps[i - 1].done
                        ? "bg-gradient-to-r from-[#2D9CDB] to-slate-200 dark:to-slate-700"
                        : "bg-slate-200 dark:bg-slate-700"
                    }`}
                  />
                )}

                {/* Node */}
                <div
                  className={`relative z-10 w-9 h-9 rounded-full flex items-center justify-center text-base border-2 transition-all ${
                    step.done
                      ? "bg-[#2D9CDB] border-[#2D9CDB] shadow-md shadow-blue-200 dark:shadow-blue-900/40"
                      : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600"
                  }`}
                >
                  {step.done ? (
                    <span className="text-white text-sm">{step.icon}</span>
                  ) : (
                    <span className="text-slate-300 dark:text-slate-600 text-sm">{step.icon}</span>
                  )}
                </div>

                {/* Label + date */}
                <div className="mt-2.5 text-center px-1">
                  <p
                    className={`text-xs font-semibold ${
                      step.done
                        ? "text-slate-800 dark:text-slate-200"
                        : "text-slate-400 dark:text-slate-500"
                    }`}
                  >
                    {step.label}
                  </p>
                  {step.date && (
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 leading-tight">
                      {step.date}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Resolution card (only if resolved) ── */}
        {report.status === "resolved" && (
          <div className="bg-emerald-50 dark:bg-emerald-950/20 rounded-2xl border border-emerald-100 dark:border-emerald-900/30 p-5">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">✅</span>
              <h2 className="text-sm font-bold text-emerald-700 dark:text-emerald-400">
                Reporte resuelto
              </h2>
              {report.resolved_at && (
                <span className="text-xs text-emerald-600/70 dark:text-emerald-500 ml-auto">
                  {formatDate(report.resolved_at)}
                </span>
              )}
            </div>

            {resolver && (
              <p className="text-xs text-emerald-700 dark:text-emerald-400 mb-3">
                Atendido por{" "}
                <span className="font-semibold">{resolver.full_name ?? "autoridad"}</span>
                {resolver.role && ` (${roleLabels[resolver.role] ?? resolver.role})`}
              </p>
            )}

            {report.evidence_url && (
              <div className="mt-3">
                <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 mb-2">
                  Evidencia de resolución:
                </p>
                <div className="rounded-xl overflow-hidden border border-emerald-200 dark:border-emerald-800">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={report.evidence_url}
                    alt="Evidencia de resolución"
                    className="w-full max-h-64 object-cover"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Comentarios + reacciones ── */}
        <div id="comentarios" className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-5">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white mb-5 flex items-center gap-2">
            💬 Comentarios
            <span className="text-xs font-normal text-slate-400">({comments.length})</span>
          </h2>

          <ComentariosClient
            reportId={id}
            userId={user?.id ?? null}
            userAvatarUrl={currentProfile?.avatar_url ?? null}
            userName={currentProfile?.full_name ?? null}
            initialComments={comments}
            userCommentReactions={userCommentReactions}
            commentReactCounts={commentReactCounts}
          />
        </div>

      </div>
    </main>
  );
}
