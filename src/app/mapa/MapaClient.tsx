"use client";

import { useState, useMemo, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import StatusBadge from "@/components/ui/StatusBadge";
import CategoryIcon from "@/components/ui/CategoryIcon";
import type { ReportWithAuthor, ReportCategory, ReportStatus } from "@/lib/supabase/types";

interface Props {
  reports: ReportWithAuthor[];
  estados: string[];
}

/** Haversine distance in km between two lat/lon points */
function haversine(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
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
  const [estadoFilter,    setEstadoFilter]    = useState("");
  const [municipioFilter, setMunicipioFilter] = useState("");
  const [municipios,      setMunicipios]      = useState<string[]>([]);
  const [muniLoading,     setMuniLoading]     = useState(false);
  const [categoryFilter,  setCategoryFilter]  = useState("");
  const [statusFilter,    setStatusFilter]    = useState("");

  // Geolocation
  const [userPos,     setUserPos]     = useState<{ lat: number; lon: number } | null>(null);
  const [geoLoading,  setGeoLoading]  = useState(false);
  const [geoError,    setGeoError]    = useState<string | null>(null);
  const [nearbyKm,    setNearbyKm]    = useState(10);
  const [nearbyOnly,  setNearbyOnly]  = useState(false);

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setGeoError("Tu navegador no soporta geolocalización.");
      return;
    }
    setGeoLoading(true);
    setGeoError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserPos({ lat: pos.coords.latitude, lon: pos.coords.longitude });
        setNearbyOnly(true);
        setGeoLoading(false);
      },
      () => {
        setGeoError("No se pudo obtener tu ubicación. Verifica los permisos.");
        setGeoLoading(false);
      },
      { timeout: 10000, maximumAge: 60000 }
    );
  }, []);

  async function handleEstadoChange(estado: string) {
    setEstadoFilter(estado);
    setMunicipioFilter("");
    setMunicipios([]);
    if (!estado) return;
    setMuniLoading(true);
    const supabase = createClient();
    const { data } = await supabase.rpc("get_municipios", { p_estado: estado });
    setMunicipios((data ?? []).map((r: { municipio: string }) => r.municipio));
    setMuniLoading(false);
  }

  // Reports enriched with distance
  const enriched = useMemo(() => {
    return reports.map((r) => ({
      ...r,
      distKm:
        userPos && r.latitude && r.longitude
          ? haversine(userPos.lat, userPos.lon, r.latitude, r.longitude)
          : null,
    }));
  }, [reports, userPos]);

  const filtered = useMemo(() => {
    return enriched
      .filter((r) => {
        if (estadoFilter    && r.estado    !== estadoFilter)    return false;
        if (municipioFilter && r.municipio !== municipioFilter) return false;
        if (categoryFilter  && r.category  !== categoryFilter)  return false;
        if (statusFilter    && r.status    !== statusFilter)    return false;
        if (nearbyOnly && userPos) {
          if (r.distKm === null) return false;
          if (r.distKm > nearbyKm) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (nearbyOnly && a.distKm !== null && b.distKm !== null) {
          return a.distKm - b.distKm;
        }
        return 0;
      });
  }, [enriched, estadoFilter, municipioFilter, categoryFilter, statusFilter, nearbyOnly, userPos, nearbyKm]);

  // Map center: user position > first filtered report with coords > Mexico City
  const mapLat = userPos?.lat ?? filtered.find((r) => r.latitude)?.latitude  ?? 19.4326;
  const mapLon = userPos?.lon ?? filtered.find((r) => r.longitude)?.longitude ?? -99.1332;
  const mapSrc = `https://www.openstreetmap.org/export/embed.html?bbox=${mapLon - 0.07}%2C${mapLat - 0.07}%2C${mapLon + 0.07}%2C${mapLat + 0.07}&layer=mapnik${userPos ? `&marker=${mapLat}%2C${mapLon}` : ""}`;

  const activeFilters = [estadoFilter, municipioFilter, categoryFilter, statusFilter].filter(Boolean).length + (nearbyOnly ? 1 : 0);

  return (
    <div className="flex-1 mx-auto w-full max-w-7xl px-4 sm:px-6 py-6 space-y-5">

      {/* ── Barra de ubicación ── */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex-1">
            {userPos ? (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">
                  📍 Ubicación obtenida
                </span>
                <span className="text-xs text-slate-400">
                  {userPos.lat.toFixed(4)}, {userPos.lon.toFixed(4)}
                </span>
                <button
                  onClick={() => { setNearbyOnly(false); setUserPos(null); }}
                  className="text-xs text-red-400 hover:text-red-600 transition-colors"
                >
                  ✕ Quitar
                </button>
              </div>
            ) : (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Permite la ubicación para ver reportes cercanos a ti.
              </p>
            )}
            {geoError && <p className="text-xs text-red-500 mt-1">{geoError}</p>}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {userPos && (
              <>
                <label className="flex items-center gap-1.5 text-sm text-slate-700 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={nearbyOnly}
                    onChange={(e) => setNearbyOnly(e.target.checked)}
                    className="rounded"
                  />
                  Solo cercanos
                </label>
                {nearbyOnly && (
                  <select
                    value={nearbyKm}
                    onChange={(e) => setNearbyKm(Number(e.target.value))}
                    className="px-2 py-1 text-sm rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-white focus:outline-none"
                  >
                    <option value={2}>2 km</option>
                    <option value={5}>5 km</option>
                    <option value={10}>10 km</option>
                    <option value={20}>20 km</option>
                    <option value={50}>50 km</option>
                  </select>
                )}
              </>
            )}

            <button
              onClick={requestLocation}
              disabled={geoLoading}
              className="flex items-center gap-2 px-4 py-2 bg-[#2D9CDB] hover:bg-[#2589c5] text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-60"
            >
              {geoLoading ? (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <span>📍</span>
              )}
              {userPos ? "Actualizar ubicación" : "Usar mi ubicación"}
            </button>
          </div>
        </div>
      </div>

      {/* ── Filtros ── */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Filtrar</span>
          {activeFilters > 0 && (
            <button
              onClick={() => { setEstadoFilter(""); setMunicipioFilter(""); setCategoryFilter(""); setStatusFilter(""); setMunicipios([]); setNearbyOnly(false); }}
              className="text-xs text-[#2D9CDB] hover:underline"
            >
              Limpiar ({activeFilters})
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
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
          <div>
            <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Estatus</label>
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
          key={`${mapLat}-${mapLon}`}
          title="Mapa de reportes"
          src={mapSrc}
          width="100%"
          height="380"
          className="w-full"
          style={{ border: 0 }}
          loading="lazy"
        />
      </div>
      <p className="text-xs text-slate-400 -mt-3 text-center">
        Mapa © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer" className="hover:underline">OpenStreetMap</a> contributors
      </p>

      {/* ── Resultados ── */}
      <div>
        <h2 className="text-base font-bold text-slate-900 dark:text-white mb-3">
          {filtered.length} reporte{filtered.length !== 1 ? "s" : ""}
          {nearbyOnly && userPos ? ` en un radio de ${nearbyKm} km` : ""}
          {estadoFilter ? ` · ${estadoFilter}` : ""}
          {municipioFilter ? `, ${municipioFilter}` : ""}
        </h2>

        {filtered.length === 0 ? (
          <div className="text-center py-14">
            <div className="text-4xl mb-3">🔍</div>
            <p className="text-slate-500 dark:text-slate-400 text-sm">
              {nearbyOnly
                ? `No hay reportes en un radio de ${nearbyKm} km. Intenta aumentar el radio.`
                : "No hay reportes con esos filtros."}
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

                      {report.distKm !== null && (
                        <p className="text-xs text-[#2D9CDB] font-medium mt-0.5">
                          {report.distKm < 1
                            ? `${Math.round(report.distKm * 1000)} m de ti`
                            : `${report.distKm.toFixed(1)} km de ti`}
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
