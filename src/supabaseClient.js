import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Hiányzik a Supabase URL vagy a publishable key az .env fájlból.");
}

export const supabase = createClient(supabaseUrl, supabaseKey);
