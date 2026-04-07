"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

interface Props {
  reportId:      string;
  userId:        string | null;
  userAvatarUrl: string | null;
  userName:      string | null;
}

export default function ComentariosClient({
  reportId,
  userId,
  userAvatarUrl,
  userName,
}: Props) {
  const [content,    setContent]    = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error,      setError]      = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const router      = useRouter();

  if (!userId) {
    return (
      <div className="mt-2 pt-4 border-t border-slate-100 dark:border-slate-700 text-center">
        <p className="text-sm text-slate-400 dark:text-slate-500 mb-3">
          Inicia sesión para dejar un comentario.
        </p>
        <Link
          href={`/login?next=/reporte/${reportId}`}
          className="inline-block px-5 py-2 bg-[#2D9CDB] hover:bg-[#1a8cd8] text-white text-sm font-semibold rounded-xl transition-colors"
        >
          Iniciar sesión
        </Link>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = content.trim();
    if (!trimmed || submitting) return;

    setSubmitting(true);
    setError(null);

    const supabase = createClient();
    const { error: insertError } = await supabase.from("comments").insert({
      report_id: reportId,
      author_id: userId!,
      content:   trimmed,
    });

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
    <div className="mt-2 pt-4 border-t border-slate-100 dark:border-slate-700">
      <form onSubmit={handleSubmit} className="flex gap-3">
        {/* Avatar */}
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

        {/* Input area */}
        <div className="flex-1 min-w-0">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value.slice(0, 500))}
            placeholder="Escribe un comentario..."
            rows={2}
            className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2D9CDB] focus:border-transparent resize-none transition-all"
          />

          {error && (
            <p className="text-xs text-red-500 mt-1">{error}</p>
          )}

          <div className="flex items-center justify-between mt-1.5">
            <span className={`text-[10px] ${remaining < 50 ? "text-orange-400" : "text-slate-400"}`}>
              {remaining} caracteres restantes
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
    </div>
  );
}
