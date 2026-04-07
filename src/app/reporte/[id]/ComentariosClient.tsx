"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import ReactionsButton from "@/components/ui/ReactionsButton";
import type { Database, ReactionType } from "@/lib/supabase/types";

type ProfileRow    = Database["public"]["Tables"]["profiles"]["Row"];
type CommentRow    = Database["public"]["Tables"]["comments"]["Row"];
type CommentWithAuthor = CommentRow & {
  author: Pick<ProfileRow, "id" | "full_name" | "avatar_url" | "is_verified"> | null;
};

interface Props {
  reportId:             string;
  userId:               string | null;
  userAvatarUrl:        string | null;
  userName:             string | null;
  initialComments:      CommentWithAuthor[];
  userCommentReactions: Record<string, ReactionType>; // commentId → tipo
  commentReactCounts:   Record<string, number>;       // commentId → total
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
  if (days < 30)  return `hace ${days} días`;
  return new Date(date).toLocaleDateString("es-MX", { day: "numeric", month: "short" });
}

export default function ComentariosClient({
  reportId,
  userId,
  userAvatarUrl,
  userName,
  initialComments,
  userCommentReactions,
  commentReactCounts,
}: Props) {
  const [content,    setContent]    = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error,      setError]      = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const router      = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = content.trim();
    if (!trimmed || submitting) return;

    setSubmitting(true);
    setError(null);

    const supabase = createClient();
    const { error: insertError } = await supabase
      .from("comments")
      .insert({ report_id: reportId, author_id: userId!, content: trimmed });

    if (insertError) {
      setError("No se pudo publicar el comentario. Intenta de nuevo.");
      setSubmitting(false);
      return;
    }

    setContent("");
    setSubmitting(false);
    router.refresh();
  }

  const avatarLetter = userName?.[0]?.toUpperCase() ?? "?";
  const remaining    = 500 - content.length;

  return (
    <div>
      {/* ── Lista de comentarios ── */}
      {initialComments.length === 0 ? (
        <p className="text-sm text-slate-400 dark:text-slate-500 py-4 text-center">
          Sé el primero en comentar.
        </p>
      ) : (
        <div className="space-y-5 mb-5">
          {initialComments.map((comment) => {
            const letter = comment.author?.full_name?.[0]?.toUpperCase() ?? "?";
            return (
              <div key={comment.id} className="flex gap-3">
                {/* Avatar */}
                {comment.author?.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={comment.author.avatar_url}
                    alt={comment.author.full_name ?? ""}
                    className="w-8 h-8 rounded-full object-cover shrink-0 mt-0.5"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-600 flex items-center justify-center text-xs font-bold text-slate-600 dark:text-slate-300 shrink-0 mt-0.5">
                    {letter}
                  </div>
                )}

                {/* Contenido */}
                <div className="flex-1 min-w-0">
                  {/* Bubble */}
                  <div className="bg-slate-50 dark:bg-slate-700/50 rounded-2xl rounded-tl-sm px-4 py-3">
                    <div className="flex items-baseline gap-2 mb-1">
                      <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                        {comment.author?.full_name ?? "Anónimo"}
                      </span>
                      {comment.author?.is_verified && (
                        <span className="text-[#2D9CDB] text-xs">✓</span>
                      )}
                      <span className="text-xs text-slate-400 ml-auto shrink-0">
                        {timeAgo(comment.created_at)}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                      {comment.content}
                    </p>
                  </div>

                  {/* Reacción al comentario */}
                  <div className="mt-1.5 ml-2">
                    <ReactionsButton
                      commentId={comment.id}
                      initialReaction={userCommentReactions[comment.id] ?? null}
                      initialCount={commentReactCounts[comment.id] ?? 0}
                      userId={userId}
                      redirectPath={`/reporte/${reportId}#comentarios`}
                      size="sm"
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Formulario de comentario ── */}
      {userId ? (
        <form
          onSubmit={handleSubmit}
          className="flex gap-3 pt-4 border-t border-slate-100 dark:border-slate-700"
        >
          {/* Avatar del usuario */}
          {userAvatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={userAvatarUrl}
              alt={userName ?? ""}
              className="w-8 h-8 rounded-full object-cover shrink-0 mt-1"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-[#2D9CDB] flex items-center justify-center text-white text-xs font-bold shrink-0 mt-1">
              {avatarLetter}
            </div>
          )}

          {/* Input */}
          <div className="flex-1 min-w-0">
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => setContent(e.target.value.slice(0, 500))}
              placeholder="Escribe un comentario..."
              rows={2}
              className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2D9CDB] focus:border-transparent resize-none transition-all"
            />
            {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
            <div className="flex items-center justify-between mt-1.5">
              <span className={`text-[10px] ${remaining < 50 ? "text-orange-400" : "text-slate-400"}`}>
                {remaining} caracteres
              </span>
              <button
                type="submit"
                disabled={!content.trim() || submitting}
                className="px-4 py-1.5 bg-[#2D9CDB] hover:bg-[#1a8cd8] disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5"
              >
                {submitting ? (
                  <>
                    <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Publicando…
                  </>
                ) : (
                  "Comentar"
                )}
              </button>
            </div>
          </div>
        </form>
      ) : (
        <div className="pt-4 border-t border-slate-100 dark:border-slate-700 text-center">
          <p className="text-sm text-slate-400 dark:text-slate-500 mb-3">
            Inicia sesión para comentar o reaccionar.
          </p>
          <Link
            href={`/login?next=/reporte/${reportId}#comentarios`}
            className="inline-block px-5 py-2 bg-[#2D9CDB] hover:bg-[#1a8cd8] text-white text-sm font-semibold rounded-xl transition-colors"
          >
            Iniciar sesión
          </Link>
        </div>
      )}
    </div>
  );
}
