"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { categories } from "@/components/ui/CategoryIcon";
import type { Database, ReportCategory } from "@/lib/supabase/types";

type ReportInsert = Database["public"]["Tables"]["reports"]["Insert"];
type ColoniaRow   = Database["public"]["Tables"]["colonias"]["Row"];

const categoryKeys = Object.keys(categories) as ReportCategory[];

export default function NuevoReportePage() {
  const router      = useRouter();
  const searchParams = useSearchParams();
  const initialCategory = (searchParams.get("categoria") as ReportCategory) ?? null;

  // Form state
  const [category,    setCategory]    = useState<ReportCategory | null>(initialCategory);
  const [title,       setTitle]       = useState("");
  const [description, setDescription] = useState("");
  const [imageFile,   setImageFile]   = useState<File | null>(null);
  const [imagePreview,setImagePreview]= useState<string | null>(null);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Location state (via CP lookup)
  const [cp,         setCp]         = useState("");
  const [cpOptions,  setCpOptions]  = useState<ColoniaRow[]>([]);
  const [cpLoading,  setCpLoading]  = useState(false);
  const [cpError,    setCpError]    = useState<string | null>(null);
  const [selectedColonia, setSelectedColonia] = useState<ColoniaRow | null>(null);
  const [manualAddress,   setManualAddress]   = useState("");

  // Fetch colonias when CP has 5 digits
  useEffect(() => {
    const digits = cp.replace(/\D/g, "");
    if (digits.length !== 5) { setCpOptions([]); setSelectedColonia(null); return; }

    const supabase = createClient();
    setCpLoading(true);
    setCpError(null);

    supabase
      .from("colonias")
      .select("id, cp, colonia, tipo, municipio, estado, ciudad")
      .eq("cp", digits)
      .order("colonia")
      .then(({ data, error }) => {
        setCpLoading(false);
        if (error || !data?.length) {
          setCpError("Código postal no encontrado.");
          setCpOptions([]);
        } else {
          setCpOptions(data as ColoniaRow[]);
          setSelectedColonia(data[0] as ColoniaRow);
        }
      });
  }, [cp]);

  function handleImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!category)        { setError("Selecciona una categoría."); return; }
    if (!title.trim())    { setError("Escribe un título para el reporte."); return; }
    if (!selectedColonia) { setError("Ingresa un código postal válido y selecciona tu colonia."); return; }

    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login?next=/reporte/nuevo"); return; }

    let image_url: string | null = null;
    if (imageFile) {
      const ext  = imageFile.name.split(".").pop();
      const path = `reports/${user.id}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("report-images")
        .upload(path, imageFile, { upsert: false });
      if (uploadError) {
        setError("Error subiendo imagen: " + uploadError.message);
        setLoading(false);
        return;
      }
      image_url = supabase.storage.from("report-images").getPublicUrl(path).data.publicUrl;
    }

    const insertData: ReportInsert = {
      author_id:  user.id,
      title:      title.trim(),
      description: description.trim() || null,
      category,
      status:     "open",
      image_url,
      colonia:    selectedColonia.colonia,
      address:    manualAddress.trim() || null,
      estado:     selectedColonia.estado,
      municipio:  selectedColonia.municipio,
      latitude:   null,
      longitude:  null,
      resolved_at:  null,
      resolved_by:  null,
      evidence_url: null,
    };

    const { error: insertError } = await supabase.from("reports").insert(insertData);
    if (insertError) {
      setError("Error creando reporte: " + insertError.message);
      setLoading(false);
      return;
    }
    router.push("/feed");
    router.refresh();
  }

  const locationReady = !!selectedColonia;

  return (
    <main className="flex-1 bg-slate-50 dark:bg-slate-900 py-10 px-4">
      <div className="mx-auto max-w-xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Nuevo reporte</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Informa a tu comunidad sobre un problema en tu colonia.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-6 space-y-6 shadow-sm"
        >
          {/* ── Categoría ── */}
          <div>
            <label className="block text-sm font-semibold text-slate-800 dark:text-white mb-3">
              Categoría <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {categoryKeys.map((key) => {
                const { emoji, label, bg } = categories[key];
                const selected = category === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setCategory(key)}
                    className={`flex flex-col items-center gap-1 p-2 rounded-xl border-2 transition-all ${
                      selected
                        ? "border-[#2D9CDB] bg-blue-50 dark:bg-blue-900/30"
                        : "border-transparent hover:border-slate-200 dark:hover:border-slate-600"
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl ${bg}`}>
                      {emoji}
                    </div>
                    <span className="text-xs text-slate-500 dark:text-slate-400 text-center leading-tight">
                      {label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Título ── */}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Título <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={120}
              placeholder="Ej: Bache enorme en Calle Robles"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2D9CDB] focus:border-transparent transition"
            />
          </div>

          {/* ── Descripción ── */}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Descripción <span className="text-slate-400 font-normal">(opcional)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              maxLength={500}
              placeholder="Describe el problema con más detalle..."
              className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2D9CDB] focus:border-transparent transition resize-none"
            />
          </div>

          {/* ── Ubicación por CP ── */}
          <div className="space-y-3">
            <label className="block text-sm font-semibold text-slate-800 dark:text-white">
              Ubicación <span className="text-red-500">*</span>
            </label>

            {/* CP input */}
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Código Postal
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={cp}
                  onChange={(e) => setCp(e.target.value.replace(/\D/g, "").slice(0, 5))}
                  maxLength={5}
                  placeholder="Ej: 06600"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2D9CDB] focus:border-transparent transition"
                />
                {cpLoading && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-[#2D9CDB] border-t-transparent rounded-full animate-spin" />
                )}
              </div>
              {cpError && (
                <p className="text-xs text-red-500 mt-1">{cpError}</p>
              )}
            </div>

            {/* Colonia select */}
            {cpOptions.length > 0 && (
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Colonia / Asentamiento
                </label>
                <select
                  value={selectedColonia?.id ?? ""}
                  onChange={(e) => {
                    const found = cpOptions.find((o) => String(o.id) === e.target.value);
                    setSelectedColonia(found ?? null);
                  }}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#2D9CDB] focus:border-transparent transition"
                >
                  {cpOptions.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.colonia}{o.tipo ? ` (${o.tipo})` : ""}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Auto-filled location chips */}
            {selectedColonia && (
              <div className="flex flex-wrap gap-2">
                {[
                  { icon: "🏘️", label: selectedColonia.municipio },
                  { icon: "🗺️", label: selectedColonia.estado },
                  ...(selectedColonia.ciudad ? [{ icon: "🏙️", label: selectedColonia.ciudad }] : []),
                ].map(({ icon, label }) => (
                  <span key={label} className="inline-flex items-center gap-1 px-3 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs rounded-full border border-blue-100 dark:border-blue-800">
                    {icon} {label}
                  </span>
                ))}
              </div>
            )}

            {/* Dirección manual */}
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Calle y número <span className="text-slate-400 font-normal">(opcional)</span>
              </label>
              <input
                type="text"
                value={manualAddress}
                onChange={(e) => setManualAddress(e.target.value)}
                placeholder="Ej: Calle Robles #42, entre Pino y Álamo"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2D9CDB] focus:border-transparent transition"
              />
            </div>
          </div>

          {/* ── Foto ── */}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Foto del problema <span className="text-slate-400 font-normal">(opcional)</span>
            </label>
            {imagePreview ? (
              <div className="relative rounded-xl overflow-hidden border border-slate-200 dark:border-slate-600">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imagePreview} alt="preview" className="w-full h-48 object-cover" />
                <button
                  type="button"
                  onClick={() => { setImageFile(null); setImagePreview(null); if (fileRef.current) fileRef.current.value = ""; }}
                  className="absolute top-2 right-2 w-7 h-7 bg-black/50 text-white rounded-full flex items-center justify-center hover:bg-black/70 transition-colors text-sm"
                >
                  ✕
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="w-full h-32 border-2 border-dashed border-slate-200 dark:border-slate-600 rounded-xl flex flex-col items-center justify-center gap-2 text-slate-400 hover:border-[#2D9CDB] hover:text-[#2D9CDB] transition-colors"
              >
                <span className="text-3xl">📷</span>
                <span className="text-sm">Toca para agregar foto</span>
              </button>
            )}
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImage} />
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => router.back()}
              className="flex-1 py-3 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 font-semibold rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !locationReady}
              className="flex-1 py-3 bg-[#FF5A5F] hover:bg-[#e04e53] text-white font-semibold rounded-xl transition-colors disabled:opacity-50 shadow-sm"
            >
              {loading ? "Enviando..." : "Publicar reporte"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
