import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import StatusBadge from "@/components/ui/StatusBadge";
import CategoryIcon from "@/components/ui/CategoryIcon";
import type { ReportWithAuthor, ReportCategory, ReportStatus } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

export default async function MapaPage() {
  const supabase = await createClient();

  const { data: reports } = await supabase
    .from("reports")
    .select("*, author:profiles!reports_author_id_fkey(id, full_name, avatar_url, role, is_verified)")
    .not("latitude", "is", null)
    .not("longitude", "is", null)
    .order("created_at", { ascending: false })
    .limit(100);

  const { data: allReports } = await supabase
    .from("reports")
    .select("*, author:profiles!reports_author_id_fkey(id, full_name, avatar_url, role, is_verified)")
    .is("latitude", null)
    .order("created_at", { ascending: false })
    .limit(30);

  const geoReports = (reports ?? []) as unknown as ReportWithAuthor[];
  const noGeoReports = (allReports ?? []) as unknown as ReportWithAuthor[];

  // Build OSM markers string for iframe — only first 10 to avoid long URLs
  const markersForUrl = geoReports.slice(0, 10)
    .filter((r) => r.latitude && r.longitude)
    .map((r) => `${r.latitude},${r.longitude}`)
    .join("|");

  // Default center: Mexico City
  const defaultLat = geoReports[0]?.latitude ?? 19.4326;
  const defaultLon = geoReports[0]?.longitude ?? -99.1332;
  const mapSrc = `https://www.openstreetmap.org/export/embed.html?bbox=${defaultLon - 0.05}%2C${defaultLat - 0.05}%2C${defaultLon + 0.05}%2C${defaultLat + 0.05}&layer=mapnik${markersForUrl ? `&marker=${geoReports[0]?.latitude}%2C${geoReports[0]?.longitude}` : ""}`;

  function timeAgo(date: string) {
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `hace ${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `hace ${hrs}h`;
    return `hace ${Math.floor(hrs / 24)}d`;
  }

  const allFeed = [...geoReports, ...noGeoReports] as ReportWithAuthor[];

  return (
    <main className="flex-1 bg-slate-50 dark:bg-slate-900">
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700 px-4 sm:px-6 py-4">
        <div className="mx-auto max-w-7xl flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Mapa de reportes</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {geoReports.length > 0
                ? `${geoReports.length} reporte${geoReports.length !== 1 ? "s" : ""} con ubicación`
                : "Reportes de tu ciudad"}
            </p>
          </div>
          <Link
            href="/reporte/nuevo"
            className="px-4 py-2 bg-[#FF5A5F] hover:bg-[#e04e53] text-white text-sm font-semibold rounded-xl transition-colors"
          >
            + Nuevo reporte
          </Link>
        </div>
      </div>

      {/* Map iframe */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-6">
        <div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-sm">
          <iframe
            title="Mapa de reportes"
            src={mapSrc}
            width="100%"
            height="400"
            className="w-full"
            style={{ border: 0 }}
            loading="lazy"
          />
        </div>
        <p className="text-xs text-slate-400 mt-2 text-center">
          Mapa © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer" className="hover:underline">OpenStreetMap</a> contributors
        </p>
      </div>

      {/* Reports list */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 pb-12">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">
          {allFeed.length > 0 ? `Todos los reportes (${allFeed.length})` : "Sin reportes aún"}
        </h2>

        {allFeed.length === 0 && (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">🗺️</div>
            <p className="text-slate-500 dark:text-slate-400 mb-4">
              Todavía no hay reportes en el mapa. ¡Sé el primero!
            </p>
            <Link
              href="/reporte/nuevo"
              className="inline-block px-6 py-3 bg-[#FF5A5F] text-white font-semibold rounded-xl hover:bg-[#e04e53] transition-colors"
            >
              Crear primer reporte
            </Link>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {allFeed.map((report) => (
            <div
              key={report.id}
              className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 overflow-hidden hover:shadow-md transition-shadow group"
            >
              {report.image_url && (
                <div className="w-full h-36 bg-slate-100 dark:bg-slate-700 overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={report.image_url}
                    alt={report.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
              )}
              <div className="p-4">
                <div className="flex items-start gap-3">
                  {!report.image_url && (
                    <div className="shrink-0">
                      <CategoryIcon category={report.category as ReportCategory} />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className="font-semibold text-slate-900 dark:text-white text-sm group-hover:text-[#2D9CDB] transition-colors line-clamp-2">
                        {report.title}
                      </h3>
                    </div>
                    <StatusBadge status={report.status as ReportStatus} />
                    {(report.colonia || report.address) && (
                      <p className="text-xs text-slate-400 mt-1">
                        📍 {[report.colonia, report.address].filter(Boolean).join(" — ")}
                      </p>
                    )}
                    {report.latitude && report.longitude && (
                      <p className="text-xs text-slate-300 dark:text-slate-600 mt-0.5">
                        🌐 {report.latitude.toFixed(4)}, {report.longitude.toFixed(4)}
                      </p>
                    )}
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-slate-400">{timeAgo(report.created_at)}</span>
                      <div className="flex items-center gap-2 text-xs text-slate-400">
                        <span>❤️ {report.likes_count}</span>
                        <span>💬 {report.comments_count}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
