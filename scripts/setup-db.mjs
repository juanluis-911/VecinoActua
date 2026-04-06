const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://ectyxauddclqbikkvnht.supabase.co";
const MANAGEMENT_TOKEN = process.env.SUPABASE_MANAGEMENT_TOKEN;
if (!MANAGEMENT_TOKEN) { console.error("❌ Falta SUPABASE_MANAGEMENT_TOKEN"); process.exit(1); }
const PROJECT_REF = SUPABASE_URL.match(/https:\/\/([^.]+)/)?.[1];

async function runSQL(sql) {
  const res = await fetch(
    `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${MANAGEMENT_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: sql }),
    }
  );
  const data = await res.json();
  return data;
}

const steps = [
  {
    name: "Create user_role enum",
    sql: `DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM ('citizen', 'candidate', 'official', 'influencer');
      END IF;
    END $$;`,
  },
  {
    name: "Create report_status enum",
    sql: `DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'report_status') THEN
        CREATE TYPE report_status AS ENUM ('open', 'in_progress', 'resolved');
      END IF;
    END $$;`,
  },
  {
    name: "Create report_category enum",
    sql: `DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'report_category') THEN
        CREATE TYPE report_category AS ENUM ('bache', 'lampara', 'agua', 'basura', 'fuga', 'otro');
      END IF;
    END $$;`,
  },
  {
    name: "Create profiles table",
    sql: `CREATE TABLE IF NOT EXISTS public.profiles (
      id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
      username TEXT UNIQUE,
      full_name TEXT,
      avatar_url TEXT,
      role user_role NOT NULL DEFAULT 'citizen',
      is_verified BOOLEAN NOT NULL DEFAULT FALSE,
      bio TEXT,
      colonia TEXT,
      city TEXT DEFAULT 'Ciudad de México',
      reports_count INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );`,
  },
  {
    name: "Create reports table",
    sql: `CREATE TABLE IF NOT EXISTS public.reports (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      description TEXT,
      category report_category NOT NULL DEFAULT 'otro',
      status report_status NOT NULL DEFAULT 'open',
      image_url TEXT,
      latitude DOUBLE PRECISION,
      longitude DOUBLE PRECISION,
      colonia TEXT,
      address TEXT,
      likes_count INTEGER NOT NULL DEFAULT 0,
      comments_count INTEGER NOT NULL DEFAULT 0,
      resolved_at TIMESTAMPTZ,
      resolved_by UUID REFERENCES public.profiles(id),
      evidence_url TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );`,
  },
  {
    name: "Create comments table",
    sql: `CREATE TABLE IF NOT EXISTS public.comments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      report_id UUID NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
      author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
      content TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );`,
  },
  {
    name: "Create likes table",
    sql: `CREATE TABLE IF NOT EXISTS public.likes (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      report_id UUID NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(report_id, user_id)
    );`,
  },
  {
    name: "Enable RLS on all tables",
    sql: `
      ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
      ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
      ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
      ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;
    `,
  },
  {
    name: "RLS: profiles — public read",
    sql: `DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
    CREATE POLICY "Profiles are viewable by everyone"
      ON public.profiles FOR SELECT USING (TRUE);`,
  },
  {
    name: "RLS: profiles — own write",
    sql: `DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
    CREATE POLICY "Users can update own profile"
      ON public.profiles FOR UPDATE USING (auth.uid() = id);`,
  },
  {
    name: "RLS: reports — public read",
    sql: `DROP POLICY IF EXISTS "Reports are viewable by everyone" ON public.reports;
    CREATE POLICY "Reports are viewable by everyone"
      ON public.reports FOR SELECT USING (TRUE);`,
  },
  {
    name: "RLS: reports — auth insert",
    sql: `DROP POLICY IF EXISTS "Authenticated users can create reports" ON public.reports;
    CREATE POLICY "Authenticated users can create reports"
      ON public.reports FOR INSERT WITH CHECK (auth.uid() = author_id);`,
  },
  {
    name: "RLS: reports — own update",
    sql: `DROP POLICY IF EXISTS "Authors can update own reports" ON public.reports;
    CREATE POLICY "Authors can update own reports"
      ON public.reports FOR UPDATE USING (auth.uid() = author_id);`,
  },
  {
    name: "RLS: comments — public read",
    sql: `DROP POLICY IF EXISTS "Comments are viewable by everyone" ON public.comments;
    CREATE POLICY "Comments are viewable by everyone"
      ON public.comments FOR SELECT USING (TRUE);`,
  },
  {
    name: "RLS: comments — auth insert",
    sql: `DROP POLICY IF EXISTS "Authenticated users can comment" ON public.comments;
    CREATE POLICY "Authenticated users can comment"
      ON public.comments FOR INSERT WITH CHECK (auth.uid() = author_id);`,
  },
  {
    name: "RLS: likes — public read",
    sql: `DROP POLICY IF EXISTS "Likes are viewable by everyone" ON public.likes;
    CREATE POLICY "Likes are viewable by everyone"
      ON public.likes FOR SELECT USING (TRUE);`,
  },
  {
    name: "RLS: likes — auth manage",
    sql: `DROP POLICY IF EXISTS "Users can manage own likes" ON public.likes;
    CREATE POLICY "Users can manage own likes"
      ON public.likes FOR ALL USING (auth.uid() = user_id);`,
  },
  {
    name: "Auto-create profile on signup",
    sql: `CREATE OR REPLACE FUNCTION public.handle_new_user()
    RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
    BEGIN
      INSERT INTO public.profiles (id, full_name, avatar_url)
      VALUES (
        NEW.id,
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'avatar_url'
      );
      RETURN NEW;
    END;
    $$;`,
  },
  {
    name: "Trigger: new user → profile",
    sql: `DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();`,
  },
  {
    name: "Function: update likes count",
    sql: `CREATE OR REPLACE FUNCTION update_likes_count()
    RETURNS TRIGGER LANGUAGE plpgsql AS $$
    BEGIN
      IF TG_OP = 'INSERT' THEN
        UPDATE public.reports SET likes_count = likes_count + 1 WHERE id = NEW.report_id;
      ELSIF TG_OP = 'DELETE' THEN
        UPDATE public.reports SET likes_count = GREATEST(0, likes_count - 1) WHERE id = OLD.report_id;
      END IF;
      RETURN NULL;
    END;
    $$;`,
  },
  {
    name: "Trigger: likes count",
    sql: `DROP TRIGGER IF EXISTS on_like_change ON public.likes;
    CREATE TRIGGER on_like_change
      AFTER INSERT OR DELETE ON public.likes
      FOR EACH ROW EXECUTE PROCEDURE update_likes_count();`,
  },
  {
    name: "Function: update comments count",
    sql: `CREATE OR REPLACE FUNCTION update_comments_count()
    RETURNS TRIGGER LANGUAGE plpgsql AS $$
    BEGIN
      IF TG_OP = 'INSERT' THEN
        UPDATE public.reports SET comments_count = comments_count + 1 WHERE id = NEW.report_id;
      ELSIF TG_OP = 'DELETE' THEN
        UPDATE public.reports SET comments_count = GREATEST(0, comments_count - 1) WHERE id = OLD.report_id;
      END IF;
      RETURN NULL;
    END;
    $$;`,
  },
  {
    name: "Trigger: comments count",
    sql: `DROP TRIGGER IF EXISTS on_comment_change ON public.comments;
    CREATE TRIGGER on_comment_change
      AFTER INSERT OR DELETE ON public.comments
      FOR EACH ROW EXECUTE PROCEDURE update_comments_count();`,
  },
  {
    name: "Storage bucket: report-images",
    sql: `INSERT INTO storage.buckets (id, name, public)
    VALUES ('report-images', 'report-images', TRUE)
    ON CONFLICT (id) DO NOTHING;`,
  },
  {
    name: "Storage policy: public read",
    sql: `DROP POLICY IF EXISTS "Report images are publicly accessible" ON storage.objects;
    CREATE POLICY "Report images are publicly accessible"
      ON storage.objects FOR SELECT USING (bucket_id = 'report-images');`,
  },
  {
    name: "Storage policy: auth upload",
    sql: `DROP POLICY IF EXISTS "Authenticated users can upload report images" ON storage.objects;
    CREATE POLICY "Authenticated users can upload report images"
      ON storage.objects FOR INSERT WITH CHECK (
        bucket_id = 'report-images' AND auth.role() = 'authenticated'
      );`,
  },
];

console.log("🚀 Configurando base de datos VecinoActúa en Supabase...\n");

let ok = 0;
let errors = 0;

for (const step of steps) {
  process.stdout.write(`  ⏳ ${step.name}...`);
  try {
    const result = await runSQL(step.sql);
    if (result?.message) {
      console.log(` ❌\n     ${result.message}`);
      errors++;
    } else {
      console.log(` ✅`);
      ok++;
    }
  } catch (e) {
    console.log(` ❌ ${e.message}`);
    errors++;
  }
}

console.log(`\n✅ ${ok} pasos exitosos   ❌ ${errors} errores`);
