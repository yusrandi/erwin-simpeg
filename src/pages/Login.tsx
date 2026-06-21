import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Building2, Eye, EyeOff, LogIn } from "lucide-react"

export default function Login() {
  const navigate = useNavigate()
  const [email, setEmail]           = useState("")
  const [password, setPassword]     = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError]           = useState("")
  const [loading, setLoading]       = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)

    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email, password
    })

    if (authError || !data.user) {
      setError("Email atau password salah.")
      setLoading(false)
      return
    }

    // Cek profile & role untuk redirect yang sesuai
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", data.user.id)
      .single()

    setLoading(false)

    if (!profile) { setError("Akun belum dikonfigurasi. Hubungi administrator."); return }

    if (profile.role === "SUPERADMIN_PLATFORM") navigate("/platform", { replace: true })
    else navigate("/dashboard", { replace: true })
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="w-12 h-12 bg-foreground rounded-xl flex items-center justify-center">
            <Building2 className="w-6 h-6 text-background" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">SIMPEG</h1>
            <p className="text-sm text-muted-foreground">Sistem Informasi Pesantren</p>
          </div>
        </div>

        <Card className="border">
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Masuk ke Dashboard</CardTitle>
            <CardDescription>Gunakan email & password akun Anda</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@pesantren.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    autoComplete="current-password"
                    required
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">
                  {error}
                </p>
              )}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-background/30 border-t-background rounded-full animate-spin" />
                    Memproses...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <LogIn className="w-4 h-4" /> Masuk
                  </span>
                )}
              </Button>

              <p className="text-center text-sm text-muted-foreground">
                Belum punya akun?{" "}
                <a href="/register" className="text-foreground font-medium underline underline-offset-4">
                  Daftar pesantren
                </a>
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
