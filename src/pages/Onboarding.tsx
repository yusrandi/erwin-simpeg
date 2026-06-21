import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/hooks/useAuth"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Building2, Plus, Trash2, CheckCircle, ArrowRight } from "lucide-react"

const JENIS_UNIT = [
  "TK", "SD", "SMP", "SMA", "SMK", "MA",
  "STAI", "DINIYAH", "YAYASAN", "LAINNYA"
]

interface UnitForm {
  nama: string
  jenis: string
}

interface AdminForm {
  unit_index: number
  nama: string
  email: string
  password: string
}

export default function Onboarding() {
  const navigate = useNavigate()
  const {  pesantren } = useAuth()
  const { toast } = useToast()

  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [loading, setLoading] = useState(false)

  // Step 1 — Unit kerja
  const [units, setUnits] = useState<UnitForm[]>([{ nama: "", jenis: "SD" }])

  // Step 2 — Admin per unit (opsional)
  const [admins, setAdmins] = useState<AdminForm[]>([])
  const [createdUnits, setCreatedUnits] = useState<{ id: string; nama: string }[]>([])

  // ── Step 1: Simpan unit kerja ──
  async function handleSaveUnits(e: React.FormEvent) {
    e.preventDefault()
    if (units.some(u => !u.nama || !u.jenis)) {
      toast({ title: "Semua unit harus diisi", variant: "destructive" })
      return
    }
    setLoading(true)

    const { data, error } = await supabase
      .from("unit_kerja")
      .insert(units.map(u => ({
        pesantren_id: pesantren!.id,
        nama: u.nama,
        jenis: u.jenis,
        status: "AKTIF",
      })))
      .select("id, nama")

    setLoading(false)

    if (error) {
      toast({ title: "Gagal menyimpan unit", description: error.message, variant: "destructive" })
      return
    }

    setCreatedUnits(data ?? [])
    // Init admins kosong per unit
    setAdmins((data ?? []).map((_, i) => ({
      unit_index: i,
      nama: "",
      email: "",
      password: "",
    })))
    setStep(2)
  }

  // ── Step 2: Buat admin unit (opsional) ──
  async function handleSaveAdmins(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    // Filter admin yang diisi
    const filledAdmins = admins.filter(a => a.email && a.password && a.nama)

    for (const admin of filledAdmins) {
      // Buat user auth
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: admin.email,
        password: admin.password,
        email_confirm: true,
      })

      if (authError || !authData.user) {
        toast({
          title: `Gagal buat akun ${admin.email}`,
          description: authError?.message,
          variant: "destructive"
        })
        continue
      }

      // Buat profile
      await supabase.from("profiles").insert({
        id: authData.user.id,
        pesantren_id: pesantren!.id,
        unit_kerja_id: createdUnits[admin.unit_index].id,
        nama: admin.nama,
        role: "ADMIN_UNIT",
      })
    }

    setLoading(false)
    setStep(3)
  }

  function addUnit() {
    setUnits(p => [...p, { nama: "", jenis: "SD" }])
  }

  function removeUnit(i: number) {
    if (units.length <= 1) return
    setUnits(p => p.filter((_, idx) => idx !== i))
  }

  function setUnit(i: number, key: keyof UnitForm, val: string) {
    setUnits(p => p.map((u, idx) => idx === i ? { ...u, [key]: val } : u))
  }

  function setAdmin(i: number, key: keyof Omit<AdminForm, "unit_index">, val: string) {
    setAdmins(p => p.map((a, idx) => idx === i ? { ...a, [key]: val } : a))
  }

  // ── Step 3: Selesai ──
  if (step === 3) return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md text-center space-y-5">
        <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto">
          <CheckCircle className="w-8 h-8 text-green-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">Setup Selesai!</h1>
          <p className="text-sm text-muted-foreground mt-2">
            {createdUnits.length} unit kerja berhasil dibuat. Anda sudah bisa mulai menggunakan SIMPEG.
          </p>
        </div>
        <div className="text-left p-4 rounded-lg border bg-muted/30 space-y-1.5">
          <p className="text-sm font-medium text-foreground">Unit yang dibuat:</p>
          {createdUnits.map(u => (
            <div key={u.id} className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle className="w-3.5 h-3.5 text-green-600 shrink-0" />
              {u.nama}
            </div>
          ))}
        </div>
        <Button className="w-full" onClick={() => navigate("/", { replace: true })}>
          Masuk ke Dashboard <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-xl space-y-6">
        {/* Header */}
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="w-12 h-12 bg-foreground rounded-xl flex items-center justify-center">
            <Building2 className="w-6 h-6 text-background" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Setup {pesantren?.nama}</h1>
            <p className="text-sm text-muted-foreground">
              Langkah {step} dari 2 — {step === 1 ? "Buat Unit Kerja" : "Tambah Admin Unit"}
            </p>
          </div>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-3">
          {[
            { n: 1, label: "Unit Kerja" },
            { n: 2, label: "Admin Unit" },
          ].map(({ n, label }) => (
            <div key={n} className="flex-1 flex items-center gap-2">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
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

        {/* ── Step 1: Unit Kerja ── */}
        {step === 1 && (
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base">Buat Unit Kerja</CardTitle>
              <CardDescription>
                Tambahkan unit-unit yang ada di pesantren Anda (TK, SD, SMP, dll)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveUnits} className="space-y-4">
                <div className="space-y-3">
                  {units.map((u, i) => (
                    <div key={i} className="grid grid-cols-12 gap-2 items-center">
                      <div className="col-span-6 space-y-1">
                        {i === 0 && <Label className="text-xs">Nama Unit</Label>}
                        <Input
                          value={u.nama}
                          onChange={e => setUnit(i, "nama", e.target.value)}
                          placeholder="TK Al-Hikmah"
                          required
                        />
                      </div>
                      <div className="col-span-5 space-y-1">
                        {i === 0 && <Label className="text-xs">Jenis</Label>}
                        <Select value={u.jenis} onValueChange={v => setUnit(i, "jenis", v)}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {JENIS_UNIT.map(j => (
                              <SelectItem key={j} value={j}>{j}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className={`col-span-1 ${i === 0 ? "mt-5" : ""}`}>
                        <Button
                          type="button" size="icon" variant="ghost"
                          className="h-9 w-9"
                          onClick={() => removeUnit(i)}
                          disabled={units.length <= 1}
                        >
                          <Trash2 className="w-3.5 h-3.5 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                <Button type="button" variant="outline" size="sm" onClick={addUnit}>
                  <Plus className="w-3.5 h-3.5 mr-1" /> Tambah Unit
                </Button>

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-background/30 border-t-background rounded-full animate-spin" />
                      Menyimpan...
                    </span>
                  ) : "Simpan & Lanjut →"}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* ── Step 2: Admin Unit ── */}
        {step === 2 && (
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base">Tambah Admin Unit</CardTitle>
              <CardDescription>
                Buat akun login untuk masing-masing admin unit. Kosongkan jika belum perlu.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveAdmins} className="space-y-5">
                {createdUnits.map((unit, i) => (
                  <div key={unit.id} className="space-y-3 p-4 rounded-lg border bg-muted/20">
                    <p className="text-sm font-semibold text-foreground">{unit.nama}</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Nama Admin</Label>
                        <Input
                          value={admins[i]?.nama ?? ""}
                          onChange={e => setAdmin(i, "nama", e.target.value)}
                          placeholder="Nama lengkap"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Email</Label>
                        <Input
                          type="email"
                          value={admins[i]?.email ?? ""}
                          onChange={e => setAdmin(i, "email", e.target.value)}
                          placeholder="admin@unit.com"
                        />
                      </div>
                      <div className="col-span-2 space-y-1.5">
                        <Label className="text-xs">Password</Label>
                        <Input
                          type="password"
                          value={admins[i]?.password ?? ""}
                          onChange={e => setAdmin(i, "password", e.target.value)}
                          placeholder="Min. 8 karakter"
                        />
                      </div>
                    </div>
                  </div>
                ))}

                <div className="flex gap-3">
                  <Button
                    type="button" variant="outline"
                    onClick={() => handleSaveAdmins({ preventDefault: () => {} } as any)}
                    disabled={loading}
                  >
                    Lewati
                  </Button>
                  <Button type="submit" className="flex-1" disabled={loading}>
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <span className="w-4 h-4 border-2 border-background/30 border-t-background rounded-full animate-spin" />
                        Menyimpan...
                      </span>
                    ) : "Selesai Setup"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
