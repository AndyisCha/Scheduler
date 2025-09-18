// Supabase client configuration
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

export function isSupabaseConfigured(): boolean {
  const url = import.meta.env.VITE_SUPABASE_URL
  const anon = import.meta.env.VITE_SUPABASE_ANON_KEY
  return Boolean(url && anon)
}

let client: SupabaseClient | null = null

function getClient(): SupabaseClient | null {
  if (!isSupabaseConfigured()) {
    return null
  }
  
  if (!client) {
    const url = import.meta.env.VITE_SUPABASE_URL
    const anon = import.meta.env.VITE_SUPABASE_ANON_KEY
    client = createClient(url!, anon!, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true
      }
    })
  }
  
  return client
}

export const supabase = new Proxy({} as SupabaseClient, {
  get(_, prop) {
    const client = getClient()
    if (!client) {
      throw new Error('Supabase is not configured. Please check your environment variables.')
    }
    // @ts-ignore
    return client[prop]
  }
})

export function ensureSupabaseConfigured() {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase is not configured. Please check your environment variables.')
  }
}

export function getSupabaseClient() {
  const client = getClient()
  if (!client) {
    throw new Error('Supabase is not configured. Please check your environment variables.')
  }
  return client
}