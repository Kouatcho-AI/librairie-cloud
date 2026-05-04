import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !anonKey) {
  console.error('⚠️  Variables Supabase manquantes. Vérifie ton fichier .env')
}

export const supabase = createClient(url, anonKey)
