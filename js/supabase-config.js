// AtlasQuest × Supabase configuration.
// Fill these two values from: Supabase Dashboard → Project Settings → API
//   SUPABASE_URL  = "Project URL"
//   SUPABASE_ANON_KEY = "anon public" key (safe to ship — access is governed by RLS)
//
// Leave empty to run fully offline (everything still works; cloud features hide).

export const SUPABASE_URL = "";
export const SUPABASE_ANON_KEY = "";

export const cloudEnabled = () => Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
