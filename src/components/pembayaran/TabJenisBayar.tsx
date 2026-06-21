import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Pencil, Trash2, RefreshCw } from "lucide-react"
import type { JenisBayar } from "@/types/pembayaran"
import type { MasterAkun } from "@/types/keuangan"

interface Props { unitKerjaId: string; pesantrenId: string }
const emptyForm = () => ({ nama: "", akun_kode: "", keterangan: "" })

export default function TabJenisBayar({ unitKerjaId, pesantrenId }: Props) {
  const { toast } = useToast()
  const [data, setData] = useState<JenisBayar[]>([])
  const [akunList, setAkunList] = useState<MasterAkun[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [openForm, setOpenForm] = useState(false)
  const [editTarget, setEditTarget] = useState<JenisBayar | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<JenisBayar | null>(null)
  const [form, setForm] = useState(emptyForm())

  async function fetchAkun() {
    const { data: rows } = await supabase
      .from("master_akun").select("*")
      .eq("unit_kerja_id", unitKerjaId)
      .eq("kelompok", "ASET") // Kas & Bank
      .order("kode")
    setAkunList(rows ?? [])
  }

  async function fetchData() {
    setLoading(true)
    const { data: rows } = await supabase
      .from("jenis_bayar").select("*")
      .eq("unit_kerja_id", unitKerjaId).order("nama")
    setData(rows ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchAkun(); fetchData() }, [unitKerjaId])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.akun_kode) { toast({ title: "Pilih akun kas/bank", variant: "destructive" }); return }
    setSaving(true)

    if (editTarget) {
      const { error } = await supabase.from("jenis_bayar").update(form).eq("id", editTarget.id)
      if (error) { toast({ title: "Gagal menyimpan", description: error.message, variant: "destructive" }); setSaving(false); return }
      toast({ title: "Jenis bayar diperbarui" })
    } else {
      const { error } = await supabase.from("jenis_bayar")
        .insert({ ...form, unit_kerja_id: unitKerjaId, pesantren_id: pesantrenId })
      if (error) { toast({ title: "Gagal menyimpan", description: error.message, variant: "destructive" }); setSaving(false); return }
      toast({ title: "Jenis bayar ditambahkan" })
    }

    setSaving(false); setOpenForm(false); setEditTarget(null); setForm(emptyForm()); fetchData()
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setSaving(true)
    const { error } = await supabase.from("jenis_bayar").delete().eq("id", deleteTarget.id)
    setSaving(false)
    if (error) { toast({ title: "Gagal menghapus", variant: "destructive" }); setDeleteTarget(null); return }
    toast({ title: "Jenis bayar dihapus" })
    setDeleteTarget(null); fetchData()
  }

  const akunMap = new Map(akunList.map(a => [a.kode, a.nama]))

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium text-foreground">Jenis Bayar</p>
          <p className="text-xs text-muted-foreground mt-0.5">Metode pembayaran (Cash, Transfer BRI, dll)</p>
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
              <TableHead>Nama Jenis</TableHead>
              <TableHead>Akun Kas/Bank</TableHead>
              <TableHead>Keterangan</TableHead>
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
                Belum ada jenis bayar
              </TableCell></TableRow>
            ) : data.map(j => (
              <TableRow key={j.id}>
                <TableCell className="font-medium text-sm">{j.nama}</TableCell>
                <TableCell className="text-sm">
                  <span className="font-mono text-xs text-muted-foreground mr-2">{j.akun_kode}</span>
                  {akunMap.get(j.akun_kode) ?? "-"}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{j.keterangan ?? "-"}</TableCell>
                <TableCell className="text-right">
                  <div className="flex gap-1 justify-end">
                    <Button size="icon" variant="ghost" className="h-7 w-7"
                      onClick={() => { setEditTarget(j); setForm({ nama: j.nama, akun_kode: j.akun_kode, keterangan: j.keterangan ?? "" }); setOpenForm(true) }}>
                      <Pencil className="w-3.5 h-3.5 text-blue-500" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setDeleteTarget(j)}>
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
          <DialogHeader><DialogTitle>{editTarget ? "Edit Jenis Bayar" : "Tambah Jenis Bayar"}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Nama Jenis *</Label>
              <Input value={form.nama} onChange={e => setForm(p => ({ ...p, nama: e.target.value }))}
                placeholder="Cash / Transfer BRI" required />
            </div>
            <div className="space-y-2">
              <Label>Akun Kas/Bank *</Label>
              <Select value={form.akun_kode} onValueChange={v => setForm(p => ({ ...p, akun_kode: v }))}>
                <SelectTrigger><SelectValue placeholder="-- Pilih akun kas/bank --" /></SelectTrigger>
                <SelectContent>
                  {akunList.length === 0 ? (
                    <div className="px-2 py-3 text-xs text-muted-foreground text-center">Belum ada akun ASET</div>
                  ) : akunList.map(a => (
                    <SelectItem key={a.kode} value={a.kode}>
                      <span className="font-mono text-xs mr-2 text-muted-foreground">{a.kode}</span>{a.nama}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Keterangan</Label>
              <Input value={form.keterangan} onChange={e => setForm(p => ({ ...p, keterangan: e.target.value }))} placeholder="Opsional" />
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
          <DialogHeader><DialogTitle>Hapus Jenis Bayar</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Hapus <strong>{deleteTarget?.nama}</strong>?</p>
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
