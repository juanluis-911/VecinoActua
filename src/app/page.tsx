import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import StatusBadge from "@/components/ui/StatusBadge";
import CategoryIcon from "@/components/ui/CategoryIcon";
import type { Database, ReportStatus, ReportCategory } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

type ProfileRow  = Database["public"]["Tables"]["profiles"]["Row"];
type ReportRow   = Database["public"]["Tables"]["reports"]["Row"];
type FeedReport  = ReportRow & {
  author: Pick<ProfileRow, "id" | "full_name" | "avatar_url" | "is_verified"> | null;
};

// ─── helpers ──────────────────────────────────────────────────────────────────

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

// ─── sub-components ───────────────────────────────────────────────────────────

function ReportCard({ report }: { report: FeedReport }) {
  const letter = report.author?.full_name?.[0]?.toUpperCase() ?? "?";
  return (
    <Link href={`/reporte/${report.id}`} className="block group">
      <article className="flex gap-4 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-800 hover:border-[#2D9CDB]/30 hover:shadow-md transition-all">
        {/* Thumbnail */}
        {report.image_url ? (
          <div className="w-16 h-16 shrink-0 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-700">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={report.image_url}
              alt={report.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          </div>
        ) : (
          <div className="shrink-0">
            <CategoryIcon category={report.category as ReportCategory} className="scale-90" />
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2 mb-1">
            <h3 className="font-semibold text-slate-900 dark:text-white text-sm group-hover:text-[#2D9CDB] transition-colors line-clamp-2 leading-snug flex-1">
              {report.title}
            </h3>
            <StatusBadge status={report.status as ReportStatus} />
          </div>

          {report.colonia && (
            <p className="text-xs text-slate-400 mb-2 truncate">📍 {report.colonia}</p>
          )}

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              {report.author?.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={report.author.avatar_url} alt="" className="w-5 h-5 rounded-full object-cover" />
              ) : (
                <div className="w-5 h-5 rounded-full bg-[#2D9CDB] flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                  {letter}
                </div>
              )}
              <span className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[100px]">
                {report.author?.full_name ?? "Ciudadano"}
                {report.author?.is_verified && <span className="ml-0.5 text-[#2D9CDB]">✓</span>}
              </span>
              <span className="text-slate-300 dark:text-slate-600 text-xs">·</span>
              <span className="text-xs text-slate-400 shrink-0">{timeAgo(report.created_at)}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400 shrink-0">
              <span>❤️ {report.likes_count}</span>
              <span>💬 {report.comments_count}</span>
            </div>
          </div>
        </div>
      </article>
    </Link>
  );
}

function CitySection({
  icon,
  title,
  subtitle,
  reports,
  feedHref,
}: {
  icon:     string;
  title:    string;
  subtitle: string;
  reports:  FeedReport[];
  feedHref: string;
}) {
  if (reports.length === 0) return null;
  return (
    <section className="py-12 bg-slate-50 dark:bg-slate-900">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span>{icon}</span> {title}
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</p>
          </div>
          <Link href={feedHref} className="text-sm font-medium text-[#2D9CDB] hover:underline shrink-0">
            Ver todos →
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {reports.slice(0, 4).map((r) => (
            <ReportCard key={r.id} report={r} />
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── page ─────────────────────────────────────────────────────────────────────

const features = [
  { icon: "🗺️", title: "Reporta",   description: "Sube problemas de tu colonia con foto y ubicación exacta.",  color: "bg-orange-50 dark:bg-orange-900/20"  },
  { icon: "❤️", title: "Participa", description: "Sigue, comenta y apoya reportes de tu comunidad.",           color: "bg-red-50 dark:bg-red-900/20"        },
  { icon: "✅", title: "Resuelve",  description: "Ve quién lo está arreglando y cuándo queda listo.",          color: "bg-emerald-50 dark:bg-emerald-900/20" },
];

const categoryIds = ["bache", "lampara", "agua", "basura", "fuga", "otro"] as const;

export default async function HomePage() {
  const supabase = await createClient();

  // ── Fetch global data + auth in parallel ──────────────────────────────────
  const [
    { data: { user } },
    { count: totalReports },
    { count: resolvedCount },
    { data: estadosRaw },
    { data: recentRaw },
  ] = await Promise.all([
    supabase.auth.getUser(),
    supabase.from("reports").select("*", { count: "exact", head: true }),
    supabase.from("reports").select("*", { count: "exact", head: true }).eq("status", "resolved"),
    supabase.rpc("get_estados"),
    supabase
      .from("reports")
      .select("*, author:profiles!reports_author_id_fkey(id, full_name, avatar_url, is_verified)")
      .order("created_at", { ascending: false })
      .limit(6),
  ]);

  const recentReports  = (recentRaw ?? []) as unknown as FeedReport[];
  const totalStates    = (estadosRaw ?? []).length;
  const resolvedPct    = totalReports ? Math.round(((resolvedCount ?? 0) / totalReports) * 100) : 0;

  // ── Personalización (solo si hay sesión) ──────────────────────────────────
  type CityKey = { municipio: string; estado: string };

  let ownCity: CityKey | null = null;
  let ownCityReports: FeedReport[] = [];
  let interactionSections: Array<{
    municipio: string;
    estado:    string;
    reports:   FeedReport[];
  }> = [];

  if (user) {
    // 1. Ciudad propia (ciudad más frecuente en sus propios reportes)
    const { data: userReportCities } = await supabase
      .from("reports")
      .select("municipio, estado")
      .eq("author_id", user.id)
      .not("municipio", "is", null)
      .limit(100);

    const ownCityCount: Record<string, { municipio: string; estado: string; n: number }> = {};
    for (const r of userReportCities ?? []) {
      if (!r.municipio || !r.estado) continue;
      const k = `${r.municipio}|${r.estado}`;
      ownCityCount[k] ??= { municipio: r.municipio, estado: r.estado, n: 0 };
      ownCityCount[k].n++;
    }
    const topOwn = Object.values(ownCityCount).sort((a, b) => b.n - a.n)[0] ?? null;

    // 2. Ciudades de interacciones (likes + comentarios recientes)
    const [{ data: likedIds }, { data: commentedIds }] = await Promise.all([
      supabase
        .from("likes")
        .select("report_id")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(40),
      supabase
        .from("comments")
        .select("report_id")
        .eq("author_id", user.id)
        .order("created_at", { ascending: false })
        .limit(40),
    ]);

    const allInteractedIds = [
      ...new Set([
        ...(likedIds ?? []).map((l) => l.report_id),
        ...(commentedIds ?? []).map((c) => c.report_id),
      ]),
    ];

    let interactionCandidates: CityKey[] = [];
    if (allInteractedIds.length > 0) {
      const { data: interactedLocs } = await supabase
        .from("reports")
        .select("municipio, estado")
        .in("id", allInteractedIds)
        .not("municipio", "is", null);

      const intCount: Record<string, { municipio: string; estado: string; n: number }> = {};
      for (const r of interactedLocs ?? []) {
        if (!r.municipio || !r.estado) continue;
        // Excluir ciudad propia (ya la mostramos arriba)
        if (topOwn && r.municipio === topOwn.municipio && r.estado === topOwn.estado) continue;
        const k = `${r.municipio}|${r.estado}`;
        intCount[k] ??= { municipio: r.municipio, estado: r.estado, n: 0 };
        intCount[k].n++;
      }
      interactionCandidates = Object.values(intCount)
        .sort((a, b) => b.n - a.n)
        .slice(0, 2)
        .map(({ municipio, estado }) => ({ municipio, estado }));
    }

    // 3. Fetch reports for all cities in parallel
    const citiesToFetch: Array<{ city: CityKey; isOwn: boolean }> = [
      ...(topOwn ? [{ city: topOwn, isOwn: true }] : []),
      ...interactionCandidates.map((c) => ({ city: c, isOwn: false })),
    ];

    if (citiesToFetch.length > 0) {
      const cityResults = await Promise.all(
        citiesToFetch.map(({ city }) =>
          supabase
            .from("reports")
            .select("*, author:profiles!reports_author_id_fkey(id, full_name, avatar_url, is_verified)")
            .eq("municipio", city.municipio)
            .eq("estado", city.estado)
            .order("created_at", { ascending: false })
            .limit(4)
        )
      );

      for (let i = 0; i < citiesToFetch.length; i++) {
        const { city, isOwn } = citiesToFetch[i];
        const reports = (cityResults[i].data ?? []) as unknown as FeedReport[];
        if (reports.length === 0) continue;

        if (isOwn) {
          ownCity = city;
          ownCityReports = reports;
        } else {
          interactionSections.push({ municipio: city.municipio, estado: city.estado, reports });
        }
      }
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <main className="flex-1">

      {/* ── Hero ── */}
      <section className="relative bg-gradient-to-br from-[#1a5fa8] via-[#2D9CDB] to-[#1a8cd8] text-white overflow-hidden">
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <div className="absolute top-10 left-10 w-72 h-72 bg-white rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-20 w-96 h-96 bg-[#FF5A5F] rounded-full blur-3xl" />
        </div>
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20 md:py-28 text-center">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-4 leading-tight">
            Tu voz para mejorar<br />
            <span className="text-yellow-300">la ciudad</span>
          </h1>
          <p className="text-lg md:text-xl text-blue-100 mb-10 max-w-xl mx-auto">
            Reporta problemas y sigue cómo se resuelven. La presión pública funciona.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/reporte/nuevo"
              className="px-8 py-4 bg-[#FF5A5F] hover:bg-[#e04e53] text-white font-bold rounded-2xl shadow-lg transition-all hover:shadow-xl hover:-translate-y-0.5 text-lg"
            >
              ¡Haz tu reporte! 📸
            </Link>
            <Link
              href="/feed"
              className="px-8 py-4 bg-white/15 hover:bg-white/25 text-white font-semibold rounded-2xl backdrop-blur-sm border border-white/20 transition-all text-lg"
            >
              Ver reportes
            </Link>
          </div>

          {/* Stats bar — datos reales */}
          <div className="mt-16 grid grid-cols-3 gap-4 max-w-lg mx-auto">
            {[
              { value: (totalReports ?? 0).toLocaleString("es-MX"), label: "Reportes totales" },
              { value: `${resolvedPct}%`,                           label: "Resueltos"        },
              { value: totalStates > 0 ? totalStates.toString() : "—", label: "Estados activos" },
            ].map(({ value, label }) => (
              <div key={label} className="text-center">
                <div className="text-2xl md:text-3xl font-bold">{value}</div>
                <div className="text-xs md:text-sm text-blue-200 mt-0.5">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="bg-white dark:bg-slate-950 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {features.map(({ icon, title, description, color }) => (
              <div
                key={title}
                className="flex items-start gap-4 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 hover:shadow-md transition-shadow"
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0 ${color}`}>
                  {icon}
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white mb-1">{title}</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Categorías ── */}
      <section className="bg-slate-50 dark:bg-slate-900 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-8 text-center">
            ¿Qué problema quieres reportar?
          </h2>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-4 max-w-2xl mx-auto">
            {categoryIds.map((cat) => (
              <Link key={cat} href={`/reporte/nuevo?categoria=${cat}`}>
                <CategoryIcon category={cat} showLabel className="hover:scale-105 transition-transform cursor-pointer" />
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── Sección personalizada: ciudad propia ── */}
      {ownCity && ownCityReports.length > 0 && (
        <CitySection
          icon="🏘️"
          title={`En ${ownCity.municipio}`}
          subtitle={`Reportes recientes de tu ciudad · ${ownCity.estado}`}
          reports={ownCityReports}
          feedHref={`/feed`}
        />
      )}

      {/* ── Secciones personalizadas: ciudades de interacciones ── */}
      {interactionSections.map((section) => (
        <CitySection
          key={`${section.municipio}|${section.estado}`}
          icon="📍"
          title={`También en ${section.municipio}`}
          subtitle={`Donde has participado · ${section.estado}`}
          reports={section.reports}
          feedHref={`/feed`}
        />
      ))}

      {/* ── Últimos reportes (global) ── */}
      <section className="bg-white dark:bg-slate-950 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                Últimos reportes
              </h2>
              {(ownCity || interactionSections.length > 0) && (
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                  De toda la plataforma
                </p>
              )}
            </div>
            <Link href="/feed" className="text-sm font-medium text-[#2D9CDB] hover:underline">
              Ver todos →
            </Link>
          </div>

          {recentReports.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-4xl mb-3">📭</div>
              <p className="text-slate-500 dark:text-slate-400">
                Todavía no hay reportes. ¡Sé el primero!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {recentReports.map((r) => (
                <ReportCard key={r.id} report={r} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── CTA final ── */}
      <section className="bg-gradient-to-r from-[#FF5A5F] to-[#e04e53] py-16 text-white text-center">
        <div className="mx-auto max-w-2xl px-4">
          {user ? (
            <>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">¡Sigue reportando!</h2>
              <p className="text-red-100 mb-8 text-lg">
                Cada reporte cuenta. Tu ciudad mejora gracias a ciudadanos como tú.
              </p>
              <Link
                href="/reporte/nuevo"
                className="inline-block px-8 py-4 bg-white text-[#FF5A5F] font-bold rounded-2xl hover:bg-red-50 transition-colors shadow-lg text-lg"
              >
                Hacer un reporte 📸
              </Link>
            </>
          ) : (
            <>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">¡Haz escuchar tu colonia!</h2>
              <p className="text-red-100 mb-8 text-lg">
                Únete a miles de ciudadanos que están cambiando su ciudad.
              </p>
              <Link
                href="/registro"
                className="inline-block px-8 py-4 bg-white text-[#FF5A5F] font-bold rounded-2xl hover:bg-red-50 transition-colors shadow-lg text-lg"
              >
                Crear cuenta gratis
              </Link>
            </>
          )}
        </div>
      </section>

    </main>
  );
}
