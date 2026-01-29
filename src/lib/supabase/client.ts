import { supabase } from '../supabase'
import type { SupabaseClient } from '@supabase/supabase-js'

// Minimal wrapper for backward compatibility with imports that expect
// `@/lib/supabase/client` and a `createClient()` factory.
export function createClient(): SupabaseClient {
  return supabase
}
