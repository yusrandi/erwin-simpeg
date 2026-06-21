import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Building2, ArrowLeft, CheckCircle } from "lucide-react"

interface FormData {
  // Data pesantren
  nama_pesantren: string
  kode_pesantren: string
  alamat: string
  telepon: string
  email_pesantren: string
  // Data akun superadmin pesantren
  nama_admin: string
  email_admin: string
  password_admin: string
  konfirmasi_password: string
}

const empty: FormData = {
  nama_pesantren: "",
  kode_pesantren: "",
  alamat: "",
  telepon: "",
  email_pesantren: "",
  nama_admin: "",
  email_admin: "",
  password_admin: "",
  konfirmasi_password: "",
}

export default function Register() {
  const navigate = useNavigate()
  const [form, setForm] = useState<FormData>(empty)
  const [step, setStep] = useState<1 | 2>(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)

  const set = (key: keyof FormData, val: string) =>
    setForm(p => ({ ...p, [key]: val }))

  function validateStep1() {
    if (!form.nama_pesantren || !form.kode_pesantren || !form.email_pesantren) {
      setError("Nama, kode, dan email pesantren wajib diisi.")
      return false
    }
    if (!/^[A-Z0-9_]+$/.test(form.kode_pesantren.toUpperCase())) {
      setError("Kode pesantren hanya boleh huruf, angka, dan underscore.")
      return false
    }
    setError("")
    return true
  }

  function validateStep2() {
    if (!form.nama_admin || !form.email_admin || !form.password_admin) {
      setError("Semua field akun admin wajib diisi.")
      return false
    }
    if (form.password_admin.length < 8) {
      setError("Password minimal 8 karakter.")
      return false
    }
    if (form.password_admin !== form.konfirmasi_password) {
      setError("Password dan konfirmasi password tidak cocok.")
      return false
    }
    setError("")
    return true
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validateStep2()) return
    setLoading(true)
    setError("")

    try {
      // 1. Daftarkan user ke Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: form.email_admin,
        password: form.password_admin,
      })
      if (authError || !authData.user) throw new Error(authError?.message ?? "Gagal membuat akun")

      // 2. Insert pesantren (status PENDING)
      const { data: pesantren, error: ptError } = await supabase
        .from("pesantren")
        .insert({
          nama: form.nama_pesantren,
          kode: form.kode_pesantren.toUpperCase(),
          alamat: form.alamat || null,
          telepon: form.telepon || null,
          email: form.email_pesantren,
          status: "PENDING",
        })
        .select()
        .single()
      if (ptError) throw new Error(ptError.message)

      // 3. Insert profile superadmin pesantren
      const { error: profileError } = await supabase
        .from("profiles")
        .insert({
          id: authData.user.id,
          pesantren_id: pesantren.id,
          unit_kerja_id: null,
          nama: form.nama_admin,
          role: "SUPERADMIN_PESANTREN",
        })
      if (profileError) throw new Error(profileError.message)

      setSuccess(true)
    } catch (err: any) {
      setError(err.message ?? "Terjadi kesalahan, coba lagi.")
    }
    setLoading(false)
  }

  // ── Sukses ──
  if (success) return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm text-center space-y-4">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
          <CheckCircle className="w-8 h-8 text-green-600" />
        </div>
        <h1 className="text-xl font-bold text-foreground">Pendaftaran Terkirim!</h1>
        <p className="text-sm text-muted-foreground">
          Pendaftaran pesantren <strong>{form.nama_pesantren}</strong> sedang menunggu persetujuan
          dari superadmin platform. Kami akan menghubungi Anda melalui email{" "}
          <strong>{form.email_pesantren}</strong>.
        </p>
        <Button className="w-full" onClick={() => navigate("/login")}>
          Kembali ke Login
        </Button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-lg space-y-6">
        {/* Header */}
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="w-12 h-12 bg-foreground rounded-xl flex items-center justify-center">
            <Building2 className="w-6 h-6 text-background" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Daftar Pesantren</h1>
            <p className="text-sm text-muted-foreground">Lengkapi data untuk mendaftarkan pesantren Anda</p>
          </div>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-3">
          {[
            { n: 1, label: "Data Pesantren" },
            { n: 2, label: "Akun Admin" },
          ].map(({ n, label }) => (
            <div key={n} className="flex-1 flex items-center gap-2">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-colors ${
                step >= n ? "bg-foreground text-background" : "bg-muted text-muted-foreground"
              }`}>
                {n}
              </div>
              <span className={`text-sm font-medium ${step >= n ? "text-foreground" : "text-muted-foreground"}`}>
                {label}
              </span>
              {n < 2 && <div className={`flex-1 h-px ${step > n ? "bg-foreground" : "bg-border"}`} />}
            </div>
          ))}
        </div>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base">
              {step === 1 ? "Data Pesantren" : "Akun Superadmin Pesantren"}
            </CardTitle>
            <CardDescription>
              {step === 1
                ? "Informasi umum pesantren Anda"
                : "Akun ini akan digunakan untuk mengelola seluruh data pesantren"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={step === 1 ? (e) => { e.preventDefault(); if (validateStep1()) setStep(2) } : handleSubmit}
              className="space-y-4">

              {step === 1 ? (
                <>
                  <div className="space-y-2">
                    <Label>Nama Pesantren *</Label>
                    <Input value={form.nama_pesantren}
                      onChange={e => set("nama_pesantren", e.target.value)}
                      placeholder="Pondok Pesantren Al-Hikmah" required />
                  </div>
                  <div className="space-y-2">
                    <Label>Kode Pesantren *</Label>
                    <Input value={form.kode_pesantren}
                      onChange={e => set("kode_pesantren", e.target.value.toUpperCase())}
                      placeholder="ALHIKMAH" maxLength={20} required />
                    <p className="text-xs text-muted-foreground">
                      Huruf kapital, angka, underscore. Contoh: ALHIKMAH, PP_DARUL_ULUM
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label>Email Pesantren *</Label>
                    <Input type="email" value={form.email_pesantren}
                      onChange={e => set("email_pesantren", e.target.value)}
                      placeholder="info@pesantren.com" required />
                  </div>
                  <div className="space-y-2">
                    <Label>Alamat</Label>
                    <Input value={form.alamat}
                      onChange={e => set("alamat", e.target.value)}
                      placeholder="Jl. Raya Pesantren No. 1" />
                  </div>
                  <div className="space-y-2">
                    <Label>Telepon</Label>
                    <Input value={form.telepon}
                      onChange={e => set("telepon", e.target.value)}
                      placeholder="0812xxxxxxxx" />
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label>Nama Admin *</Label>
                    <Input value={form.nama_admin}
                      onChange={e => set("nama_admin", e.target.value)}
                      placeholder="Ahmad Fauzi" required />
                  </div>
                  <div className="space-y-2">
                    <Label>Email Admin *</Label>
                    <Input type="email" value={form.email_admin}
                      onChange={e => set("email_admin", e.target.value)}
                      placeholder="admin@pesantren.com" required />
                    <p className="text-xs text-muted-foreground">
                      Email ini digunakan untuk login
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label>Password *</Label>
                    <Input type="password" value={form.password_admin}
                      onChange={e => set("password_admin", e.target.value)}
                      placeholder="Min. 8 karakter" required />
                  </div>
                  <div className="space-y-2">
                    <Label>Konfirmasi Password *</Label>
                    <Input type="password" value={form.konfirmasi_password}
                      onChange={e => set("konfirmasi_password", e.target.value)}
                      placeholder="Ulangi password" required />
                  </div>
                </>
              )}

              {error && (
                <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">
                  {error}
                </p>
              )}

              <div className="flex gap-3 pt-1">
                {step === 2 && (
                  <Button type="button" variant="outline" onClick={() => { setStep(1); setError("") }}>
                    <ArrowLeft className="w-4 h-4 mr-1" /> Kembali
                  </Button>
                )}
                <Button type="submit" className="flex-1" disabled={loading}>
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-background/30 border-t-background rounded-full animate-spin" />
                      Memproses...
                    </span>
                  ) : step === 1 ? "Lanjut →" : "Daftar Sekarang"}
                </Button>
              </div>

              {step === 1 && (
                <p className="text-center text-sm text-muted-foreground">
                  Sudah punya akun?{" "}
                  <a href="/login" className="text-foreground font-medium underline underline-offset-4">
                    Masuk
                  </a>
                </p>
              )}
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
