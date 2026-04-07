import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import PerfilClient from "./PerfilClient";
import type { Database, ReportWithAuthor } from "@/lib/supabase/types";

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

  const [{ data: profileRaw }, { data: reports }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    supabase
      .from("reports")
      .select("*, author:profiles!reports_author_id_fkey(id, full_name, avatar_url, role, is_verified)")
      .eq("author_id", user.id)
      .order("created_at", { ascending: false }),
  ]);

  const profile = profileRaw as Profile | null;
  const myReports = (reports ?? []) as unknown as ReportWithAuthor[];

  const avatarLetter =
    profile?.full_name?.[0]?.toUpperCase() ??
    user.email?.[0]?.toUpperCase() ??
    "?";

  const memberSince = profile
    ? new Date(profile.created_at).toLocaleDateString("es-MX", {
        month: "long",
        year: "numeric",
      })
    : null;

  const location = profile?.colonia ?? profile?.city ?? null;

  return (
    <main className="flex-1 bg-slate-50 dark:bg-slate-900">
      {/* Gradient header */}
      <div className="bg-gradient-to-br from-[#1a5fa8] via-[#2D9CDB] to-[#1a8cd8] pt-10 pb-24 px-4">
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

          <h1 className="text-2xl font-bold flex items-center justify-center gap-2">
            {profile?.full_name ?? "Ciudadano"}
            {profile?.is_verified && (
              <span className="text-yellow-300 text-lg" title="Verificado">✓</span>
            )}
          </h1>

          <p className="text-blue-200 text-sm mt-1">
            {roleLabels[profile?.role ?? "citizen"] ?? "Ciudadano"}
            {location && ` · 📍 ${location}`}
          </p>

          {profile?.bio && (
            <p className="text-blue-100/90 text-sm mt-2 max-w-sm mx-auto leading-relaxed">
              {profile.bio}
            </p>
          )}

          {memberSince && (
            <p className="text-blue-200/60 text-xs mt-3">Miembro desde {memberSince}</p>
          )}
        </div>
      </div>

      {/* Interactive content (stats + tabs + reports) */}
      <div className="mx-auto max-w-3xl px-4 sm:px-6 pb-10">
        <PerfilClient reports={myReports} />
      </div>
    </main>
  );
}
