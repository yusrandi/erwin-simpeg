import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Pencil, Trash2, RefreshCw } from "lucide-react"
import type { UnitPos } from "@/types/pembayaran"
import type { Profile } from "@/types/auth"

interface Props { unitKerjaId: string; pesantrenId: string }
const emptyForm = () => ({ nama: "", kasir_id: "", aktif: true })

export default function TabUnitPos({ unitKerjaId, pesantrenId }: Props) {
  const { toast } = useToast()
  const [data, setData] = useState<UnitPos[]>([])
  const [kasirList, setKasirList] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [openForm, setOpenForm] = useState(false)
  const [editTarget, setEditTarget] = useState<UnitPos | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<UnitPos | null>(null)
  const [form, setForm] = useState(emptyForm())

  async function fetchKasir() {
    // Ambil semua user di pesantren ini
    const { data: rows } = await supabase
      .from("profiles").select("*")
      .eq("pesantren_id", pesantrenId)
    setKasirList(rows ?? [])
  }

  async function fetchData() {
    setLoading(true)
    const { data: rows } = await supabase
      .from("unit_pos").select("*")
      .eq("unit_kerja_id", unitKerjaId).order("nama")
    setData(rows ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchKasir(); fetchData() }, [unitKerjaId])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)

    const payload = {
      nama: form.nama,
      kasir_id: form.kasir_id || null,
      aktif: form.aktif,
    }

    if (editTarget) {
      const { error } = await supabase.from("unit_pos").update(payload).eq("id", editTarget.id)
      if (error) { toast({ title: "Gagal menyimpan", description: error.message, variant: "destructive" }); setSaving(false); return }
      toast({ title: "Unit POS diperbarui" })
    } else {
      const { error } = await supabase.from("unit_pos")
        .insert({ ...payload, unit_kerja_id: unitKerjaId, pesantren_id: pesantrenId })
      if (error) { toast({ title: "Gagal menyimpan", description: error.message, variant: "destructive" }); setSaving(false); return }
      toast({ title: "Unit POS ditambahkan" })
    }

    setSaving(false); setOpenForm(false); setEditTarget(null); setForm(emptyForm()); fetchData()
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setSaving(true)
    const { error } = await supabase.from("unit_pos").delete().eq("id", deleteTarget.id)
    setSaving(false)
    if (error) { toast({ title: "Gagal menghapus", variant: "destructive" }); setDeleteTarget(null); return }
    toast({ title: "Unit POS dihapus" })
    setDeleteTarget(null); fetchData()
  }

  async function toggleAktif(p: UnitPos) {
    await supabase.from("unit_pos").update({ aktif: !p.aktif }).eq("id", p.id)
    fetchData()
  }

  const kasirMap = new Map(kasirList.map(k => [k.id, k.nama]))

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium text-foreground">Unit POS</p>
          <p className="text-xs text-muted-foreground mt-0.5">Point of Sale — kasir per loket pembayaran</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
          <Button size="sm" onClick={() => { setEditTarget(null); setForm(emptyForm()); setOpenForm(true) }}>
            <Plus className="w-4 h-4 mr-2" /> Tambah
          </Button>
        </div>
      </div>

      <div className="rounded-xl border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Nama POS</TableHead>
              <TableHead>Kasir</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={4} className="text-center py-10">
                <div className="flex items-center justify-center gap-2 text-muted-foreground">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-foreground" /> Memuat...
                </div>
              </TableCell></TableRow>
            ) : data.length === 0 ? (
              <TableRow><TableCell colSpan={4} className="text-center py-10 text-muted-foreground">
                Belum ada unit POS
              </TableCell></TableRow>
            ) : data.map(p => (
              <TableRow key={p.id}>
                <TableCell className="font-medium text-sm">{p.nama}</TableCell>
                <TableCell className="text-sm">{p.kasir_id ? kasirMap.get(p.kasir_id) ?? "-" : <span className="text-muted-foreground italic">Belum ditugaskan</span>}</TableCell>
                <TableCell>
                  <button onClick={() => toggleAktif(p)}>
                    <Badge variant={p.aktif ? "success" : "secondary"} className="text-xs cursor-pointer">
                      {p.aktif ? "Aktif" : "Non Aktif"}
                    </Badge>
                  </button>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex gap-1 justify-end">
                    <Button size="icon" variant="ghost" className="h-7 w-7"
                      onClick={() => { setEditTarget(p); setForm({ nama: p.nama, kasir_id: p.kasir_id ?? "", aktif: p.aktif }); setOpenForm(true) }}>
                      <Pencil className="w-3.5 h-3.5 text-blue-500" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setDeleteTarget(p)}>
                      <Trash2 className="w-3.5 h-3.5 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={openForm} onOpenChange={open => { if (!open) { setOpenForm(false); setEditTarget(null) } }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editTarget ? "Edit Unit POS" : "Tambah Unit POS"}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Nama POS *</Label>
              <Input value={form.nama} onChange={e => setForm(p => ({ ...p, nama: e.target.value }))}
                placeholder="Kasir 1 / Loket SPP" required />
            </div>
            <div className="space-y-2">
              <Label>Kasir (Opsional)</Label>
              <Select value={form.kasir_id} onValueChange={v => setForm(p => ({ ...p, kasir_id: v === "none" ? "" : v }))}>
                <SelectTrigger><SelectValue placeholder="-- Pilih kasir --" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Belum ditugaskan</SelectItem>
                  {kasirList.map(k => (
                    <SelectItem key={k.id} value={k.id}>{k.nama}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-3 pt-1">
              <Button type="submit" disabled={saving} className="flex-1">
                {saving ? "Menyimpan..." : editTarget ? "Simpan Perubahan" : "Tambah"}
              </Button>
              <Button type="button" variant="outline" onClick={() => { setOpenForm(false); setEditTarget(null) }}>Batal</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteTarget} onOpenChange={open => !open && setDeleteTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Hapus Unit POS</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Hapus unit POS <strong>{deleteTarget?.nama}</strong>?</p>
          <div className="flex gap-3 pt-2">
            <Button variant="destructive" className="flex-1" onClick={handleDelete} disabled={saving}>
              {saving ? "Menghapus..." : "Ya, Hapus"}
            </Button>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Batal</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
