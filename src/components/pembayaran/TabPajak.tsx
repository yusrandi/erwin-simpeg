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
import type { Pajak } from "@/types/pembayaran"
import type { MasterAkun } from "@/types/keuangan"

interface Props { unitKerjaId: string; pesantrenId: string }
const emptyForm = () => ({ nama: "", persentase: 0, akun_kode: "", aktif: true })

export default function TabPajak({ unitKerjaId, pesantrenId }: Props) {
  const { toast } = useToast()
  const [data, setData] = useState<Pajak[]>([])
  const [akunList, setAkunList] = useState<MasterAkun[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [openForm, setOpenForm] = useState(false)
  const [editTarget, setEditTarget] = useState<Pajak | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Pajak | null>(null)
  const [form, setForm] = useState(emptyForm())

  async function fetchAkun() {
    const { data: rows } = await supabase
      .from("master_akun").select("*")
      .eq("unit_kerja_id", unitKerjaId)
      .eq("kelompok", "KEWAJIBAN")
      .order("kode")
    setAkunList(rows ?? [])
  }

  async function fetchData() {
    setLoading(true)
    const { data: rows } = await supabase
      .from("pajak").select("*")
      .eq("unit_kerja_id", unitKerjaId).order("nama")
    setData(rows ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchAkun(); fetchData() }, [unitKerjaId])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.akun_kode) { toast({ title: "Pilih akun pajak", variant: "destructive" }); return }
    if (form.persentase <= 0) { toast({ title: "Persentase harus lebih dari 0", variant: "destructive" }); return }
    setSaving(true)

    if (editTarget) {
      const { error } = await supabase.from("pajak").update(form).eq("id", editTarget.id)
      if (error) { toast({ title: "Gagal menyimpan", description: error.message, variant: "destructive" }); setSaving(false); return }
      toast({ title: "Pajak diperbarui" })
    } else {
      const { error } = await supabase.from("pajak")
        .insert({ ...form, unit_kerja_id: unitKerjaId, pesantren_id: pesantrenId })
      if (error) { toast({ title: "Gagal menyimpan", description: error.message, variant: "destructive" }); setSaving(false); return }
      toast({ title: "Pajak ditambahkan" })
    }

    setSaving(false); setOpenForm(false); setEditTarget(null); setForm(emptyForm()); fetchData()
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setSaving(true)
    const { error } = await supabase.from("pajak").delete().eq("id", deleteTarget.id)
    setSaving(false)
    if (error) { toast({ title: "Gagal menghapus", variant: "destructive" }); setDeleteTarget(null); return }
    toast({ title: "Pajak dihapus" })
    setDeleteTarget(null); fetchData()
  }

  async function toggleAktif(p: Pajak) {
    await supabase.from("pajak").update({ aktif: !p.aktif }).eq("id", p.id)
    fetchData()
  }

  const akunMap = new Map(akunList.map(a => [a.kode, a.nama]))

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium text-foreground">Pajak</p>
          <p className="text-xs text-muted-foreground mt-0.5">Konfigurasi persentase pajak transaksi</p>
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
              <TableHead>Nama Pajak</TableHead>
              <TableHead>Persentase</TableHead>
              <TableHead>Akun</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={5} className="text-center py-10">
                <div className="flex items-center justify-center gap-2 text-muted-foreground">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-foreground" /> Memuat...
                </div>
              </TableCell></TableRow>
            ) : data.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                Belum ada konfigurasi pajak
              </TableCell></TableRow>
            ) : data.map(p => (
              <TableRow key={p.id}>
                <TableCell className="font-medium text-sm">{p.nama}</TableCell>
                <TableCell className="text-sm font-mono">{p.persentase}%</TableCell>
                <TableCell className="text-sm">
                  <span className="font-mono text-xs text-muted-foreground mr-2">{p.akun_kode}</span>
                  {akunMap.get(p.akun_kode) ?? "-"}
                </TableCell>
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
                      onClick={() => { setEditTarget(p); setForm({ nama: p.nama, persentase: p.persentase, akun_kode: p.akun_kode, aktif: p.aktif }); setOpenForm(true) }}>
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
          <DialogHeader><DialogTitle>{editTarget ? "Edit Pajak" : "Tambah Pajak"}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Nama Pajak *</Label>
              <Input value={form.nama} onChange={e => setForm(p => ({ ...p, nama: e.target.value }))}
                placeholder="PPN 11%" required />
            </div>
            <div className="space-y-2">
              <Label>Persentase (%) *</Label>
              <Input type="number" min="0" max="100" step="0.01"
                value={form.persentase || ""}
                onChange={e => setForm(p => ({ ...p, persentase: parseFloat(e.target.value) || 0 }))}
                placeholder="11" required />
            </div>
            <div className="space-y-2">
              <Label>Akun Hutang Pajak *</Label>
              <Select value={form.akun_kode} onValueChange={v => setForm(p => ({ ...p, akun_kode: v }))}>
                <SelectTrigger><SelectValue placeholder="-- Pilih akun kewajiban --" /></SelectTrigger>
                <SelectContent>
                  {akunList.length === 0 ? (
                    <div className="px-2 py-3 text-xs text-muted-foreground text-center">Belum ada akun KEWAJIBAN</div>
                  ) : akunList.map(a => (
                    <SelectItem key={a.kode} value={a.kode}>
                      <span className="font-mono text-xs mr-2 text-muted-foreground">{a.kode}</span>{a.nama}
                    </SelectItem>
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
          <DialogHeader><DialogTitle>Hapus Pajak</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Hapus pajak <strong>{deleteTarget?.nama}</strong>?</p>
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
