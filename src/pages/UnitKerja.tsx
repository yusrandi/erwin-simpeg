import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/hooks/useAuth"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus, Pencil, Trash2, RefreshCw, Users } from "lucide-react"
import type { UnitKerja } from "@/types/auth"

const JENIS_UNIT = [
  "TK", "SD", "SMP", "SMA", "SMK", "MA",
  "STAI", "DINIYAH", "YAYASAN", "LAINNYA"
]

interface AdminUnit {
  id: string
  nama: string
  role: string
  unit_kerja_id: string
}

interface UnitWithAdmin extends UnitKerja {
  admins?: AdminUnit[]
}

interface UnitForm {
  nama: string
  jenis: string
  status: "AKTIF" | "NONAKTIF"
}

const emptyForm = (): UnitForm => ({ nama: "", jenis: "SD", status: "AKTIF" })

export default function UnitKerjaPage() {
  const { toast } = useToast()
  const { pesantren } = useAuth()
  const [data, setData] = useState<UnitWithAdmin[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Form state
  const [openForm, setOpenForm] = useState(false)
  const [editTarget, setEditTarget] = useState<UnitKerja | null>(null)
  const [form, setForm] = useState<UnitForm>(emptyForm())

  // Delete
  const [deleteTarget, setDeleteTarget] = useState<UnitKerja | null>(null)

  // Admin dialog
  const [openAdmin, setOpenAdmin] = useState(false)
  const [selectedUnit, setSelectedUnit] = useState<UnitWithAdmin | null>(null)
  const [adminForm, setAdminForm] = useState({ nama: "", email: "", password: "" })
  const [savingAdmin, setSavingAdmin] = useState(false)

  async function fetchData() {
    if (!pesantren?.id) return
    setLoading(true)

    const { data: units } = await supabase
      .from("unit_kerja")
      .select("*")
      .eq("pesantren_id", pesantren.id)
      .order("nama")

    // Fetch admin per unit
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, nama, role, unit_kerja_id")
      .eq("pesantren_id", pesantren.id)
      .eq("role", "ADMIN_UNIT")

    const withAdmin: UnitWithAdmin[] = (units ?? []).map(u => ({
      ...u,
      admins: (profiles ?? []).filter(p => p.unit_kerja_id === u.id),
    }))

    setData(withAdmin)
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [pesantren?.id])

  // ── CRUD Unit ──
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!pesantren?.id) return
    setSaving(true)

    if (editTarget) {
      const { error } = await supabase
        .from("unit_kerja")
        .update({ nama: form.nama, jenis: form.jenis, status: form.status })
        .eq("id", editTarget.id)
      if (error) {
        toast({ title: "Gagal menyimpan", description: error.message, variant: "destructive" })
        setSaving(false); return
      }
      toast({ title: "Unit kerja diperbarui" })
    } else {
      const { error } = await supabase
        .from("unit_kerja")
        .insert({ nama: form.nama, jenis: form.jenis, status: form.status, pesantren_id: pesantren.id })
      if (error) {
        toast({ title: "Gagal menyimpan", description: error.message, variant: "destructive" })
        setSaving(false); return
      }
      toast({ title: "Unit kerja ditambahkan" })
    }

    setSaving(false)
    closeForm()
    fetchData()
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setSaving(true)
    const { error } = await supabase.from("unit_kerja").delete().eq("id", deleteTarget.id)
    setSaving(false)
    if (error) {
      toast({ title: "Gagal menghapus", description: "Unit mungkin masih memiliki data pegawai.", variant: "destructive" })
      setDeleteTarget(null); return
    }
    toast({ title: "Unit kerja dihapus" })
    setDeleteTarget(null)
    fetchData()
  }

  function openEdit(u: UnitKerja) {
    setEditTarget(u)
    setForm({ nama: u.nama, jenis: u.jenis, status: u.status })
    setOpenForm(true)
  }

  function closeForm() {
    setOpenForm(false)
    setEditTarget(null)
    setForm(emptyForm())
  }

  // ── Admin Unit ──
  async function handleSaveAdmin(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedUnit || !pesantren?.id) return
    if (adminForm.password.length < 8) {
      toast({ title: "Password minimal 8 karakter", variant: "destructive" }); return
    }
    setSavingAdmin(true)

    // Buat user auth — perlu service role key, pakai signUp biasa
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: adminForm.email,
      password: adminForm.password,
    })

    if (authError || !authData.user) {
      toast({ title: "Gagal membuat akun", description: authError?.message, variant: "destructive" })
      setSavingAdmin(false); return
    }

    const { error: profileError } = await supabase.from("profiles").insert({
      id: authData.user.id,
      pesantren_id: pesantren.id,
      unit_kerja_id: selectedUnit.id,
      nama: adminForm.nama,
      role: "ADMIN_UNIT",
    })

    if (profileError) {
      toast({ title: "Akun dibuat tapi profil gagal", description: profileError.message, variant: "destructive" })
      setSavingAdmin(false); return
    }

    toast({ title: `Admin ${adminForm.nama} berhasil ditambahkan` })
    setAdminForm({ nama: "", email: "", password: "" })
    setSavingAdmin(false)
    fetchData()
  }

  async function handleDeleteAdmin(adminId: string) {
    if (!confirm("Hapus admin ini?")) return
    await supabase.from("profiles").delete().eq("id", adminId)
    toast({ title: "Admin dihapus" })
    fetchData()
    // Refresh selectedUnit
    if (selectedUnit) {
      setSelectedUnit(prev => prev ? {
        ...prev,
        admins: prev.admins?.filter(a => a.id !== adminId)
      } : null)
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Unit Kerja</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Kelola unit-unit di {pesantren?.nama}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
          <Button size="sm" onClick={() => { closeForm(); setOpenForm(true) }}>
            <Plus className="w-4 h-4 mr-2" /> Tambah Unit
          </Button>
        </div>
      </div>

      {/* Tabel */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Nama Unit</TableHead>
              <TableHead>Jenis</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Admin</TableHead>
              <TableHead>Dibuat</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12">
                  <div className="flex items-center justify-center gap-2 text-muted-foreground">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-foreground" />
                    Memuat...
                  </div>
                </TableCell>
              </TableRow>
            ) : data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                  Belum ada unit kerja
                </TableCell>
              </TableRow>
            ) : data.map(u => (
              <TableRow key={u.id}>
                <TableCell className="font-medium text-sm">{u.nama}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-xs">{u.jenis}</Badge>
                </TableCell>
                <TableCell>
                  <Badge
                    variant={u.status === "AKTIF" ? "success" : "secondary"}
                    className="text-xs"
                  >
                    {u.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <button
                    onClick={() => { setSelectedUnit(u); setOpenAdmin(true) }}
                    className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Users className="w-3.5 h-3.5" />
                    {u.admins?.length ?? 0} admin
                  </button>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {new Date(u.created_at).toLocaleDateString("id-ID", { dateStyle: "medium" })}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex gap-1 justify-end">
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(u)}>
                      <Pencil className="w-3.5 h-3.5 text-blue-500" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setDeleteTarget(u)}>
                      <Trash2 className="w-3.5 h-3.5 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* ── Form Dialog ── */}
      <Dialog open={openForm} onOpenChange={open => { if (!open) closeForm() }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editTarget ? "Edit Unit Kerja" : "Tambah Unit Kerja"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Nama Unit *</Label>
              <Input
                value={form.nama}
                onChange={e => setForm(p => ({ ...p, nama: e.target.value }))}
                placeholder="SD Al-Hikmah 1"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Jenis *</Label>
              <Select value={form.jenis} onValueChange={v => setForm(p => ({ ...p, jenis: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {JENIS_UNIT.map(j => <SelectItem key={j} value={j}>{j}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status *</Label>
              <Select value={form.status} onValueChange={v => setForm(p => ({ ...p, status: v as "AKTIF" | "NONAKTIF" }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="AKTIF">Aktif</SelectItem>
                  <SelectItem value="NONAKTIF">Non Aktif</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-3 pt-1">
              <Button type="submit" disabled={saving} className="flex-1">
                {saving ? "Menyimpan..." : editTarget ? "Simpan Perubahan" : "Tambah Unit"}
              </Button>
              <Button type="button" variant="outline" onClick={closeForm}>Batal</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Delete Dialog ── */}
      <Dialog open={!!deleteTarget} onOpenChange={open => !open && setDeleteTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Hapus Unit Kerja</DialogTitle>
            <DialogDescription>
              Hapus <strong>{deleteTarget?.nama}</strong>? Semua data pegawai dan akuntansi
              unit ini akan ikut terhapus.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 pt-2">
            <Button variant="destructive" className="flex-1" onClick={handleDelete} disabled={saving}>
              {saving ? "Menghapus..." : "Ya, Hapus"}
            </Button>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Batal</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Admin Dialog ── */}
      <Dialog open={openAdmin} onOpenChange={open => { if (!open) { setOpenAdmin(false); setSelectedUnit(null) } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Admin Unit — {selectedUnit?.nama}</DialogTitle>
            <DialogDescription>Kelola akun admin untuk unit ini</DialogDescription>
          </DialogHeader>

          {/* Form tambah admin */}
          <form onSubmit={handleSaveAdmin} className="space-y-3 pb-4 border-b">
            <p className="text-sm font-medium text-foreground">Tambah Admin Baru</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Nama *</Label>
                <Input
                  value={adminForm.nama}
                  onChange={e => setAdminForm(p => ({ ...p, nama: e.target.value }))}
                  placeholder="Nama lengkap"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Email *</Label>
                <Input
                  type="email"
                  value={adminForm.email}
                  onChange={e => setAdminForm(p => ({ ...p, email: e.target.value }))}
                  placeholder="admin@unit.com"
                  required
                />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label className="text-xs">Password *</Label>
                <Input
                  type="password"
                  value={adminForm.password}
                  onChange={e => setAdminForm(p => ({ ...p, password: e.target.value }))}
                  placeholder="Min. 8 karakter"
                  required
                />
              </div>
            </div>
            <Button type="submit" size="sm" disabled={savingAdmin}>
              <Plus className="w-3.5 h-3.5 mr-1" />
              {savingAdmin ? "Menyimpan..." : "Tambah Admin"}
            </Button>
          </form>

          {/* Daftar admin */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">
              Admin Terdaftar ({selectedUnit?.admins?.length ?? 0})
            </p>
            {!selectedUnit?.admins?.length ? (
              <p className="text-sm text-muted-foreground py-3 text-center">
                Belum ada admin untuk unit ini
              </p>
            ) : (
              <div className="space-y-2">
                {selectedUnit.admins?.map(a => (
                  <div key={a.id} className="flex items-center justify-between p-3 rounded-lg border bg-muted/20">
                    <div>
                      <p className="text-sm font-medium text-foreground">{a.nama}</p>
                      <p className="text-xs text-muted-foreground">Admin Unit</p>
                    </div>
                    <Button
                      size="icon" variant="ghost" className="h-7 w-7"
                      onClick={() => handleDeleteAdmin(a.id)}
                    >
                      <Trash2 className="w-3.5 h-3.5 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}