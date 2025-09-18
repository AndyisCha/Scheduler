// Auth store using Zustand
import { create } from 'zustand'
import type { User } from '@supabase/supabase-js'
import { isSupabaseConfigured, supabase } from '../lib/supabase'

/** ---- Helpers: error mapping & small utils ---- */
function mapSupabaseAuthError(raw?: string) {
  const m = (raw || '').toLowerCase()

  if (m.includes('invalid login')) return '이메일 또는 비밀번호가 올바르지 않아요.'
  if (m.includes('confirm')) return '이메일 인증이 필요해요. 받은메일함을 확인해 주세요.'
  if (m.includes('disabled')) return '이메일/비밀번호 로그인이 비활성화돼 있어요. Supabase Providers 설정을 확인하세요.'
  if (m.includes('origin')) return '허용되지 않은 출처입니다. URL 설정(CORS/Redirect)에 http://localhost:5173 추가하세요.'
  if (m.includes('api key')) return '환경변수(URL/anon key) 확인 후 개발 서버를 재시작하세요.'
  return `로그인 실패: ${raw || '알 수 없는 오류'}`
}

export interface Profile {
  id: string
  role: 'ADMIN' | 'SUPER_ADMIN'
  display_name: string
}

interface AuthState {
  user: User | null
  profile: Profile | null
  isLoading: boolean
  isInitialized: boolean
  status: 'disabled' | 'ready' | 'initializing'
  statusReason?: string

  // Actions
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  signOut: () => Promise<void>
  initialize: () => Promise<void>
  loadProfile: (userId: string) => Promise<void>
  createDefaultProfile: (userId: string) => Promise<void>
  setLoading: (loading: boolean) => void
  recheckEnv: () => void
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  profile: null,
  isLoading: false,
  isInitialized: false,
  status: 'initializing',
  statusReason: undefined,

  /** 로그인 */
  signIn: async (email: string, password: string) => {
    if (!isSupabaseConfigured()) {
      return { success: false, error: 'Supabase가 구성되지 않았습니다. 환경 변수를 확인해주세요.' }
    }

    try {
      set({ isLoading: true })

      const { data, error } = await supabase.auth.signInWithPassword({ email, password })

      if (error) {
        // 개발 모드에서 원문 메시지 로깅
        if (import.meta.env.DEV) {
          console.error('[AUTH] signIn 400 body:', error, error?.message)
        }
        const hint = mapSupabaseAuthError(error.message)
        return { success: false, error: hint }
      }

      if (data.user) {
        set({ user: data.user })
        await get().loadProfile(data.user.id)
        return { success: true }
      }

      return { success: false, error: '로그인에 실패했습니다.' }
    } catch (err: any) {
      if (import.meta.env.DEV) {
        console.error('[AUTH] signIn exception:', err)
      }
      const hint = mapSupabaseAuthError(err?.message)
      return { success: false, error: hint }
    } finally {
      set({ isLoading: false })
    }
  },

  /** 로그아웃 */
  signOut: async () => {
    if (!isSupabaseConfigured()) {
      set({ user: null, profile: null, isLoading: false })
      return
    }
    try {
      set({ isLoading: true })
      await supabase.auth.signOut()
      set({ user: null, profile: null })
    } catch (error) {
      console.error('Sign out error:', error)
    } finally {
      set({ isLoading: false })
    }
  },

  /** 초기화(앱 시작 시 1회) */
  initialize: async () => {
    try {
      set({ isLoading: true, status: 'initializing' })

      const configured = isSupabaseConfigured()
      if (!configured) {
        if (import.meta.env.DEV) {
          console.warn('Supabase is not configured. Auth initialization skipped.')
        }
        set({
          isInitialized: true,
          isLoading: false,
          status: 'disabled',
          statusReason: 'ENV_MISSING',
        })
        return
      }

      // 현재 세션 조회
      const { data: { session }, error } = await supabase.auth.getSession()

      if (error) {
        if (import.meta.env.DEV) console.error('Session error:', error)
        set({
          isInitialized: true,
          isLoading: false,
          status: 'ready',
          statusReason: undefined,
        })
        return
      }

      if (session?.user) {
        set({ user: session.user })
        await get().loadProfile(session.user.id)
      }

      set({ status: 'ready', statusReason: undefined })
    } catch (error) {
      console.error('Auth initialization error:', error)
      set({ status: 'ready', statusReason: undefined })
    } finally {
      set({ isInitialized: true, isLoading: false })
    }
  },

  /** 프로필 로드 (없으면 기본 프로필 생성) */
  loadProfile: async (userId: string) => {
    if (!isSupabaseConfigured()) {
      if (import.meta.env.DEV) console.warn('Supabase is not configured. Profile loading skipped.')
      return
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) {
        if (import.meta.env.DEV) console.error('Profile load error:', error)
        // If profile doesn't exist, create a default one
        if (error.code === 'PGRST116') {
          await get().createDefaultProfile(userId)
        }
        return
      }

      set({ profile: data })
    } catch (error) {
      console.error('Profile loading error:', error)
    }
  },

  /** 기본 프로필 생성 */
  createDefaultProfile: async (userId: string) => {
    if (!isSupabaseConfigured()) {
      if (import.meta.env.DEV) console.warn('Supabase is not configured. Default profile creation skipped.')
      return
    }

    try {
      // Get current user info from auth state instead of calling getUser()
      const currentUser = get().user

      const defaultProfile: Omit<Profile, 'id'> = {
        display_name: currentUser?.email?.split('@')[0] || 'User',
        role: 'ADMIN'
      }

      const { data, error } = await supabase
        .from('profiles')
        .insert({ ...defaultProfile, id: userId })
        .select()
        .single()

      if (error) {
        console.error('Default profile creation error:', error)
        console.error('Error details:', JSON.stringify(error, null, 2))
        return
      }

      set({ profile: data })
    } catch (error) {
      console.error('Default profile creation error:', error)
    }
  },

  /** 로딩 상태 핸들러 */
  setLoading: (loading: boolean) => {
    set({ isLoading: loading })
  },

  /** 환경변수 재검사(DEV 진단용) */
  recheckEnv: () => {
    const configured = isSupabaseConfigured()
    if (import.meta.env.DEV) {
      const urlMask = (import.meta.env.VITE_SUPABASE_URL || '').slice(0, 12) + '...'
      const keyMask = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').slice(0, 6) + '...'
      console.log('Environment recheck:', { URL: urlMask, KEY: keyMask, configured })
    }

    if (configured) {
      set({ status: 'ready', statusReason: undefined })
      if (!get().user) {
        // env가 채워진 뒤에도 로그인 상태가 없으면 초기화 재시도
        get().initialize()
      }
    } else {
      set({ status: 'disabled', statusReason: 'ENV_MISSING' })
    }
  },
}))
