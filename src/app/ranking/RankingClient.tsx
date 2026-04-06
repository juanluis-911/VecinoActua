"use client";

import { useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/types";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];

interface Props {
  leaders: Profile[];
  estados: string[];
}

const roleLabels: Record<string, { label: string; color: string }> = {
  citizen:    { label: "Ciudadano",   color: "text-slate-500 dark:text-slate-400" },
  candidate:  { label: "Candidato",   color: "text-purple-500" },
  official:   { label: "Funcionario", color: "text-blue-500" },
  influencer: { label: "Influencer",  color: "text-pink-500" },
};
const medalEmojis = ["🥇", "🥈", "🥉"];

export default function RankingClient({ leaders, estados }: Props) {
  const [estadoFilter,    setEstadoFilter]    = useState("");
  const [municipioFilter, setMunicipioFilter] = useState("");
  const [municipios,      setMunicipios]      = useState<string[]>([]);
  const [muniLoading,     setMuniLoading]     = useState(false);

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

  const filtered = useMemo(() => {
    return leaders.filter((p) => {
      // Match profile's colonia field against estado/municipio
      // (profiles have colonia as free-text, may contain municipio)
      if (estadoFilter) {
        const haystack = [p.colonia, p.city].join(" ").toLowerCase();
        if (!haystack.includes(estadoFilter.toLowerCase())) return false;
      }
      if (municipioFilter) {
        const haystack = [p.colonia, p.city].join(" ").toLowerCase();
        if (!haystack.includes(municipioFilter.toLowerCase())) return false;
      }
      return true;
    });
  }, [leaders, estadoFilter, municipioFilter]);

  // When no filter, show all
  const displayed = (estadoFilter || municipioFilter) ? filtered : leaders;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-bold text-slate-900 dark:text-white">
          👥 Ciudadanos destacados
          {(estadoFilter || municipioFilter) && (
            <span className="ml-2 text-sm font-normal text-slate-500">
              ({displayed.length} resultado{displayed.length !== 1 ? "s" : ""})
            </span>
          )}
        </h2>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <select
            value={estadoFilter}
            onChange={(e) => handleEstadoChange(e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#2D9CDB]"
          >
            <option value="">Todos los estados</option>
            {estados.map((e) => <option key={e} value={e}>{e}</option>)}
          </select>
        </div>
        <div>
          <select
            value={municipioFilter}
            onChange={(e) => setMunicipioFilter(e.target.value)}
            disabled={!estadoFilter || muniLoading}
            className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#2D9CDB] disabled:opacity-50"
          >
            <option value="">Todos los municipios</option>
            {municipios.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
      </div>

      {displayed.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-4xl mb-3">📭</div>
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            {leaders.length === 0
              ? "Todavía no hay reportes. ¡Sé el primero!"
              : "No hay ciudadanos de esa región aún."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {displayed.map((profile, index) => {
            const position  = index + 1;
            const roleInfo  = roleLabels[profile.role] ?? roleLabels.citizen;
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
                    <span className="text-lg font-bold text-slate-400 dark:text-slate-500">{position}</span>
                  )}
                </div>

                {/* Avatar */}
                {profile.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={profile.avatar_url} alt={profile.full_name ?? ""} className="w-12 h-12 rounded-full object-cover shrink-0" />
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
                    {profile.is_verified && <span className="text-[#2D9CDB] text-sm shrink-0">✓</span>}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span className={`text-xs font-medium ${roleInfo.color}`}>{roleInfo.label}</span>
                    {profile.colonia && (
                      <>
                        <span className="text-slate-300 dark:text-slate-600">·</span>
                        <span className="text-xs text-slate-400 truncate">📍 {profile.colonia}</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Score */}
                <div className="text-right shrink-0">
                  <div className="text-xl font-bold text-slate-900 dark:text-white">{profile.reports_count}</div>
                  <div className="text-xs text-slate-400">{profile.reports_count === 1 ? "reporte" : "reportes"}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
