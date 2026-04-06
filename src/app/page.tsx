import Link from "next/link";
import StatusBadge from "@/components/ui/StatusBadge";
import CategoryIcon from "@/components/ui/CategoryIcon";

const mockReports = [
  {
    id: 1,
    title: "Bache enorme en mi calle",
    neighborhood: "Col. Las Flores",
    status: "in_progress" as const,
    author: "Luis Palma",
    avatar: "LP",
    avatarColor: "bg-blue-500",
    time: "hace 2h",
    likes: 24,
    comments: 8,
    category: "bache" as const,
  },
  {
    id: 2,
    title: "Lámpara apagada en el parque",
    neighborhood: "Col. Jardines",
    status: "in_progress" as const,
    author: "Juan Presidente",
    avatar: "JP",
    avatarColor: "bg-emerald-500",
    time: "hace 5h",
    likes: 18,
    comments: 3,
    category: "lampara" as const,
  },
  {
    id: 3,
    title: "Fuga de agua en Av. Principal",
    neighborhood: "Col. Centro",
    status: "open" as const,
    author: "María Torres",
    avatar: "MT",
    avatarColor: "bg-purple-500",
    time: "hace 1d",
    likes: 41,
    comments: 12,
    category: "agua" as const,
  },
];

const features = [
  {
    icon: "🗺️",
    title: "Reporta",
    description: "Sube problemas de tu colonia con foto y ubicación exacta.",
    color: "bg-orange-50 dark:bg-orange-900/20",
  },
  {
    icon: "❤️",
    title: "Participa",
    description: "Sigue, comenta y apoya reportes de tu comunidad.",
    color: "bg-red-50 dark:bg-red-900/20",
  },
  {
    icon: "✅",
    title: "Resuelve",
    description: "Ve quién lo está arreglando y cuándo queda listo.",
    color: "bg-emerald-50 dark:bg-emerald-900/20",
  },
];

const categoryIds = ["bache", "lampara", "agua", "basura", "fuga", "otro"] as const;

export default function HomePage() {
  return (
    <main className="flex-1">
      {/* Hero */}
      <section className="relative bg-gradient-to-br from-[#1a5fa8] via-[#2D9CDB] to-[#1a8cd8] text-white overflow-hidden">
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <div className="absolute top-10 left-10 w-72 h-72 bg-white rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-20 w-96 h-96 bg-[#FF5A5F] rounded-full blur-3xl" />
        </div>
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20 md:py-28 text-center">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-4 leading-tight">
            Tu voz para mejorar
            <br />
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

          {/* Stats bar */}
          <div className="mt-16 grid grid-cols-3 gap-4 max-w-lg mx-auto">
            {[
              { value: "1,240", label: "Reportes activos" },
              { value: "87%",   label: "Resueltos" },
              { value: "48",    label: "Colonias" },
            ].map(({ value, label }) => (
              <div key={label} className="text-center">
                <div className="text-2xl md:text-3xl font-bold">{value}</div>
                <div className="text-xs md:text-sm text-blue-200 mt-0.5">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
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

      {/* Categorías */}
      <section className="bg-slate-50 dark:bg-slate-900 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-8 text-center">
            ¿Qué problema quieres reportar?
          </h2>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-4 max-w-2xl mx-auto">
            {categoryIds.map((id) => (
              <Link key={id} href={`/reporte/nuevo?categoria=${id}`}>
                <CategoryIcon category={id} showLabel className="hover:scale-105 transition-transform cursor-pointer" />
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Feed de reportes */}
      <section className="bg-white dark:bg-slate-950 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Últimos Reportes</h2>
            <Link href="/feed" className="text-sm font-medium text-[#2D9CDB] hover:underline">
              Ver todos →
            </Link>
          </div>

          <div className="space-y-4">
            {mockReports.map((report) => (
              <article
                key={report.id}
                className="flex gap-4 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700 hover:shadow-sm transition-all cursor-pointer group"
              >
                <div className="w-20 h-20 shrink-0 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center overflow-hidden">
                  <CategoryIcon category={report.category} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h3 className="font-semibold text-slate-900 dark:text-white group-hover:text-[#2D9CDB] transition-colors truncate">
                      {report.title}
                    </h3>
                    <StatusBadge status={report.status} />
                  </div>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mb-3">{report.neighborhood}</p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-6 h-6 rounded-full ${report.avatarColor} flex items-center justify-center text-white text-xs font-bold`}>
                        {report.avatar}
                      </div>
                      <span className="text-xs text-slate-500 dark:text-slate-400">{report.author}</span>
                      <span className="text-xs text-slate-300 dark:text-slate-600">·</span>
                      <span className="text-xs text-slate-400">{report.time}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-400">
                      <span>❤️ {report.likes}</span>
                      <span>💬 {report.comments}</span>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* CTA final */}
      <section className="bg-gradient-to-r from-[#FF5A5F] to-[#e04e53] py-16 text-white text-center">
        <div className="mx-auto max-w-2xl px-4">
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
        </div>
      </section>
    </main>
  );
}
