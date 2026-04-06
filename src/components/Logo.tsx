"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  iconOnly?: boolean;
  size?: "sm" | "md" | "lg";
  href?: string;
}

const sizes = {
  sm: { icon: 28, fontSize: "text-lg" },
  md: { icon: 36, fontSize: "text-2xl" },
  lg: { icon: 48, fontSize: "text-3xl" },
};

function LogoIcon({ size = 36, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 88 112"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={cn("shrink-0", className)}
    >
      {/* Map pin / speech bubble body */}
      <path
        d="M44 6C22.5 6 6 22.5 6 42C6 61 17.5 76 34 84L44 100L54 84C70.5 76 82 61 82 42C82 22.5 65.5 6 44 6Z"
        fill="#2D9CDB"
      />
      {/* Inner circle highlight */}
      <circle cx="44" cy="42" r="24" fill="white" fillOpacity="0.15" />
      {/* Checkmark */}
      <path
        d="M29 42L39 53L59 29"
        stroke="white"
        strokeWidth="5.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Community dots */}
      <circle cx="28" cy="104" r="5.5" fill="#FF5A5F" />
      <circle cx="44" cy="110" r="5.5" fill="#FF5A5F" />
      <circle cx="60" cy="104" r="5.5" fill="#FF5A5F" />
    </svg>
  );
}

export default function Logo({
  className,
  iconOnly = false,
  size = "md",
  href = "/",
}: LogoProps) {
  const { icon, fontSize } = sizes[size];

  const content = (
    <span
      className={cn(
        "inline-flex items-center gap-2.5 transition-transform duration-200 hover:scale-[1.03] focus-visible:outline-none",
        className
      )}
    >
      <LogoIcon size={icon} />
      {!iconOnly && (
        <span
          className={cn(
            "font-bold tracking-tight leading-none select-none",
            fontSize
          )}
          style={{ fontFamily: "'Geist', 'Inter', 'Segoe UI', sans-serif" }}
        >
          <span className="text-[#2D9CDB]">Vecino</span>
          <span className="text-[#FF5A5F]">Actúa</span>
        </span>
      )}
    </span>
  );

  return (
    <Link href={href} aria-label="VecinoActúa — Inicio">
      {content}
    </Link>
  );
}

export { LogoIcon };
