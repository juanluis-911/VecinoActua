import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import RankingClient from "./RankingClient";
import type { Database } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];

export default async function RankingPage() {
  const supabase = await createClient();

  // Top reporters (all, client will filter)
  const { data: topRaw } = await supabase
    .from("profiles")
    .select("*")
    .gt("reports_count", 0)
    .order("reports_count", { ascending: false })
    .limit(100);

  const leaders = (topRaw ?? []) as Profile[];

  // Global stats
  const [{ count: totalReports }, { count: resolvedCount }, { count: totalUsers }] =
    await Promise.all([
      supabase.from("reports").select("*", { count: "exact", head: true }),
      supabase.from("reports").select("*", { count: "exact", head: true }).eq("status", "resolved"),
      supabase.from("profiles").select("*", { count: "exact", head: true }),
    ]);

  // Reports per estado (from reports table)
  const { data: estadoStatsRaw } = await supabase
    .from("reports")
    .select("estado")
    .not("estado", "is", null);

  const estadoMap: Record<string, number> = {};
  for (const r of estadoStatsRaw ?? []) {
    if (r.estado) estadoMap[r.estado] = (estadoMap[r.estado] ?? 0) + 1;
  }
  const estadoStats = Object.entries(estadoMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  // Distinct states via RPC (avoids the 1,000-row default limit)
  const { data: estadosRaw } = await supabase.rpc("get_estados");
  const estados: string[] = (estadosRaw ?? []).map((r) => r.estado);

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
          <div className="mt-8 grid grid-cols-3 gap-4 max-w-sm mx-auto">
            {[
              { value: (totalReports ?? 0).toLocaleString(),  label: "Reportes totales" },
              { value: (resolvedCount ?? 0).toLocaleString(), label: "Resueltos" },
              { value: (totalUsers ?? 0).toLocaleString(),    label: "Participantes" },
            ].map(({ value, label }) => (
              <div key={label} className="text-center">
                <div className="text-2xl font-bold">{value}</div>
                <div className="text-xs text-blue-200 mt-0.5">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 sm:px-6 py-8 space-y-8">

        {/* ── Heatmap por estado ── */}
        {estadoStats.length > 0 && (
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white mb-3">
              🗺️ Estados más activos
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {estadoStats.map(([estado, count], i) => {
                const max = estadoStats[0][1];
                const pct = Math.round((count / max) * 100);
                return (
                  <div key={estado} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 p-3 flex items-center gap-3">
                    <span className="text-xs font-bold text-slate-400 w-5 text-right">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-slate-800 dark:text-white truncate">{estado}</span>
                        <span className="text-xs font-bold text-[#2D9CDB] ml-2">{count}</span>
                      </div>
                      <div className="h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div className="h-full bg-[#2D9CDB] rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Leaderboard (client) ── */}
        <RankingClient leaders={leaders} estados={estados} />

        {/* CTA */}
        <div className="p-6 bg-gradient-to-r from-[#FF5A5F] to-[#e04e53] rounded-2xl text-white text-center">
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
