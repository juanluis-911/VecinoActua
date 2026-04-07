-- ============================================================
-- Migración: reacciones estilo Facebook
-- Ejecutar en Supabase → SQL Editor
-- ============================================================

-- 1. Agregar reaction_type a la tabla likes
--    (mantiene UNIQUE(report_id, user_id) → un usuario, una reacción por reporte)
ALTER TABLE public.likes
  ADD COLUMN IF NOT EXISTS reaction_type TEXT NOT NULL DEFAULT 'like'
  CHECK (reaction_type IN ('like', 'love', 'haha', 'wow', 'sad', 'angry'));

-- 2. Crear tabla comment_reactions
CREATE TABLE IF NOT EXISTS public.comment_reactions (
  id            UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  comment_id    UUID        NOT NULL REFERENCES public.comments(id)  ON DELETE CASCADE,
  user_id       UUID        NOT NULL REFERENCES public.profiles(id)  ON DELETE CASCADE,
  reaction_type TEXT        NOT NULL DEFAULT 'like'
                            CHECK (reaction_type IN ('like', 'love', 'haha', 'wow', 'sad', 'angry')),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(comment_id, user_id)
);

-- 3. Row Level Security en comment_reactions
ALTER TABLE public.comment_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "comment_reactions_select"
  ON public.comment_reactions FOR SELECT USING (true);

CREATE POLICY "comment_reactions_insert"
  ON public.comment_reactions FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "comment_reactions_update"
  ON public.comment_reactions FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "comment_reactions_delete"
  ON public.comment_reactions FOR DELETE USING (auth.uid() = user_id);
