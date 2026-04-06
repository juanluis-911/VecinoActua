import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import MapaClient from "./MapaClient";
import type { ReportWithAuthor } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

export default async function MapaPage() {
  const supabase = await createClient();

  // All reports with author info
  const { data: reportsRaw } = await supabase
    .from("reports")
    .select("*, author:profiles!reports_author_id_fkey(id, full_name, avatar_url, role, is_verified)")
    .order("created_at", { ascending: false })
    .limit(500);

  const reports = (reportsRaw ?? []) as unknown as ReportWithAuthor[];

  // Distinct states from colonias table (canonical names)
  const { data: estadosRaw } = await supabase
    .from("colonias")
    .select("estado")
    .order("estado");

  const estados: string[] = Array.from(
    new Set((estadosRaw ?? []).map((r: { estado: string }) => r.estado))
  );

  return (
    <main className="flex-1 flex flex-col bg-slate-50 dark:bg-slate-900">
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700 px-4 sm:px-6 py-4">
        <div className="mx-auto max-w-7xl flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Mapa de reportes</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {reports.length} reporte{reports.length !== 1 ? "s" : ""} en total
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

      <MapaClient reports={reports} estados={estados} />
    </main>
  );
}
