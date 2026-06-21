import { createContext, useContext, useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import type { User } from "@supabase/supabase-js"
import type { Profile, UnitKerja, Pesantren } from "@/types/auth"

interface AuthContext {
  user: User | null
  profile: Profile | null
  pesantren: Pesantren | null
  unitKerja: UnitKerja | null
  loading: boolean
  signOut: () => Promise<void>
}

const Ctx = createContext<AuthContext>({
  user: null, profile: null, pesantren: null,
  unitKerja: null, loading: true,
  signOut: async () => {},
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser]           = useState<User | null>(null)
  const [profile, setProfile]     = useState<Profile | null>(null)
  const [pesantren, setPesantren] = useState<Pesantren | null>(null)
  const [unitKerja, setUnitKerja] = useState<UnitKerja | null>(null)
  const [loading, setLoading]     = useState(true)

  async function loadProfile(userId: string) {
  try {
    setLoading(true)

    const { data: prof } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single()

    if (!prof) {
      setProfile(null)
      return
    }

    setProfile(prof)

    if (prof.pesantren_id && prof.role !== "SUPERADMIN_PLATFORM") {
      const { data: pt } = await supabase
        .from("pesantren")
        .select("*")
        .eq("id", prof.pesantren_id)
        .single()

      setPesantren(pt)
    }

    if (prof.unit_kerja_id && prof.role === "ADMIN_UNIT") {
      const { data: uk } = await supabase
        .from("unit_kerja")
        .select("*")
        .eq("id", prof.unit_kerja_id)
        .single()

      setUnitKerja(uk)
    }
  } finally {
    setLoading(false)
  }
}

  useEffect(() => {
    // Cek session saat pertama load
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) loadProfile(session.user.id)
      else setLoading(false)
    })

    // Listen perubahan auth state
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        loadProfile(session.user.id)
      } else {
        setProfile(null);
        setPesantren(null);
        setUnitKerja(null)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function signOut() {
    await supabase.auth.signOut()
  }

  return (
    <Ctx.Provider value={{ user, profile, pesantren, unitKerja, loading, signOut }}>
      {children}
    </Ctx.Provider>
  )
}

export const useAuth = () => useContext(Ctx)
