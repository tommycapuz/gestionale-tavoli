import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabasePublishableKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

if (!supabaseUrl || !supabasePublishableKey) {
  throw new Error(
    'Configurazione Supabase mancante. Controlla VITE_SUPABASE_URL ' +
      'e VITE_SUPABASE_PUBLISHABLE_KEY nel file .env.local, ' +
      'poi riavvia il server di sviluppo.',
  )
}

export const supabase = createClient(
  supabaseUrl,
  supabasePublishableKey,
)