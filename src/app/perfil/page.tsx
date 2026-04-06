import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import StatusBadge from "@/components/ui/StatusBadge";
import CategoryIcon from "@/components/ui/CategoryIcon";
import type { Database, ReportWithAuthor, ReportCategory, ReportStatus } from "@/lib/supabase/types";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];

export const dynamic = "force-dynamic";

const roleLabels: Record<string, string> = {
  citizen:    "Ciudadano",
  candidate:  "Candidato",
  official:   "Funcionario",
  influencer: "Influencer",
};

export default async function PerfilPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/perfil");

  const { data: profileRaw } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  const profile = profileRaw as Profile | null;

  const { data: reports } = await supabase
    .from("reports")
    .select("*, author:profiles!reports_author_id_fkey(id, full_name, avatar_url, role, is_verified)")
    .eq("author_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20);

  const myReports = (reports ?? []) as unknown as ReportWithAuthor[];

  const avatarLetter = profile?.full_name?.[0]?.toUpperCase()
    ?? user.email?.[0]?.toUpperCase()
    ?? "?";

  const openCount = myReports.filter((r) => r.status === "open").length;
  const inProgressCount = myReports.filter((r) => r.status === "in_progress").length;
  const resolvedCount = myReports.filter((r) => r.status === "resolved").length;

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
      {/* Profile header */}
      <div className="bg-gradient-to-br from-[#1a5fa8] via-[#2D9CDB] to-[#1a8cd8] pt-10 pb-20 px-4">
        <div className="mx-auto max-w-3xl text-center text-white">
          {profile?.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profile.avatar_url}
              alt={profile.full_name ?? ""}
              className="w-24 h-24 rounded-full object-cover mx-auto border-4 border-white/30 shadow-xl mb-4"
            />
          ) : (
            <div className="w-24 h-24 rounded-full bg-white/20 border-4 border-white/30 flex items-center justify-center text-4xl font-bold mx-auto mb-4 shadow-xl">
              {avatarLetter}
            </div>
          )}
          <h1 className="text-2xl font-bold">
            {profile?.full_name ?? "Ciudadano"}
            {profile?.is_verified && (
              <span className="ml-2 text-yellow-300 text-xl">✓</span>
            )}
          </h1>
          <p className="text-blue-200 text-sm mt-1">
            {profile ? roleLabels[profile.role] ?? "Ciudadano" : "Ciudadano"}
            {profile?.colonia ? ` · ${profile.colonia}` : ""}
          </p>
          {profile?.bio && (
            <p className="text-blue-100 text-sm mt-2 max-w-sm mx-auto">{profile.bio}</p>
          )}
        </div>
      </div>

      {/* Stats card — overlaps header */}
      <div className="mx-auto max-w-3xl px-4 sm:px-6 -mt-10">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-100 dark:border-slate-700 p-5">
          <div className="grid grid-cols-4 gap-4 text-center">
            {[
              { value: myReports.length, label: "Total", color: "text-slate-900 dark:text-white" },
              { value: openCount,        label: "Abiertos",     color: "text-orange-500" },
              { value: inProgressCount,  label: "En proceso",   color: "text-blue-500" },
              { value: resolvedCount,    label: "Resueltos",    color: "text-emerald-500" },
            ].map(({ value, label, color }) => (
              <div key={label}>
                <div className={`text-2xl font-bold ${color}`}>{value}</div>
                <div className="text-xs text-slate-400 mt-0.5">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Reports */}
      <div className="mx-auto max-w-3xl px-4 sm:px-6 py-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Mis reportes</h2>
          <Link
            href="/reporte/nuevo"
            className="px-4 py-2 bg-[#FF5A5F] hover:bg-[#e04e53] text-white text-sm font-semibold rounded-xl transition-colors"
          >
            + Nuevo reporte
          </Link>
        </div>

        {myReports.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-4">📝</div>
            <p className="text-slate-500 dark:text-slate-400 mb-4">
              Todavía no has hecho ningún reporte.
            </p>
            <Link
              href="/reporte/nuevo"
              className="inline-block px-6 py-3 bg-[#FF5A5F] text-white font-semibold rounded-xl hover:bg-[#e04e53] transition-colors"
            >
              Crear mi primer reporte
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {myReports.map((report) => (
              <article
                key={report.id}
                className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 overflow-hidden hover:shadow-sm transition-shadow group"
              >
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
                      <h3 className="font-semibold text-slate-900 dark:text-white text-sm group-hover:text-[#2D9CDB] transition-colors line-clamp-2">
                        {report.title}
                      </h3>
                      <StatusBadge status={report.status as ReportStatus} />
                    </div>

                    {report.colonia && (
                      <p className="text-xs text-slate-400 mb-1">📍 {report.colonia}</p>
                    )}

                    {report.description && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 mb-2">
                        {report.description}
                      </p>
                    )}

                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-400">{timeAgo(report.created_at)}</span>
                      <div className="flex items-center gap-2 text-xs text-slate-400">
                        <span>❤️ {report.likes_count}</span>
                        <span>💬 {report.comments_count}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
