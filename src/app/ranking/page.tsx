import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];

const roleLabels: Record<string, { label: string; color: string }> = {
  citizen:    { label: "Ciudadano",   color: "text-slate-500 dark:text-slate-400" },
  candidate:  { label: "Candidato",   color: "text-purple-500" },
  official:   { label: "Funcionario", color: "text-blue-500" },
  influencer: { label: "Influencer",  color: "text-pink-500" },
};

const medalEmojis = ["🥇", "🥈", "🥉"];

export default async function RankingPage() {
  const supabase = await createClient();

  const { data: topReporters } = await supabase
    .from("profiles")
    .select("*")
    .order("reports_count", { ascending: false })
    .limit(20);

  const leaders = (topReporters ?? []) as Profile[];

  // Stats
  const { count: totalReports } = await supabase
    .from("reports")
    .select("*", { count: "exact", head: true });

  const { count: resolvedCount } = await supabase
    .from("reports")
    .select("*", { count: "exact", head: true })
    .eq("status", "resolved");

  const { count: totalUsers } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true });

  return (
    <main className="flex-1 bg-slate-50 dark:bg-slate-900">
      {/* Hero */}
      <div className="bg-gradient-to-br from-[#1a5fa8] via-[#2D9CDB] to-[#1a8cd8] text-white py-12 px-4">
        <div className="mx-auto max-w-3xl text-center">
          <div className="text-5xl mb-3">🏆</div>
          <h1 className="text-3xl font-bold mb-2">Ranking ciudadano</h1>
          <p className="text-blue-100 text-sm max-w-md mx-auto">
            Los vecinos más activos reportando problemas y mejorando la ciudad.
          </p>

          {/* Global stats */}
          <div className="mt-8 grid grid-cols-3 gap-4 max-w-sm mx-auto">
            {[
              { value: totalReports ?? 0, label: "Reportes totales" },
              { value: resolvedCount ?? 0, label: "Resueltos" },
              { value: totalUsers ?? 0,   label: "Participantes" },
            ].map(({ value, label }) => (
              <div key={label} className="text-center">
                <div className="text-2xl font-bold">{value.toLocaleString()}</div>
                <div className="text-xs text-blue-200 mt-0.5">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Leaderboard */}
      <div className="mx-auto max-w-2xl px-4 sm:px-6 py-8">
        {leaders.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">📭</div>
            <p className="text-slate-500 dark:text-slate-400 mb-4">
              Todavía no hay reportes. ¡Sé el primero en el ranking!
            </p>
            <Link
              href="/reporte/nuevo"
              className="inline-block px-6 py-3 bg-[#FF5A5F] text-white font-semibold rounded-xl hover:bg-[#e04e53] transition-colors"
            >
              Crear primer reporte
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {leaders.map((profile, index) => {
              const position = index + 1;
              const roleInfo = roleLabels[profile.role] ?? roleLabels.citizen;
              const avatarLetter = profile.full_name?.[0]?.toUpperCase() ?? "?";

              return (
                <div
                  key={profile.id}
                  className={`flex items-center gap-4 p-4 rounded-2xl border transition-shadow hover:shadow-sm ${
                    position <= 3
                      ? "bg-white dark:bg-slate-800 border-yellow-200 dark:border-yellow-700/40 shadow-sm"
                      : "bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700"
                  }`}
                >
                  {/* Position */}
                  <div className="w-10 text-center shrink-0">
                    {position <= 3 ? (
                      <span className="text-2xl">{medalEmojis[position - 1]}</span>
                    ) : (
                      <span className="text-lg font-bold text-slate-400 dark:text-slate-500">
                        {position}
                      </span>
                    )}
                  </div>

                  {/* Avatar */}
                  {profile.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={profile.avatar_url}
                      alt={profile.full_name ?? ""}
                      className="w-12 h-12 rounded-full object-cover shrink-0"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-[#2D9CDB] flex items-center justify-center text-white text-lg font-bold shrink-0">
                      {avatarLetter}
                    </div>
                  )}

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-slate-900 dark:text-white truncate">
                        {profile.full_name ?? "Ciudadano anónimo"}
                      </span>
                      {profile.is_verified && (
                        <span className="text-[#2D9CDB] text-sm shrink-0">✓</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`text-xs font-medium ${roleInfo.color}`}>
                        {roleInfo.label}
                      </span>
                      {profile.colonia && (
                        <>
                          <span className="text-slate-300 dark:text-slate-600">·</span>
                          <span className="text-xs text-slate-400 truncate">{profile.colonia}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Score */}
                  <div className="text-right shrink-0">
                    <div className="text-xl font-bold text-slate-900 dark:text-white">
                      {profile.reports_count}
                    </div>
                    <div className="text-xs text-slate-400">
                      {profile.reports_count === 1 ? "reporte" : "reportes"}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* CTA */}
        <div className="mt-10 p-6 bg-gradient-to-r from-[#FF5A5F] to-[#e04e53] rounded-2xl text-white text-center">
          <h3 className="font-bold text-lg mb-1">¡Sube en el ranking!</h3>
          <p className="text-red-100 text-sm mb-4">
            Cada reporte que publicas suma puntos y ayuda a mejorar tu ciudad.
          </p>
          <Link
            href="/reporte/nuevo"
            className="inline-block px-6 py-3 bg-white text-[#FF5A5F] font-bold rounded-xl hover:bg-red-50 transition-colors text-sm"
          >
            Hacer un reporte
          </Link>
        </div>
      </div>
    </main>
  );
}
