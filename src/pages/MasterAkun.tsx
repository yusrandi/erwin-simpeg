import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"
import { UnitSelector } from "@/components/UnitSelector"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus, Pencil, Trash2, RefreshCw, Search } from "lucide-react"
import type { MasterAkun, KelompokAkun, TipeNormal } from "@/types/keuangan"

const KELOMPOK: KelompokAkun[] = ["ASET", "KEWAJIBAN", "MODAL", "PENDAPATAN", "BEBAN"]

const kelompokBadge: Record<KelompokAkun, string> = {
  ASET:       "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  KEWAJIBAN:  "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
  MODAL:      "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300",
  PENDAPATAN: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  BEBAN:      "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300",
}

const defaultTipe: Record<KelompokAkun, TipeNormal> = {
  ASET: "DEBIT", KEWAJIBAN: "KREDIT", MODAL: "KREDIT", PENDAPATAN: "KREDIT", BEBAN: "DEBIT",
}

const emptyForm = () => ({ kode: "", nama: "", kelompok: "ASET" as KelompokAkun, tipe_normal: "DEBIT" as TipeNormal })

export default function MasterAkunPage() {
  return (
    <UnitSelector>
      {(unitKerjaId, pesantrenId) => (
        <MasterAkunContent unitKerjaId={unitKerjaId} pesantrenId={pesantrenId} />
      )}
    </UnitSelector>
  )
}

function MasterAkunContent({ unitKerjaId, pesantrenId }: { unitKerjaId: string; pesantrenId: string }) {
  const { toast } = useToast()
  const [data, setData] = useState<MasterAkun[]>([])
  const [filtered, setFiltered] = useState<MasterAkun[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState("")
  const [filterKelompok, setFilterKelompok] = useState("SEMUA")
  const [openForm, setOpenForm] = useState(false)
  const [editTarget, setEditTarget] = useState<MasterAkun | null>(null)
  const [form, setForm] = useState(emptyForm())
  const [deleteTarget, setDeleteTarget] = useState<MasterAkun | null>(null)

  async function fetchData() {
    setLoading(true)
    const { data: rows, error } = await supabase
      .from("master_akun").select("*")
      .eq("unit_kerja_id", unitKerjaId).order("kode")
    if (error) toast({ title: "Gagal memuat data", variant: "destructive" })
    setData(rows ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [unitKerjaId])

  useEffect(() => {
    let result = [...data]
    if (search) result = result.filter(d =>
      d.kode.toLowerCase().includes(search.toLowerCase()) ||
      d.nama.toLowerCase().includes(search.toLowerCase())
    )
    if (filterKelompok !== "SEMUA") result = result.filter(d => d.kelompok === filterKelompok)
    setFiltered(result)
  }, [search, filterKelompok, data])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    if (editTarget) {
      const { error } = await supabase.from("master_akun")
        .update({ nama: form.nama, kelompok: form.kelompok, tipe_normal: form.tipe_normal })
        .eq("id", editTarget.id)
      if (error) { toast({ title: "Gagal menyimpan", description: error.message, variant: "destructive" }); setSaving(false); return }
      toast({ title: "Akun diperbarui" })
    } else {
      const { error } = await supabase.from("master_akun")
        .insert({ ...form, pesantren_id: pesantrenId, unit_kerja_id: unitKerjaId })
      if (error) { toast({ title: "Gagal menyimpan", description: error.message, variant: "destructive" }); setSaving(false); return }
      toast({ title: "Akun ditambahkan" })
    }
    setSaving(false)
    setOpenForm(false)
    setEditTarget(null)
    setForm(emptyForm())
    fetchData()
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setSaving(true)
    const { error } = await supabase.from("master_akun").delete().eq("id", deleteTarget.id)
    setSaving(false)
    if (error) { toast({ title: "Gagal menghapus", description: "Akun masih digunakan di jurnal.", variant: "destructive" }); setDeleteTarget(null); return }
    toast({ title: "Akun dihapus" })
    setDeleteTarget(null)
    fetchData()
  }

  const countKelompok = (k: KelompokAkun) => data.filter(d => d.kelompok === k).length

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Master Akun</h1>
          <p className="text-sm text-muted-foreground mt-1">Daftar akun transaksi keuangan</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
          <Button size="sm" onClick={() => { setEditTarget(null); setForm(emptyForm()); setOpenForm(true) }}>
            <Plus className="w-4 h-4 mr-2" /> Tambah Akun
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-3">
        {KELOMPOK.map(k => (
          <Card key={k} className={`cursor-pointer border transition-all ${filterKelompok === k ? "ring-2 ring-foreground" : ""}`}
            onClick={() => setFilterKelompok(p => p === k ? "SEMUA" : k)}>
            <CardContent className="p-4">
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${kelompokBadge[k]}`}>{k}</span>
              <p className="text-2xl font-bold text-foreground mt-2">{countKelompok(k)}</p>
              <p className="text-xs text-muted-foreground">akun</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Cari kode atau nama..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={filterKelompok} onValueChange={setFilterKelompok}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="SEMUA">Semua Kelompok</SelectItem>
            {KELOMPOK.map(k => <SelectItem key={k} value={k}>{k}</SelectItem>)}
          </SelectContent>
        </Select>
        <p className="text-sm text-muted-foreground self-center">{filtered.length} dari {data.length} akun</p>
      </div>

      <div className="rounded-xl border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Kode</TableHead>
              <TableHead>Nama Akun</TableHead>
              <TableHead>Kelompok</TableHead>
              <TableHead>Tipe Normal</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={5} className="text-center py-12">
                <div className="flex items-center justify-center gap-2 text-muted-foreground">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-foreground" /> Memuat...
                </div>
              </TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                {data.length === 0 ? "Belum ada akun. Klik 'Tambah Akun' untuk memulai." : "Tidak ada akun ditemukan"}
              </TableCell></TableRow>
            ) : filtered.map(akun => (
              <TableRow key={akun.id}>
                <TableCell className="font-mono font-semibold text-sm">{akun.kode}</TableCell>
                <TableCell className="text-sm">{akun.nama}</TableCell>
                <TableCell>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${kelompokBadge[akun.kelompok]}`}>{akun.kelompok}</span>
                </TableCell>
                <TableCell>
                  <Badge variant={akun.tipe_normal === "DEBIT" ? "default" : "secondary"} className="text-xs">{akun.tipe_normal}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex gap-1 justify-end">
                    <Button size="icon" variant="ghost" className="h-7 w-7"
                      onClick={() => { setEditTarget(akun); setForm({ kode: akun.kode, nama: akun.nama, kelompok: akun.kelompok, tipe_normal: akun.tipe_normal }); setOpenForm(true) }}>
                      <Pencil className="w-3.5 h-3.5 text-blue-500" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setDeleteTarget(akun)}>
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
          <DialogHeader><DialogTitle>{editTarget ? "Edit Akun" : "Tambah Akun Baru"}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Kode Akun *</Label>
              <Input value={form.kode} onChange={e => setForm(p => ({ ...p, kode: e.target.value }))}
                placeholder="1-001" disabled={!!editTarget} required />
              {editTarget && <p className="text-xs text-muted-foreground">Kode tidak bisa diubah</p>}
            </div>
            <div className="space-y-2">
              <Label>Nama Akun *</Label>
              <Input value={form.nama} onChange={e => setForm(p => ({ ...p, nama: e.target.value }))} placeholder="Kas" required />
            </div>
            <div className="space-y-2">
              <Label>Kelompok *</Label>
              <Select value={form.kelompok} onValueChange={v => setForm(p => ({ ...p, kelompok: v as KelompokAkun, tipe_normal: defaultTipe[v as KelompokAkun] }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{KELOMPOK.map(k => <SelectItem key={k} value={k}>{k}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Tipe Normal *</Label>
              <Select value={form.tipe_normal} onValueChange={v => setForm(p => ({ ...p, tipe_normal: v as TipeNormal }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="DEBIT">Debit</SelectItem>
                  <SelectItem value="KREDIT">Kredit</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-3 pt-1">
              <Button type="submit" disabled={saving} className="flex-1">
                {saving ? "Menyimpan..." : editTarget ? "Simpan Perubahan" : "Tambah Akun"}
              </Button>
              <Button type="button" variant="outline" onClick={() => { setOpenForm(false); setEditTarget(null) }}>Batal</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteTarget} onOpenChange={open => !open && setDeleteTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Hapus Akun</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            Hapus akun <span className="font-mono font-semibold text-foreground">{deleteTarget?.kode}</span> — {deleteTarget?.nama}?
            <br /><span className="text-destructive text-xs mt-2 block">⚠ Akun yang dipakai di jurnal tidak bisa dihapus.</span>
          </p>
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
