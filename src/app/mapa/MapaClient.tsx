"use client";

import { useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import StatusBadge from "@/components/ui/StatusBadge";
import CategoryIcon from "@/components/ui/CategoryIcon";
import type { ReportWithAuthor, ReportCategory, ReportStatus } from "@/lib/supabase/types";

interface Props {
  reports: ReportWithAuthor[];
  estados: string[];
}

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `hace ${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `hace ${hrs}h`;
  return `hace ${Math.floor(hrs / 24)}d`;
}

export default function MapaClient({ reports, estados }: Props) {
  const [estadoFilter,    setEstadoFilter]    = useState<string>("");
  const [municipioFilter, setMunicipioFilter] = useState<string>("");
  const [municipios,      setMunicipios]      = useState<string[]>([]);
  const [muniLoading,     setMuniLoading]     = useState(false);
  const [categoryFilter,  setCategoryFilter]  = useState<string>("");
  const [statusFilter,    setStatusFilter]    = useState<string>("");

  async function handleEstadoChange(estado: string) {
    setEstadoFilter(estado);
    setMunicipioFilter("");
    setMunicipios([]);
    if (!estado) return;

    setMuniLoading(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("colonias")
      .select("municipio")
      .eq("estado", estado)
      .order("municipio");
    const unique = Array.from(new Set((data ?? []).map((r: { municipio: string }) => r.municipio)));
    setMunicipios(unique);
    setMuniLoading(false);
  }

  const filtered = useMemo(() => {
    return reports.filter((r) => {
      if (estadoFilter    && r.estado    !== estadoFilter)    return false;
      if (municipioFilter && r.municipio !== municipioFilter) return false;
      if (categoryFilter  && r.category  !== categoryFilter)  return false;
      if (statusFilter    && r.status    !== statusFilter)    return false;
      return true;
    });
  }, [reports, estadoFilter, municipioFilter, categoryFilter, statusFilter]);

  // Map center: first report with coords or Mexico City
  const geoReports = filtered.filter((r) => r.latitude && r.longitude);
  const centerLat  = geoReports[0]?.latitude  ?? 19.4326;
  const centerLon  = geoReports[0]?.longitude ?? -99.1332;
  const mapSrc = `https://www.openstreetmap.org/export/embed.html?bbox=${centerLon - 0.05}%2C${centerLat - 0.05}%2C${centerLon + 0.05}%2C${centerLat + 0.05}&layer=mapnik${geoReports[0] ? `&marker=${centerLat}%2C${centerLon}` : ""}`;

  const activeFilters = [estadoFilter, municipioFilter, categoryFilter, statusFilter].filter(Boolean).length;

  return (
    <div className="flex-1 mx-auto w-full max-w-7xl px-4 sm:px-6 py-6 space-y-6">

      {/* ── Filtros ── */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Filtrar</span>
          {activeFilters > 0 && (
            <button
              onClick={() => { setEstadoFilter(""); setMunicipioFilter(""); setCategoryFilter(""); setStatusFilter(""); setMunicipios([]); }}
              className="text-xs text-[#2D9CDB] hover:underline"
            >
              Limpiar ({activeFilters})
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* Estado */}
          <div>
            <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Estado</label>
            <select
              value={estadoFilter}
              onChange={(e) => handleEstadoChange(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#2D9CDB]"
            >
              <option value="">Todos</option>
              {estados.map((e) => <option key={e} value={e}>{e}</option>)}
            </select>
          </div>

          {/* Municipio */}
          <div>
            <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Municipio</label>
            <select
              value={municipioFilter}
              onChange={(e) => setMunicipioFilter(e.target.value)}
              disabled={!estadoFilter || muniLoading}
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#2D9CDB] disabled:opacity-50"
            >
              <option value="">Todos</option>
              {municipios.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>

          {/* Categoría */}
          <div>
            <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Categoría</label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#2D9CDB]"
            >
              <option value="">Todas</option>
              <option value="bache">🕳️ Bache</option>
              <option value="lampara">💡 Lámpara</option>
              <option value="agua">💧 Agua</option>
              <option value="basura">🗑️ Basura</option>
              <option value="fuga">⚠️ Fuga</option>
              <option value="otro">📋 Otro</option>
            </select>
          </div>

          {/* Estado del reporte */}
          <div>
            <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Estado</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#2D9CDB]"
            >
              <option value="">Todos</option>
              <option value="open">Abierto</option>
              <option value="in_progress">En proceso</option>
              <option value="resolved">Resuelto</option>
            </select>
          </div>
        </div>
      </div>

      {/* ── Mapa ── */}
      <div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-sm">
        <iframe
          title="Mapa de reportes"
          src={mapSrc}
          width="100%"
          height="380"
          className="w-full"
          style={{ border: 0 }}
          loading="lazy"
        />
      </div>
      <p className="text-xs text-slate-400 -mt-4 text-center">
        Mapa © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer" className="hover:underline">OpenStreetMap</a> contributors
      </p>

      {/* ── Resultados ── */}
      <div>
        <h2 className="text-base font-bold text-slate-900 dark:text-white mb-3">
          {filtered.length} reporte{filtered.length !== 1 ? "s" : ""}
          {estadoFilter    ? ` en ${estadoFilter}`     : ""}
          {municipioFilter ? `, ${municipioFilter}`    : ""}
        </h2>

        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-4xl mb-3">🔍</div>
            <p className="text-slate-500 dark:text-slate-400 text-sm">
              No hay reportes con esos filtros.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((report) => (
              <article
                key={report.id}
                className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 overflow-hidden hover:shadow-md transition-shadow group"
              >
                {report.image_url && (
                  <div className="w-full h-36 bg-slate-100 dark:bg-slate-700 overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={report.image_url} alt={report.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
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
                      <div className="flex items-start gap-2 mb-1 flex-wrap">
                        <h3 className="font-semibold text-slate-900 dark:text-white text-sm group-hover:text-[#2D9CDB] transition-colors line-clamp-2 flex-1">
                          {report.title}
                        </h3>
                        <StatusBadge status={report.status as ReportStatus} />
                      </div>
                      {(report.colonia || report.estado) && (
                        <p className="text-xs text-slate-400 mt-0.5">
                          📍 {[report.colonia, report.municipio, report.estado].filter(Boolean).join(", ")}
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
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
