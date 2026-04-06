import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import { createClient } from "@/lib/supabase/server";

const geist = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "VecinoActúa — Tu voz para mejorar la ciudad",
  description:
    "Reporta problemas urbanos, sigue su resolución y genera presión social. Baches, lámparas, fugas de agua y más.",
  icons: { icon: "/favicon.svg" },
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let profile = null;
  if (user) {
    const { data } = await supabase
      .from("profiles")
      .select("full_name, avatar_url")
      .eq("id", user.id)
      .single();
    profile = data;
  }

  return (
    <html lang="es" className={`${geist.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-white dark:bg-slate-950 text-slate-900 dark:text-white">
        <Navbar user={user} profile={profile} />
        {children}
        <footer className="py-8 border-t border-slate-100 dark:border-slate-800 text-center text-sm text-slate-400">
          © {new Date().getFullYear()} VecinoActúa — Todos los derechos reservados
        </footer>
      </body>
    </html>
  );
}
