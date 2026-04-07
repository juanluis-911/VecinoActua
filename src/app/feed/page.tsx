import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { ReportWithAuthor } from "@/lib/supabase/types";
import FeedClient from "./FeedClient";

export const dynamic = "force-dynamic";

export default async function FeedPage() {
  const supabase = await createClient();

  // Reports + current user in parallel
  const [{ data: reports, error }, { data: { user } }] = await Promise.all([
    supabase
      .from("reports")
      .select("*, author:profiles!reports_author_id_fkey(id, full_name, avatar_url, role, is_verified)")
      .order("created_at", { ascending: false })
      .limit(50),
    supabase.auth.getUser(),
  ]);

  // IDs de reportes que el usuario ya dio like
  let likedIds: string[] = [];
  if (user) {
    const { data: likes } = await supabase
      .from("likes")
      .select("report_id")
      .eq("user_id", user.id);
    likedIds = (likes ?? []).map((l) => l.report_id);
  }

  const feed = (reports ?? []) as unknown as ReportWithAuthor[];

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

        {feed.length === 0 && !error ? (
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
        ) : (
          <FeedClient
            reports={feed}
            likedIds={likedIds}
            userId={user?.id ?? null}
          />
        )}
      </div>
    </main>
  );
}
