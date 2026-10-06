// AtlasQuest × Supabase configuration.
// Fill these two values from: Supabase Dashboard → Project Settings → API
//   SUPABASE_URL  = "Project URL"
//   SUPABASE_ANON_KEY = "anon public" key (safe to ship — access is governed by RLS)
//
// Leave empty to run fully offline (everything still works; cloud features hide).

export const SUPABASE_URL = "https://rfibbbesxrskqvjtjdzt.supabase.co";
export const SUPABASE_ANON_KEY = "sb_publishable_4C1QqwkytEAPGou_XOyx5A_jOeFI7GS";

export const cloudEnabled = () => Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
