"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { ReactionType } from "@/lib/supabase/types";

// ─── config ──────────────────────────────────────────────────────────────────

export const REACTIONS: { type: ReactionType; emoji: string; label: string }[] = [
  { type: "like",  emoji: "👍", label: "Me gusta"      },
  { type: "love",  emoji: "❤️", label: "Me encanta"    },
  { type: "haha",  emoji: "😂", label: "Me divierte"   },
  { type: "wow",   emoji: "😮", label: "Me sorprende"  },
  { type: "sad",   emoji: "😢", label: "Me entristece" },
  { type: "angry", emoji: "😡", label: "Me enoja"      },
];

const REACTION_COLOR: Record<ReactionType, string> = {
  like:  "text-blue-500",
  love:  "text-rose-500",
  haha:  "text-amber-500",
  wow:   "text-amber-500",
  sad:   "text-sky-500",
  angry: "text-red-600",
};

// ─── types ────────────────────────────────────────────────────────────────────

interface Props {
  /** Pass reportId OR commentId (not both) */
  reportId?:       string;
  commentId?:      string;
  initialReaction: ReactionType | null;
  initialCount:    number;
  userId:          string | null;
  redirectPath?:   string;
  size?:           "sm" | "md";
}

// ─── component ────────────────────────────────────────────────────────────────

export default function ReactionsButton({
  reportId,
  commentId,
  initialReaction,
  initialCount,
  userId,
  redirectPath = "/",
  size = "sm",
}: Props) {
  const [reaction, setReaction] = useState<ReactionType | null>(initialReaction);
  const [count,    setCount]    = useState(initialCount);
  const [open,     setOpen]     = useState(false);
  const [saving,   setSaving]   = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const hoverTimer   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const router       = useRouter();

  // Close picker on outside click
  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  // ── DB operations ──────────────────────────────────────────────────────────

  async function applyReaction(type: ReactionType) {
    if (!userId) {
      router.push(`/login?next=${encodeURIComponent(redirectPath)}`);
      return;
    }
    if (saving) return;

    setOpen(false);

    const prev         = reaction;
    const isRemoving   = type === prev;
    const newReaction  = isRemoving ? null : type;
    const newCount     = isRemoving
      ? Math.max(0, count - 1)
      : prev ? count        // cambia tipo, mismo total
              : count + 1;  // reacción nueva

    // Optimistic
    setReaction(newReaction);
    setCount(newCount);
    setSaving(true);

    const supabase = createClient();
    let failed = false;

    if (reportId) {
      if (isRemoving) {
        const { error } = await supabase
          .from("likes")
          .delete()
          .eq("report_id", reportId)
          .eq("user_id", userId);
        failed = !!error;
        if (!failed) {
          await supabase
            .from("reports")
            .update({ likes_count: newCount })
            .eq("id", reportId);
        }
      } else if (prev) {
        // Cambiar tipo de reacción → UPDATE
        const { error } = await supabase
          .from("likes")
          .update({ reaction_type: type })
          .eq("report_id", reportId)
          .eq("user_id", userId);
        failed = !!error;
      } else {
        // Reacción nueva → INSERT
        const { error } = await supabase
          .from("likes")
          .insert({ report_id: reportId, user_id: userId, reaction_type: type });
        failed = !!error;
        if (!failed) {
          await supabase
            .from("reports")
            .update({ likes_count: newCount })
            .eq("id", reportId);
        }
      }
    } else if (commentId) {
      if (isRemoving) {
        const { error } = await supabase
          .from("comment_reactions")
          .delete()
          .eq("comment_id", commentId)
          .eq("user_id", userId);
        failed = !!error;
      } else if (prev) {
        const { error } = await supabase
          .from("comment_reactions")
          .update({ reaction_type: type })
          .eq("comment_id", commentId)
          .eq("user_id", userId);
        failed = !!error;
      } else {
        const { error } = await supabase
          .from("comment_reactions")
          .insert({ comment_id: commentId, user_id: userId, reaction_type: type });
        failed = !!error;
      }
    }

    if (failed) {
      // Revertir
      setReaction(prev);
      setCount(count);
    }

    setSaving(false);
  }

  // ── picker open/close ──────────────────────────────────────────────────────

  function openPicker() {
    if (!userId) {
      router.push(`/login?next=${encodeURIComponent(redirectPath)}`);
      return;
    }
    setOpen(true);
  }

  function onMouseEnter() {
    hoverTimer.current = setTimeout(openPicker, 380);
  }
  function onMouseLeave() {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
  }
  function onClick() {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    if (open) { setOpen(false); return; }
    openPicker();
  }

  // ── render ─────────────────────────────────────────────────────────────────

  const info         = reaction ? REACTIONS.find((r) => r.type === reaction) : null;
  const displayEmoji = info?.emoji ?? "👍";
  const textColor    = reaction
    ? REACTION_COLOR[reaction]
    : "text-slate-400 hover:text-blue-400";
  const label        = info?.label ?? "Reaccionar";

  return (
    <div ref={containerRef} className="relative inline-flex">

      {/* ── Trigger button ── */}
      <button
        onClick={onClick}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        disabled={saving}
        title={label}
        className={`flex items-center gap-1.5 font-medium transition-all active:scale-90
                    disabled:opacity-60 cursor-pointer select-none
                    ${size === "md" ? "text-base" : "text-sm"}
                    ${textColor}`}
      >
        <span
          className={`inline-block transition-transform duration-150
                      ${reaction ? "scale-110" : ""}`}
        >
          {displayEmoji}
        </span>
        {count > 0 && <span>{count}</span>}
      </button>

      {/* ── Picker popup ── */}
      {open && (
        <div
          className="absolute bottom-full mb-2.5 left-1/2 -translate-x-1/2 z-50
                     flex items-end gap-0.5 px-2 py-1.5
                     bg-white dark:bg-slate-800 rounded-2xl
                     shadow-xl border border-slate-100 dark:border-slate-700
                     min-w-max"
          onMouseEnter={() => {
            if (hoverTimer.current) clearTimeout(hoverTimer.current);
          }}
          onMouseLeave={() => setOpen(false)}
        >
          {REACTIONS.map(({ type, emoji, label: lbl }) => {
            const isActive = reaction === type;
            return (
              <button
                key={type}
                onClick={() => applyReaction(type)}
                title={lbl}
                className={`group relative flex flex-col items-center justify-center
                            w-10 h-10 rounded-full cursor-pointer
                            transition-all duration-100
                            hover:scale-[1.6] hover:-translate-y-2
                            ${isActive
                              ? "scale-[1.35] -translate-y-1"
                              : "hover:bg-transparent"
                            }`}
              >
                <span className="text-[22px] leading-none">{emoji}</span>
                {/* label tooltip */}
                <span
                  className="absolute -top-7 left-1/2 -translate-x-1/2
                             px-2 py-0.5 rounded-md text-[10px] font-semibold
                             bg-slate-900 text-white whitespace-nowrap
                             opacity-0 group-hover:opacity-100 transition-opacity
                             pointer-events-none"
                >
                  {lbl}
                </span>
                {/* active dot */}
                {isActive && (
                  <span className="absolute -bottom-1 w-1.5 h-1.5 rounded-full bg-blue-500" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
