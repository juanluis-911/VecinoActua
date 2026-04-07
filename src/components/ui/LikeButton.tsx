"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface Props {
  reportId:     string;
  initialCount: number;
  initialLiked: boolean;
  userId:       string | null;
  redirectPath?: string;
  size?:         "sm" | "md";
}

export default function LikeButton({
  reportId,
  initialCount,
  initialLiked,
  userId,
  redirectPath = "/",
  size = "sm",
}: Props) {
  const [liked,   setLiked]   = useState(initialLiked);
  const [count,   setCount]   = useState(initialCount);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function toggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (loading) return;

    if (!userId) {
      router.push(`/login?next=${encodeURIComponent(redirectPath)}`);
      return;
    }

    const wasLiked = liked;
    const newCount = wasLiked ? Math.max(0, count - 1) : count + 1;

    // Optimistic update
    setLiked(!wasLiked);
    setCount(newCount);
    setLoading(true);

    const supabase = createClient();

    const { error } = wasLiked
      ? await supabase
          .from("likes")
          .delete()
          .eq("report_id", reportId)
          .eq("user_id", userId)
      : await supabase
          .from("likes")
          .insert({ report_id: reportId, user_id: userId });

    if (error) {
      // Revert on failure
      setLiked(wasLiked);
      setCount(count);
    } else {
      // Sync count to DB (best-effort)
      await supabase
        .from("reports")
        .update({ likes_count: newCount })
        .eq("id", reportId);
    }

    setLoading(false);
  }

  const textSize  = size === "md" ? "text-base" : "text-sm";
  const iconScale = liked ? "scale-125" : "scale-100";

  return (
    <button
      onClick={toggle}
      disabled={loading}
      title={
        !userId
          ? "Inicia sesión para reaccionar"
          : liked
          ? "Quitar me gusta"
          : "Me gusta"
      }
      className={`flex items-center gap-1.5 font-medium transition-all active:scale-90 disabled:opacity-60 cursor-pointer select-none ${textSize} ${
        liked
          ? "text-red-500"
          : "text-slate-400 hover:text-red-400"
      }`}
    >
      <span className={`transition-transform duration-150 inline-block ${iconScale}`}>
        {liked ? "❤️" : "🤍"}
      </span>
      <span>{count}</span>
    </button>
  );
}
