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

interface MapCenter { lat: number; lon: number; delta: number }

/** Approximate geographic centers of Mexican states */
const ESTADO_CENTERS: Record<string, MapCenter> = {
  "Aguascalientes":                      { lat: 21.885,  lon: -102.292, delta: 0.8 },
  "Baja California":                     { lat: 30.840,  lon: -115.284, delta: 3.5 },
  "Baja California Sur":                 { lat: 26.044,  lon: -111.666, delta: 3.0 },
  "Campeche":                            { lat: 19.830,  lon: -90.535,  delta: 2.5 },
  "Chiapas":                             { lat: 16.757,  lon: -93.129,  delta: 2.5 },
  "Chihuahua":                           { lat: 28.635,  lon: -106.089, delta: 4.5 },
  "Ciudad de México":                    { lat: 19.433,  lon: -99.133,  delta: 0.4 },
  "Coahuila de Zaragoza":                { lat: 27.059,  lon: -101.707, delta: 4.0 },
  "Colima":                              { lat: 19.245,  lon: -103.724, delta: 0.8 },
  "Distrito_Federal":                    { lat: 19.433,  lon: -99.133,  delta: 0.4 },
  "Durango":                             { lat: 24.028,  lon: -104.653, delta: 3.5 },
  "Guanajuato":                          { lat: 21.019,  lon: -101.257, delta: 1.8 },
  "Guerrero":                            { lat: 17.439,  lon: -100.000, delta: 2.5 },
  "Hidalgo":                             { lat: 20.091,  lon: -98.762,  delta: 1.5 },
  "Jalisco":                             { lat: 20.660,  lon: -103.349, delta: 2.5 },
  "México":                              { lat: 19.497,  lon: -99.723,  delta: 1.5 },
  "Michoacán de Ocampo":                 { lat: 19.567,  lon: -101.707, delta: 2.5 },
  "Morelos":                             { lat: 18.681,  lon: -99.101,  delta: 0.8 },
  "Nayarit":                             { lat: 21.751,  lon: -104.846, delta: 2.0 },
  "Nuevo León":                          { lat: 25.592,  lon: -99.996,  delta: 2.5 },
  "Oaxaca":                              { lat: 17.073,  lon: -96.727,  delta: 3.0 },
  "Puebla":                              { lat: 19.041,  lon: -98.206,  delta: 2.0 },
  "Querétaro":                           { lat: 20.589,  lon: -100.390, delta: 1.2 },
  "Quintana Roo":                        { lat: 19.182,  lon: -88.479,  delta: 2.0 },
  "San Luis Potosí":                     { lat: 22.157,  lon: -100.986, delta: 2.5 },
  "Sinaloa":                             { lat: 25.172,  lon: -107.480, delta: 2.5 },
  "Sonora":                              { lat: 29.297,  lon: -110.331, delta: 4.0 },
  "Tabasco":                             { lat: 17.987,  lon: -92.930,  delta: 1.5 },
  "Tamaulipas":                          { lat: 24.267,  lon: -98.836,  delta: 2.5 },
  "Tlaxcala":                            { lat: 19.318,  lon: -98.238,  delta: 0.6 },
  "Veracruz de Ignacio de la Llave":     { lat: 19.174,  lon: -96.134,  delta: 3.5 },
  "Yucatán":                             { lat: 20.710,  lon: -89.094,  delta: 2.0 },
  "Zacatecas":                           { lat: 22.771,  lon: -102.583, delta: 2.5 },
};

const DEFAULT_CENTER: MapCenter = { lat: 23.634, lon: -102.553, delta: 10 }; // México completo

/** Haversine distance in km */
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

function buildMapSrc({ lat, lon, delta }: MapCenter, markerLat?: number, markerLon?: number) {
  const bbox = `${lon - delta}%2C${lat - delta}%2C${lon + delta}%2C${lat + delta}`;
  const marker = markerLat !== undefined ? `&marker=${markerLat}%2C${markerLon}` : "";
  return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik${marker}`;
}

export default function MapaClient({ reports, estados }: Props) {
  const [estadoFilter,    setEstadoFilter]    = useState("");
  const [municipioFilter, setMunicipioFilter] = useState("");
  const [municipios,      setMunicipios]      = useState<string[]>([]);
  const [muniLoading,     setMuniLoading]     = useState(false);
  const [categoryFilter,  setCategoryFilter]  = useState("");
  const [statusFilter,    setStatusFilter]    = useState("");

  // Map center state — drives the iframe
  const [mapCenter, setMapCenter] = useState<MapCenter>(DEFAULT_CENTER);
  const [geocoding,  setGeocoding]  = useState(false);

  // Geolocation
  const [userPos,    setUserPos]    = useState<{ lat: number; lon: number } | null>(null);
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError,   setGeoError]   = useState<string | null>(null);
  const [nearbyKm,   setNearbyKm]   = useState(10);
  const [nearbyOnly, setNearbyOnly] = useState(false);

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) { setGeoError("Tu navegador no soporta geolocalización."); return; }
    setGeoLoading(true);
    setGeoError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lon: pos.coords.longitude };
        setUserPos(loc);
        setMapCenter({ ...loc, delta: nearbyKm / 111 });
        setNearbyOnly(true);
        setGeoLoading(false);
      },
      () => { setGeoError("No se pudo obtener tu ubicación. Verifica los permisos."); setGeoLoading(false); },
      { timeout: 10000, maximumAge: 60000 }
    );
  }, [nearbyKm]);

  async function handleEstadoChange(estado: string) {
    setEstadoFilter(estado);
    setMunicipioFilter("");
    setMunicipios([]);

    if (!estado) {
      setMapCenter(DEFAULT_CENTER);
      return;
    }

    // Move map to state center
    const center = ESTADO_CENTERS[estado];
    if (center) setMapCenter(center);

    // Load municipalities
    setMuniLoading(true);
    const supabase = createClient();
    const { data } = await supabase.rpc("get_municipios", { p_estado: estado });
    setMunicipios((data ?? []).map((r: { municipio: string }) => r.municipio));
    setMuniLoading(false);
  }

  async function handleMunicipioChange(municipio: string) {
    setMunicipioFilter(municipio);
    if (!municipio) {
      // Back to state view
      const center = ESTADO_CENTERS[estadoFilter];
      if (center) setMapCenter(center);
      return;
    }

    // Geocode municipality via Nominatim
    setGeocoding(true);
    try {
      const query = encodeURIComponent(`${municipio}, ${estadoFilter}, México`);
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=1&countrycodes=mx`,
        { headers: { "Accept-Language": "es" } }
      );
      const results = await res.json();
      if (results.length > 0) {
        const { lat, lon } = results[0];
        setMapCenter({ lat: parseFloat(lat), lon: parseFloat(lon), delta: 0.25 });
      }
    } catch {
      // Si falla, usar centro del estado
      const center = ESTADO_CENTERS[estadoFilter];
      if (center) setMapCenter(center);
    } finally {
      setGeocoding(false);
    }
  }

  // Enrich with distance
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
        if (nearbyOnly && a.distKm !== null && b.distKm !== null) return a.distKm - b.distKm;
        return 0;
      });
  }, [enriched, estadoFilter, municipioFilter, categoryFilter, statusFilter, nearbyOnly, userPos, nearbyKm]);

  // If user is nearby mode, center on user; else on the filter center
  const effectiveCenter: MapCenter = nearbyOnly && userPos
    ? { lat: userPos.lat, lon: userPos.lon, delta: nearbyKm / 111 }
    : mapCenter;

  const mapSrc = buildMapSrc(
    effectiveCenter,
    userPos?.lat,
    userPos?.lon
  );

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
                  onClick={() => { setNearbyOnly(false); setUserPos(null); setMapCenter(DEFAULT_CENTER); }}
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
                  <input type="checkbox" checked={nearbyOnly} onChange={(e) => setNearbyOnly(e.target.checked)} className="rounded" />
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
              {geoLoading
                ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : <span>📍</span>}
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
              onClick={() => { setEstadoFilter(""); setMunicipioFilter(""); setCategoryFilter(""); setStatusFilter(""); setMunicipios([]); setNearbyOnly(false); setMapCenter(DEFAULT_CENTER); }}
              className="text-xs text-[#2D9CDB] hover:underline"
            >
              Limpiar ({activeFilters})
            </button>
          )}
          {geocoding && (
            <span className="flex items-center gap-1 text-xs text-slate-400">
              <span className="w-3 h-3 border border-slate-400 border-t-transparent rounded-full animate-spin" />
              Localizando municipio…
            </span>
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
              onChange={(e) => handleMunicipioChange(e.target.value)}
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
          key={mapSrc}
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
