import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Pencil, Trash2, RefreshCw, Eye } from "lucide-react"
import type { PaketPembayaran, PaketDetail, PosBayar } from "@/types/pembayaran"

interface Props { unitKerjaId: string; pesantrenId: string }
const emptyForm = () => ({ nama: "", keterangan: "", aktif: true })
const emptyDetail = (): Omit<PaketDetail, "id" | "paket_id"> => ({ pos_bayar_id: 0, jumlah: 0, periode: "BULANAN" as const })

function formatRp(n: number) {
  return n.toLocaleString("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 })
}

export default function TabPaket({ unitKerjaId, pesantrenId }: Props) {
  const { toast } = useToast()
  const [data, setData] = useState<PaketPembayaran[]>([])
  const [posBayarList, setPosBayarList] = useState<PosBayar[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [openForm, setOpenForm] = useState(false)
  const [viewTarget, setViewTarget] = useState<PaketPembayaran | null>(null)
  const [editTarget, setEditTarget] = useState<PaketPembayaran | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<PaketPembayaran | null>(null)
  const [form, setForm] = useState(emptyForm())
  const [details, setDetails] = useState<Omit<PaketDetail, "id" | "paket_id">[]>([emptyDetail()])

  async function fetchPosBayar() {
    const { data: rows } = await supabase
      .from("pos_bayar").select("*")
      .eq("unit_kerja_id", unitKerjaId).order("nama")
    setPosBayarList(rows ?? [])
  }

  async function fetchData() {
    setLoading(true)
    const { data: pakets } = await supabase
      .from("paket_pembayaran").select("*")
      .eq("unit_kerja_id", unitKerjaId).order("nama")

    if (!pakets?.length) { setData([]); setLoading(false); return }

    const ids = pakets.map(p => p.id)
    const { data: detailRows } = await supabase
      .from("paket_detail").select("*").in("paket_id", ids)

    // Group detail by paket_id
    const detailMap = new Map<number, PaketDetail[]>()
    ;(detailRows ?? []).forEach(d => {
      const list = detailMap.get(d.paket_id) ?? []
      list.push(d)
      detailMap.set(d.paket_id, list)
    })

    setData(pakets.map(p => ({ ...p, paket_detail: detailMap.get(p.id) ?? [] })))
    setLoading(false)
  }

  useEffect(() => { fetchPosBayar(); fetchData() }, [unitKerjaId])

  const posBayarMap = new Map(posBayarList.map(p => [p.id, p.nama]))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const validDetails = details.filter(d => d.pos_bayar_id && d.jumlah > 0)
    if (!validDetails.length) {
      toast({ title: "Tambahkan minimal 1 item paket", variant: "destructive" }); return
    }
    setSaving(true)

    try {
      if (editTarget) {
        await supabase.from("paket_pembayaran").update(form).eq("id", editTarget.id)
        await supabase.from("paket_detail").delete().eq("paket_id", editTarget.id)
        await supabase.from("paket_detail").insert(
          validDetails.map(d => ({ ...d, paket_id: editTarget.id }))
        )
        toast({ title: "Paket diperbarui" })
      } else {
        const { data: inserted, error } = await supabase
          .from("paket_pembayaran")
          .insert({ ...form, unit_kerja_id: unitKerjaId, pesantren_id: pesantrenId })
          .select().single()
        if (error) throw error
        await supabase.from("paket_detail").insert(
          validDetails.map(d => ({ ...d, paket_id: inserted.id }))
        )
        toast({ title: "Paket ditambahkan" })
      }
      closeForm(); fetchData()
    } catch (err: any) {
      toast({ title: "Gagal menyimpan", description: err.message, variant: "destructive" })
    }
    setSaving(false)
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setSaving(true)
    const { error } = await supabase.from("paket_pembayaran").delete().eq("id", deleteTarget.id)
    setSaving(false)
    if (error) { toast({ title: "Gagal menghapus", variant: "destructive" }); setDeleteTarget(null); return }
    toast({ title: "Paket dihapus" })
    setDeleteTarget(null); fetchData()
  }

  async function toggleAktif(p: PaketPembayaran) {
    await supabase.from("paket_pembayaran").update({ aktif: !p.aktif }).eq("id", p.id)
    fetchData()
  }

  function openEdit(p: PaketPembayaran) {
    setEditTarget(p)
    setForm({ nama: p.nama, keterangan: p.keterangan ?? "", aktif: p.aktif })
    setDetails(p.paket_detail?.length
      ? p.paket_detail.map(d => ({ pos_bayar_id: d.pos_bayar_id, jumlah: d.jumlah, periode: d.periode }))
      : [emptyDetail()])
    setOpenForm(true)
  }

  function closeForm() {
    setOpenForm(false); setEditTarget(null)
    setForm(emptyForm()); setDetails([emptyDetail()])
  }

  function setDetailItem(i: number, key: keyof Omit<PaketDetail, "id" | "paket_id">, value: string | number) {
    setDetails(prev => prev.map((d, idx) => idx === i ? { ...d, [key]: value } : d))
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium text-foreground">Paket Pembayaran</p>
          <p className="text-xs text-muted-foreground mt-0.5">Paket biaya per jenjang/kategori</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
          <Button size="sm" onClick={() => { closeForm(); setOpenForm(true) }} disabled={posBayarList.length === 0}>
            <Plus className="w-4 h-4 mr-2" /> Tambah Paket
          </Button>
        </div>
      </div>

      {posBayarList.length === 0 && !loading && (
        <div className="p-3 rounded-lg border border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20 text-sm text-yellow-800 dark:text-yellow-300">
          ⚠ Buat <strong>Pos Bayar</strong> terlebih dahulu sebelum membuat paket.
        </div>
      )}

      <div className="rounded-xl border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Nama Paket</TableHead>
              <TableHead>Jumlah Item</TableHead>
              <TableHead>Total/Bulan</TableHead>
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
                Belum ada paket pembayaran
              </TableCell></TableRow>
            ) : data.map(p => {
              const totalBulan = p.paket_detail
                ?.filter(d => d.periode === "BULANAN")
                .reduce((s, d) => s + Number(d.jumlah), 0) ?? 0
              return (
                <TableRow key={p.id}>
                  <TableCell className="font-medium text-sm">{p.nama}</TableCell>
                  <TableCell className="text-sm">{p.paket_detail?.length ?? 0} item</TableCell>
                  <TableCell className="text-sm font-medium">{formatRp(totalBulan)}/bln</TableCell>
                  <TableCell>
                    <button onClick={() => toggleAktif(p)}>
                      <Badge variant={p.aktif ? "success" : "secondary"} className="text-xs cursor-pointer">
                        {p.aktif ? "Aktif" : "Non Aktif"}
                      </Badge>
                    </button>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-1 justify-end">
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setViewTarget(p)}>
                        <Eye className="w-3.5 h-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(p)}>
                        <Pencil className="w-3.5 h-3.5 text-blue-500" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setDeleteTarget(p)}>
                        <Trash2 className="w-3.5 h-3.5 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      {/* Form Dialog */}
      <Dialog open={openForm} onOpenChange={open => { if (!open) closeForm() }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editTarget ? "Edit Paket" : "Tambah Paket Pembayaran"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nama Paket *</Label>
                <Input value={form.nama} onChange={e => setForm(p => ({ ...p, nama: e.target.value }))}
                  placeholder="Paket SD Regular" required />
              </div>
              <div className="space-y-2">
                <Label>Keterangan</Label>
                <Input value={form.keterangan} onChange={e => setForm(p => ({ ...p, keterangan: e.target.value }))}
                  placeholder="Opsional" />
              </div>
            </div>

            {/* Detail items */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Item Paket *</Label>
                <Button type="button" size="sm" variant="outline"
                  onClick={() => setDetails(p => [...p, emptyDetail()])}>
                  <Plus className="w-3.5 h-3.5 mr-1" /> Tambah Item
                </Button>
              </div>
              <div className="grid grid-cols-12 gap-2 text-xs font-medium text-muted-foreground px-1">
                <span className="col-span-5">Pos Bayar</span>
                <span className="col-span-3 text-right">Jumlah (Rp)</span>
                <span className="col-span-3">Periode</span>
                <span className="col-span-1"></span>
              </div>
              {details.map((d, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-5">
                    <Select value={d.pos_bayar_id ? String(d.pos_bayar_id) : ""}
                      onValueChange={v => setDetailItem(i, "pos_bayar_id", parseInt(v))}>
                      <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="-- Pilih pos --" /></SelectTrigger>
                      <SelectContent>
                        {posBayarList.map(p => (
                          <SelectItem key={p.id} value={String(p.id)}>{p.nama}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Input className="col-span-3 h-8 text-sm text-right" type="number" min="0"
                    value={d.jumlah || ""} onChange={e => setDetailItem(i, "jumlah", parseFloat(e.target.value) || 0)}
                    placeholder="0" />
                  <div className="col-span-3">
                    <Select value={d.periode} onValueChange={v => setDetailItem(i, "periode", v)}>
                      <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="BULANAN">Bulanan</SelectItem>
                        <SelectItem value="TAHUNAN">Tahunan</SelectItem>
                        <SelectItem value="SEKALI">Sekali</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button type="button" size="icon" variant="ghost" className="h-8 w-8 col-span-1"
                    onClick={() => setDetails(p => p.filter((_, idx) => idx !== i))}
                    disabled={details.length <= 1}>
                    <Trash2 className="w-3.5 h-3.5 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>

            {/* Total */}
            <div className="rounded-lg border p-3 bg-muted/30 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Bulanan:</span>
                <span className="font-semibold">{formatRp(details.filter(d => d.periode === "BULANAN").reduce((s, d) => s + (Number(d.jumlah) || 0), 0))}</span>
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-muted-foreground">Total Tahunan:</span>
                <span className="font-semibold">{formatRp(details.filter(d => d.periode === "TAHUNAN").reduce((s, d) => s + (Number(d.jumlah) || 0), 0))}</span>
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-muted-foreground">Sekali Bayar:</span>
                <span className="font-semibold">{formatRp(details.filter(d => d.periode === "SEKALI").reduce((s, d) => s + (Number(d.jumlah) || 0), 0))}</span>
              </div>
            </div>

            <div className="flex gap-3">
              <Button type="submit" disabled={saving} className="flex-1">
                {saving ? "Menyimpan..." : editTarget ? "Simpan Perubahan" : "Simpan Paket"}
              </Button>
              <Button type="button" variant="outline" onClick={closeForm}>Batal</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={!!viewTarget} onOpenChange={open => !open && setViewTarget(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{viewTarget?.nama}</DialogTitle>
            <DialogDescription>{viewTarget?.keterangan || "Detail paket pembayaran"}</DialogDescription>
          </DialogHeader>
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Pos Bayar</TableHead>
                <TableHead>Periode</TableHead>
                <TableHead className="text-right">Jumlah</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {viewTarget?.paket_detail?.map((d, i) => (
                <TableRow key={i}>
                  <TableCell className="text-sm">{posBayarMap.get(d.pos_bayar_id) ?? "-"}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">{d.periode}</Badge>
                  </TableCell>
                  <TableCell className="text-right text-sm font-medium">{formatRp(Number(d.jumlah))}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={open => !open && setDeleteTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Hapus Paket</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Hapus paket <strong>{deleteTarget?.nama}</strong>? Semua item paket akan ikut terhapus.</p>
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
