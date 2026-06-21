import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"
import { UnitSelector } from "@/components/UnitSelector"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Trash2, Eye, Pencil, RefreshCw } from "lucide-react"
import type { JurnalUmum, JurnalFormData, JurnalDetail, MasterAkun } from "@/types/keuangan"

const emptyDetail = (): JurnalDetail => ({ akun_kode: "", debit: 0, kredit: 0 })

const emptyForm = (): JurnalFormData => ({
  tanggal: new Date().toISOString().slice(0, 10),
  no_jurnal: "", keterangan: "",
  detail: [emptyDetail(), emptyDetail()],
})

function formatRp(n: number) {
  return n.toLocaleString("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 })
}

function formatTgl(tgl: string) {
  return new Date(tgl).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })
}

export default function JurnalUmumPage() {
  return (
    <UnitSelector>
      {(unitKerjaId, pesantrenId) => (
        <JurnalUmumContent unitKerjaId={unitKerjaId} pesantrenId={pesantrenId} />
      )}
    </UnitSelector>
  )
}

function JurnalUmumContent({ unitKerjaId, pesantrenId }: { unitKerjaId: string; pesantrenId: string }) {
  const { toast } = useToast()
  const [data, setData] = useState<JurnalUmum[]>([])
  const [masterAkun, setMasterAkun] = useState<MasterAkun[]>([])
  const [akunMap, setAkunMap] = useState<Map<string, string>>(new Map()) // kode → nama
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<JurnalFormData>(emptyForm())
  const [openForm, setOpenForm] = useState(false)
  const [viewTarget, setViewTarget] = useState<JurnalUmum | null>(null)
  const [editId, setEditId] = useState<number | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<JurnalUmum | null>(null)

  async function fetchMasterAkun() {
    const { data: rows, error } = await supabase
      .from("master_akun")
      .select("*")
      .eq("unit_kerja_id", unitKerjaId)
      .order("kode")

    if (error) {
      toast({ title: "Gagal memuat master akun", description: error.message, variant: "destructive" })
      return
    }

    const rows_ = rows ?? []
    setMasterAkun(rows_)

    // Build lookup map kode → nama
    const map = new Map<string, string>()
    rows_.forEach(a => map.set(a.kode, a.nama))
    setAkunMap(map)
  }

  async function fetchData() {
    setLoading(true)

    // Fetch jurnal tanpa join ke master_akun
    const { data: jurnalRows, error: jurnalError } = await supabase
      .from("jurnal_umum")
      .select("*")
      .eq("unit_kerja_id", unitKerjaId)
      .order("tanggal", { ascending: false })

    if (jurnalError) {
      toast({ title: "Gagal memuat jurnal", description: jurnalError.message, variant: "destructive" })
      setLoading(false)
      return
    }

    if (!jurnalRows?.length) {
      setData([])
      setLoading(false)
      return
    }

    // Fetch semua detail untuk jurnal ini
    const jurnalIds = jurnalRows.map(j => j.id)
    const { data: detailRows, error: detailError } = await supabase
      .from("jurnal_detail")
      .select("id, jurnal_id, akun_kode, debit, kredit")
      .in("jurnal_id", jurnalIds)

    if (detailError) {
      toast({ title: "Gagal memuat detail jurnal", description: detailError.message, variant: "destructive" })
      setLoading(false)
      return
    }

    // Group detail by jurnal_id
    const detailByJurnal = new Map<number, JurnalDetail[]>()
    ;(detailRows ?? []).forEach(d => {
      const list = detailByJurnal.get(d.jurnal_id) ?? []
      list.push(d)
      detailByJurnal.set(d.jurnal_id, list)
    })

    // Gabungkan
    const combined: JurnalUmum[] = jurnalRows.map(j => ({
      ...j,
      jurnal_detail: detailByJurnal.get(j.id) ?? [],
    }))

    setData(combined)
    setLoading(false)
  }

  useEffect(() => {
    fetchMasterAkun()
    fetchData()
  }, [unitKerjaId])

  const totalDebit = form.detail.reduce((s, d) => s + (Number(d.debit) || 0), 0)
  const totalKredit = form.detail.reduce((s, d) => s + (Number(d.kredit) || 0), 0)
  const isBalanced = totalDebit === totalKredit && totalDebit > 0
  const selisih = Math.abs(totalDebit - totalKredit)

  function setDetail(idx: number, key: keyof JurnalDetail, value: string | number) {
    setForm(prev => {
      const detail = [...prev.detail]
      detail[idx] = { ...detail[idx], [key]: value }
      return { ...prev, detail }
    })
  }

  function closeForm() {
    setOpenForm(false)
    setEditId(null)
    setForm(emptyForm())
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!isBalanced) {
      toast({ title: "Jurnal tidak balance!", description: `Selisih: ${formatRp(selisih)}`, variant: "destructive" })
      return
    }
    const validDetail = form.detail.filter(d => d.akun_kode)
    if (validDetail.length < 2) {
      toast({ title: "Minimal 2 baris akun", variant: "destructive" })
      return
    }

    setSaving(true)
    try {
      if (editId) {
        const { error: updateError } = await supabase
          .from("jurnal_umum")
          .update({ tanggal: form.tanggal, no_jurnal: form.no_jurnal, keterangan: form.keterangan })
          .eq("id", editId)
        if (updateError) throw updateError

        await supabase.from("jurnal_detail").delete().eq("jurnal_id", editId)

        const { error: insertDetailError } = await supabase
          .from("jurnal_detail")
          .insert(validDetail.map(d => ({
            akun_kode: d.akun_kode,
            debit: d.debit,
            kredit: d.kredit,
            jurnal_id: editId,
          })))
        if (insertDetailError) throw insertDetailError

        toast({ title: "Jurnal diperbarui" })
      } else {
        const { data: inserted, error: insertError } = await supabase
          .from("jurnal_umum")
          .insert({
            tanggal: form.tanggal,
            no_jurnal: form.no_jurnal,
            keterangan: form.keterangan,
            pesantren_id: pesantrenId,
            unit_kerja_id: unitKerjaId,
          })
          .select()
          .single()
        if (insertError) throw insertError

        const { error: insertDetailError } = await supabase
          .from("jurnal_detail")
          .insert(validDetail.map(d => ({
            akun_kode: d.akun_kode,
            debit: d.debit,
            kredit: d.kredit,
            jurnal_id: inserted.id,
          })))
        if (insertDetailError) throw insertDetailError

        toast({ title: "Jurnal berhasil disimpan" })
      }
      closeForm()
      fetchData()
    } catch (err: any) {
      toast({ title: "Gagal menyimpan", description: err.message, variant: "destructive" })
    }
    setSaving(false)
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setSaving(true)
    const { error } = await supabase.from("jurnal_umum").delete().eq("id", deleteTarget.id)
    setSaving(false)
    if (error) { toast({ title: "Gagal menghapus", variant: "destructive" }); return }
    toast({ title: "Jurnal dihapus" })
    setDeleteTarget(null)
    fetchData()
  }

  function openEdit(j: JurnalUmum) {
    setEditId(j.id)
    setForm({
      tanggal: j.tanggal,
      no_jurnal: j.no_jurnal,
      keterangan: j.keterangan,
      detail: j.jurnal_detail?.length
        ? j.jurnal_detail.map(d => ({
            akun_kode: d.akun_kode,
            debit: Number(d.debit),
            kredit: Number(d.kredit),
          }))
        : [emptyDetail(), emptyDetail()],
    })
    setOpenForm(true)
  }

  // Grouped untuk dropdown
  const grouped = ["ASET","KEWAJIBAN","MODAL","PENDAPATAN","BEBAN"]
    .map(k => ({ kelompok: k, akuns: masterAkun.filter(a => a.kelompok === k) }))
    .filter(g => g.akuns.length > 0)

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Jurnal Umum</h1>
          <p className="text-sm text-muted-foreground mt-1">Kelola seluruh transaksi keuangan</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => { fetchMasterAkun(); fetchData() }} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
          <Button
            size="sm"
            onClick={() => { closeForm(); setOpenForm(true) }}
            disabled={masterAkun.length === 0 || loading}
          >
            <Plus className="w-4 h-4 mr-2" /> Tambah Jurnal
          </Button>
        </div>
      </div>

      {!loading && masterAkun.length === 0 && (
        <div className="p-4 rounded-lg border border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20 text-sm text-yellow-800 dark:text-yellow-300">
          ⚠ Belum ada Master Akun. Buat akun di halaman <strong>Master Akun</strong> terlebih dahulu.
        </div>
      )}

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Tanggal</TableHead>
                <TableHead>No. Jurnal</TableHead>
                <TableHead>Keterangan</TableHead>
                <TableHead>Akun</TableHead>
                <TableHead className="text-right">Total Debit</TableHead>
                <TableHead className="text-right">Total Kredit</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                    <div className="flex items-center justify-center gap-2">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-foreground" /> Memuat...
                    </div>
                  </TableCell>
                </TableRow>
              ) : data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                    Belum ada data jurnal
                  </TableCell>
                </TableRow>
              ) : data.map(j => {
                const totalD = j.jurnal_detail?.reduce((s, d) => s + Number(d.debit), 0) ?? 0
                const totalK = j.jurnal_detail?.reduce((s, d) => s + Number(d.kredit), 0) ?? 0
                // Gunakan akunMap untuk lookup nama
                const akunList = j.jurnal_detail
                  ?.map(d => akunMap.get(d.akun_kode) ?? d.akun_kode)
                  .join(", ") ?? ""
                return (
                  <TableRow key={j.id}>
                    <TableCell className="text-sm">{formatTgl(j.tanggal)}</TableCell>
                    <TableCell className="font-mono text-sm">{j.no_jurnal}</TableCell>
                    <TableCell className="text-sm">{j.keterangan}</TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[160px] truncate">{akunList}</TableCell>
                    <TableCell className="text-right text-sm font-medium">{formatRp(totalD)}</TableCell>
                    <TableCell className="text-right text-sm font-medium">{formatRp(totalK)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-1 justify-end">
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setViewTarget(j)}>
                          <Eye className="w-3.5 h-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(j)}>
                          <Pencil className="w-3.5 h-3.5 text-blue-500" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setDeleteTarget(j)}>
                          <Trash2 className="w-3.5 h-3.5 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Form Dialog */}
      <Dialog open={openForm} onOpenChange={open => { if (!open) closeForm() }}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{editId ? "Edit Jurnal" : "Tambah Jurnal Baru"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Tanggal *</Label>
                <Input type="date" value={form.tanggal}
                  onChange={e => setForm(p => ({ ...p, tanggal: e.target.value }))} required />
              </div>
              <div className="space-y-2">
                <Label>No. Jurnal *</Label>
                <Input value={form.no_jurnal}
                  onChange={e => setForm(p => ({ ...p, no_jurnal: e.target.value }))}
                  placeholder="JU-001" required />
              </div>
              <div className="space-y-2">
                <Label>Keterangan *</Label>
                <Input value={form.keterangan}
                  onChange={e => setForm(p => ({ ...p, keterangan: e.target.value }))}
                  placeholder="Pembelian ATK" required />
              </div>
            </div>

            {/* Detail rows */}
            <div className="space-y-2">
              <div className="grid grid-cols-12 gap-2 text-xs font-medium text-muted-foreground px-1">
                <span className="col-span-5">Akun</span>
                <span className="col-span-3 text-right">Debit (Rp)</span>
                <span className="col-span-4 text-right">Kredit (Rp)</span>
              </div>

              {form.detail.map((d, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-5">
                    <Select value={d.akun_kode} onValueChange={v => setDetail(i, "akun_kode", v)}>
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue placeholder="-- Pilih akun --" />
                      </SelectTrigger>
                      <SelectContent>
                        {grouped.length === 0 ? (
                          <div className="px-2 py-3 text-xs text-muted-foreground text-center">
                            Belum ada master akun
                          </div>
                        ) : grouped.map(g => (
                          <div key={g.kelompok}>
                            <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                              {g.kelompok}
                            </div>
                            {g.akuns.map(a => (
                              <SelectItem key={a.kode} value={a.kode}>
                                <span className="font-mono text-xs mr-2 text-muted-foreground">{a.kode}</span>
                                {a.nama}
                              </SelectItem>
                            ))}
                          </div>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Input
                    className="col-span-3 h-8 text-sm text-right" type="number" min="0"
                    value={d.debit || ""}
                    onChange={e => setDetail(i, "debit", parseFloat(e.target.value) || 0)}
                    placeholder="0"
                  />
                  <div className="col-span-4 flex gap-1">
                    <Input
                      className="h-8 text-sm text-right flex-1" type="number" min="0"
                      value={d.kredit || ""}
                      onChange={e => setDetail(i, "kredit", parseFloat(e.target.value) || 0)}
                      placeholder="0"
                    />
                    <Button
                      type="button" size="icon" variant="ghost" className="h-8 w-8 shrink-0"
                      onClick={() => setForm(p => ({ ...p, detail: p.detail.filter((_, idx) => idx !== i) }))}
                      disabled={form.detail.length <= 2}
                    >
                      <Trash2 className="w-3.5 h-3.5 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}

              <Button
                type="button" variant="outline" size="sm"
                onClick={() => setForm(p => ({ ...p, detail: [...p.detail, emptyDetail()] }))}
              >
                <Plus className="w-3.5 h-3.5 mr-1" /> Tambah Baris
              </Button>
            </div>

            {/* Total */}
            <div className="rounded-lg border p-3 bg-muted/30 space-y-1">
              <div className="grid grid-cols-12 gap-2 text-sm">
                <span className="col-span-5 font-semibold">Total</span>
                <span className={`col-span-3 text-right font-semibold ${isBalanced ? "text-green-600" : "text-destructive"}`}>
                  {formatRp(totalDebit)}
                </span>
                <span className={`col-span-4 text-right font-semibold pr-9 ${isBalanced ? "text-green-600" : "text-destructive"}`}>
                  {formatRp(totalKredit)}
                </span>
              </div>
              {isBalanced
                ? <p className="text-xs text-green-600">✓ Jurnal balance</p>
                : totalDebit > 0 && <p className="text-xs text-destructive">⚠ Belum balance — selisih {formatRp(selisih)}</p>
              }
            </div>

            <div className="flex gap-3">
              <Button type="submit" disabled={saving || !isBalanced} className="flex-1">
                {saving ? "Menyimpan..." : editId ? "Simpan Perubahan" : "Simpan Jurnal"}
              </Button>
              <Button type="button" variant="outline" onClick={closeForm}>Batal</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={!!viewTarget} onOpenChange={open => !open && setViewTarget(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detail Jurnal — {viewTarget?.no_jurnal}</DialogTitle>
            <DialogDescription>
              {viewTarget && formatTgl(viewTarget.tanggal)} · {viewTarget?.keterangan}
            </DialogDescription>
          </DialogHeader>
          {viewTarget && (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Kode</TableHead>
                  <TableHead>Nama Akun</TableHead>
                  <TableHead className="text-right">Debit</TableHead>
                  <TableHead className="text-right">Kredit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {viewTarget.jurnal_detail?.map((d, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-mono text-sm">{d.akun_kode}</TableCell>
                    {/* Pakai akunMap untuk nama */}
                    <TableCell className="text-sm">{akunMap.get(d.akun_kode) ?? "-"}</TableCell>
                    <TableCell className="text-right text-sm">
                      {Number(d.debit) > 0 ? formatRp(Number(d.debit)) : "-"}
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      {Number(d.kredit) > 0 ? formatRp(Number(d.kredit)) : "-"}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-muted/50 font-semibold">
                  <TableCell colSpan={2}>Total</TableCell>
                  <TableCell className="text-right">
                    {formatRp(viewTarget.jurnal_detail?.reduce((s, d) => s + Number(d.debit), 0) ?? 0)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatRp(viewTarget.jurnal_detail?.reduce((s, d) => s + Number(d.kredit), 0) ?? 0)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={open => !open && setDeleteTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Hapus Jurnal</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            Hapus jurnal <span className="font-mono font-semibold text-foreground">{deleteTarget?.no_jurnal}</span>?
            Semua detail akan ikut terhapus.
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
