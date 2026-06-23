import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"
import { UnitSelector } from "@/components/UnitSelector"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, RefreshCw, CheckCircle, AlertCircle, Pencil, Trash2 } from "lucide-react"
import { getSaldoAkun } from "@/lib/kasHelper"
import type { MasterAkun } from "@/types/keuangan"
import type { RekonsiliasiBankRow } from "@/types/keuangan"

function formatRp(n: number) {
  return n.toLocaleString("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 })
}

function getPeriodeLabel(periode: string) {
  const [year, month] = periode.split("-")
  const bulan = ["Januari","Februari","Maret","April","Mei","Juni",
                 "Juli","Agustus","September","Oktober","November","Desember"]
  return `${bulan[parseInt(month) - 1]} ${year}`
}

// Generate list periode 12 bulan terakhir
function getPeriodeOptions() {
  const options = []
  const now = new Date()
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`
    options.push({ value: val, label: getPeriodeLabel(val) })
  }
  return options
}

const PERIODE_OPTIONS = getPeriodeOptions()

export default function Rekonsiliasi() {
  return (
    <UnitSelector>
      {(unitKerjaId, pesantrenId) => (
        <RekonsiliasiContent unitKerjaId={unitKerjaId} pesantrenId={pesantrenId} />
      )}
    </UnitSelector>
  )
}

function RekonsiliasiContent({ unitKerjaId, pesantrenId }: { unitKerjaId: string; pesantrenId: string }) {
  const { toast } = useToast()
  const [akunKasList, setAkunKasList] = useState<MasterAkun[]>([])
  const [data, setData] = useState<RekonsiliasiBankRow[]>([])
  const [saldoSistemMap, setSaldoSistemMap] = useState<Map<string, number>>(new Map())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [openForm, setOpenForm] = useState(false)
  const [editTarget, setEditTarget] = useState<RekonsiliasiBankRow | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<RekonsiliasiBankRow | null>(null)

  const emptyForm = () => ({
    akun_kas_id: "",
    periode: PERIODE_OPTIONS[0].value,
    saldo_buku: 0,
    catatan: "",
  })
  const [form, setForm] = useState(emptyForm())

  // Saldo sistem — dihitung dari jurnal sampai akhir bulan periode
  const [saldoSistemForm, setSaldoSistemForm] = useState(0)
  const [loadingSaldo, setLoadingSaldo] = useState(false)

  async function fetchAkun() {
    const { data: rows } = await supabase
      .from("master_akun").select("*")
      .eq("unit_kerja_id", unitKerjaId)
      .eq("kelompok", "ASET")
      .order("kode")
    setAkunKasList(rows ?? [])

    // Hitung saldo sistem saat ini per akun
    const map = new Map<string, number>()
    for (const akun of rows ?? []) {
      const saldo = await getSaldoAkun(akun.kode, akun.tipe_normal, unitKerjaId)
      map.set(akun.kode, saldo)
    }
    setSaldoSistemMap(map)
  }

  async function fetchData() {
    setLoading(true)
    const { data: rows } = await supabase
      .from("rekonsiliasi_bank").select("*")
      .eq("unit_kerja_id", unitKerjaId)
      .order("periode", { ascending: false })
    setData(rows ?? [])
    setLoading(false)
  }

  useEffect(() => {
    async function init() {
      await fetchAkun()
      await fetchData()
    }
    init()
  }, [unitKerjaId])

  // Hitung saldo sistem saat akun/periode berubah di form
  useEffect(() => {
    async function hitungSaldo() {
      if (!form.akun_kas_id || !form.periode) return
      setLoadingSaldo(true)
      const akun = akunKasList.find(a => a.kode === form.akun_kas_id)
      if (!akun) { setLoadingSaldo(false); return }

      // Hitung s.d. akhir bulan periode
      const [year, month] = form.periode.split("-")
      const akhirBulan = new Date(parseInt(year), parseInt(month), 0) // hari terakhir bulan
      const sampaiTgl = akhirBulan.toISOString().slice(0, 10)

      const saldo = await getSaldoAkun(akun.kode, akun.tipe_normal, unitKerjaId, sampaiTgl)
      setSaldoSistemForm(saldo)
      setLoadingSaldo(false)
    }
    hitungSaldo()
  }, [form.akun_kas_id, form.periode])

  const akunMap = new Map(akunKasList.map(a => [a.kode, a.nama]))
  const selisihForm = form.saldo_buku - saldoSistemForm
  const isBalance = Math.abs(selisihForm) < 1

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.akun_kas_id) {
      toast({ title: "Pilih akun kas/bank", variant: "destructive" }); return
    }

    // Cek duplikat akun+periode
    if (!editTarget) {
      const duplikat = data.find(d => d.akun_kas_id === form.akun_kas_id && d.periode.startsWith(form.periode.slice(0, 7)))
      if (duplikat) {
        toast({ title: "Rekonsiliasi sudah ada", description: "Akun dan periode ini sudah pernah direkonsiliasi.", variant: "destructive" })
        return
      }
    }

    setSaving(true)
    const payload = {
      unit_kerja_id: unitKerjaId,
      pesantren_id: pesantrenId,
      akun_kas_id: form.akun_kas_id,
      periode: form.periode,
      saldo_sistem: saldoSistemForm,
      saldo_buku: form.saldo_buku,
      catatan: form.catatan || null,
    }

    if (editTarget) {
      const { error } = await supabase.from("rekonsiliasi_bank")
        .update({ saldo_buku: form.saldo_buku, catatan: form.catatan || null, saldo_sistem: saldoSistemForm })
        .eq("id", editTarget.id)
      if (error) {
        toast({ title: "Gagal menyimpan", description: error.message, variant: "destructive" })
        setSaving(false); return
      }
      toast({ title: "Rekonsiliasi diperbarui" })
    } else {
      const { error } = await supabase.from("rekonsiliasi_bank").insert(payload)
      if (error) {
        toast({ title: "Gagal menyimpan", description: error.message, variant: "destructive" })
        setSaving(false); return
      }
      toast({ title: isBalance ? "✓ Rekonsiliasi balance!" : "Rekonsiliasi disimpan (ada selisih)" })
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
    const { error } = await supabase.from("rekonsiliasi_bank").delete().eq("id", deleteTarget.id)
    setSaving(false)
    if (error) {
      toast({ title: "Gagal menghapus", variant: "destructive" })
      setDeleteTarget(null); return
    }
    toast({ title: "Rekonsiliasi dihapus" })
    setDeleteTarget(null)
    fetchData()
  }

  function openEdit(row: RekonsiliasiBankRow) {
    setEditTarget(row)
    setForm({
      akun_kas_id: row.akun_kas_id,
      periode: row.periode,
      saldo_buku: row.saldo_buku,
      catatan: row.catatan ?? "",
    })
    setSaldoSistemForm(row.saldo_sistem)
    setOpenForm(true)
  }

  // Stats
  const totalBalance   = data.filter(d => Math.abs(d.selisih) < 1).length
  const totalSelisih   = data.filter(d => Math.abs(d.selisih) >= 1).length
  const totalRekonsiliasi = data.length

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Rekonsiliasi Bank</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Cocokkan saldo sistem dengan saldo buku bank per periode
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={async () => { await fetchAkun(); await fetchData() }} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
          <Button size="sm" onClick={() => { setEditTarget(null); setForm(emptyForm()); setSaldoSistemForm(0); setOpenForm(true) }}
            disabled={akunKasList.length === 0}>
            <Plus className="w-4 h-4 mr-2" /> Rekonsiliasi Baru
          </Button>
        </div>
      </div>

      {akunKasList.length === 0 && !loading && (
        <div className="p-4 rounded-lg border border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20 text-sm text-yellow-800 dark:text-yellow-300">
          ⚠ Belum ada akun Kas/Bank. Buat akun kelompok <strong>ASET</strong> di Master Akun terlebih dahulu.
        </div>
      )}

      {/* Saldo sistem per akun saat ini */}
      {akunKasList.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Saldo Sistem Saat Ini</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {akunKasList.map(akun => (
                <div key={akun.kode} className="p-3 rounded-lg bg-muted/40 border">
                  <p className="text-xs font-mono text-muted-foreground">{akun.kode}</p>
                  <p className="text-sm font-medium text-foreground mt-0.5 truncate">{akun.nama}</p>
                  <p className="text-lg font-bold text-foreground mt-1">
                    {formatRp(saldoSistemMap.get(akun.kode) ?? 0)}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-5">
            <p className="text-xs text-muted-foreground">Total Rekonsiliasi</p>
            <p className="text-2xl font-bold text-foreground mt-1">{totalRekonsiliasi}</p>
          </CardContent>
        </Card>
        <Card className="border-green-200 dark:border-green-900">
          <CardContent className="p-5">
            <p className="text-xs text-muted-foreground">Balance</p>
            <p className="text-2xl font-bold text-green-600 mt-1">{totalBalance}</p>
          </CardContent>
        </Card>
        <Card className="border-red-200 dark:border-red-900">
          <CardContent className="p-5">
            <p className="text-xs text-muted-foreground">Ada Selisih</p>
            <p className="text-2xl font-bold text-destructive mt-1">{totalSelisih}</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabel riwayat rekonsiliasi */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Periode</TableHead>
                <TableHead>Akun Kas/Bank</TableHead>
                <TableHead className="text-right">Saldo Sistem</TableHead>
                <TableHead className="text-right">Saldo Buku Bank</TableHead>
                <TableHead className="text-right">Selisih</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Catatan</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12">
                    <div className="flex items-center justify-center gap-2 text-muted-foreground">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-foreground" /> Memuat...
                    </div>
                  </TableCell>
                </TableRow>
              ) : data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                    Belum ada data rekonsiliasi
                  </TableCell>
                </TableRow>
              ) : data.map(row => {
                const isRowBalance = Math.abs(row.selisih) < 1
                return (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium text-sm">
                      {getPeriodeLabel(row.periode)}
                    </TableCell>
                    <TableCell className="text-sm">
                      <span className="font-mono text-xs text-muted-foreground mr-1">{row.akun_kas_id}</span>
                      {akunMap.get(row.akun_kas_id) ?? "-"}
                    </TableCell>
                    <TableCell className="text-right text-sm">{formatRp(row.saldo_sistem)}</TableCell>
                    <TableCell className="text-right text-sm">{formatRp(row.saldo_buku)}</TableCell>
                    <TableCell className={`text-right text-sm font-semibold ${
                      isRowBalance ? "text-green-600" : "text-destructive"
                    }`}>
                      {row.selisih > 0 ? "+" : ""}{formatRp(row.selisih)}
                    </TableCell>
                    <TableCell>
                      {isRowBalance ? (
                        <div className="flex items-center gap-1.5">
                          <CheckCircle className="w-4 h-4 text-green-600" />
                          <Badge variant="success" className="text-xs">Balance</Badge>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <AlertCircle className="w-4 h-4 text-destructive" />
                          <Badge variant="destructive" className="text-xs">Selisih</Badge>
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[140px] truncate">
                      {row.catatan ?? "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-1 justify-end">
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(row)}>
                          <Pencil className="w-3.5 h-3.5 text-blue-500" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setDeleteTarget(row)}>
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

      {/* ── Form Dialog ── */}
      <Dialog open={openForm} onOpenChange={open => { if (!open) { setOpenForm(false); setEditTarget(null); setForm(emptyForm()) } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editTarget ? "Edit Rekonsiliasi" : "Rekonsiliasi Bank Baru"}</DialogTitle>
            <DialogDescription>
              Bandingkan saldo sistem dengan saldo fisik di buku bank
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Akun Kas/Bank *</Label>
                <Select
                  value={form.akun_kas_id}
                  onValueChange={v => setForm(p => ({ ...p, akun_kas_id: v }))}
                  disabled={!!editTarget}
                >
                  <SelectTrigger><SelectValue placeholder="-- Pilih akun --" /></SelectTrigger>
                  <SelectContent>
                    {akunKasList.map(a => (
                      <SelectItem key={a.kode} value={a.kode}>
                        <span className="font-mono text-xs mr-2 text-muted-foreground">{a.kode}</span>
                        {a.nama}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {editTarget && <p className="text-xs text-muted-foreground">Akun tidak bisa diubah</p>}
              </div>

              <div className="space-y-2">
                <Label>Periode *</Label>
                <Select
                  value={form.periode}
                  onValueChange={v => setForm(p => ({ ...p, periode: v }))}
                  disabled={!!editTarget}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PERIODE_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Saldo sistem — auto hitung */}
            <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Perbandingan Saldo
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Saldo Sistem (otomatis)</p>
                  <p className={`text-lg font-bold ${loadingSaldo ? "text-muted-foreground" : "text-foreground"}`}>
                    {loadingSaldo ? "Menghitung..." : formatRp(saldoSistemForm)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Dihitung dari jurnal s.d. akhir {form.periode ? getPeriodeLabel(form.periode) : "-"}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Saldo Buku Bank *</Label>
                  <Input
                    type="number" min="0"
                    value={form.saldo_buku || ""}
                    onChange={e => setForm(p => ({ ...p, saldo_buku: parseFloat(e.target.value) || 0 }))}
                    placeholder="0"
                    required
                  />
                  <p className="text-xs text-muted-foreground">Input dari rekening koran</p>
                </div>
              </div>

              {/* Selisih preview */}
              {form.akun_kas_id && !loadingSaldo && (
                <div className={`flex items-center justify-between p-3 rounded-lg ${
                  isBalance
                    ? "bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900"
                    : "bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900"
                }`}>
                  <div className="flex items-center gap-2">
                    {isBalance
                      ? <CheckCircle className="w-4 h-4 text-green-600" />
                      : <AlertCircle className="w-4 h-4 text-destructive" />
                    }
                    <span className={`text-sm font-medium ${isBalance ? "text-green-700 dark:text-green-400" : "text-destructive"}`}>
                      {isBalance ? "Balance ✓" : "Ada Selisih"}
                    </span>
                  </div>
                  <span className={`text-sm font-bold ${isBalance ? "text-green-700 dark:text-green-400" : "text-destructive"}`}>
                    {selisihForm > 0 ? "+" : ""}{formatRp(selisihForm)}
                  </span>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Catatan</Label>
              <Input
                value={form.catatan}
                onChange={e => setForm(p => ({ ...p, catatan: e.target.value }))}
                placeholder="Keterangan selisih, penyesuaian, dll (opsional)"
              />
            </div>

            <div className="flex gap-3 pt-1">
              <Button type="submit" disabled={saving || loadingSaldo} className="flex-1">
                {saving ? "Menyimpan..." : editTarget ? "Simpan Perubahan" : "Simpan Rekonsiliasi"}
              </Button>
              <Button type="button" variant="outline"
                onClick={() => { setOpenForm(false); setEditTarget(null); setForm(emptyForm()) }}>
                Batal
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Delete Dialog ── */}
      <Dialog open={!!deleteTarget} onOpenChange={open => !open && setDeleteTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Hapus Rekonsiliasi</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            Hapus rekonsiliasi{" "}
            <strong>{deleteTarget && getPeriodeLabel(deleteTarget.periode)}</strong>{" "}
            untuk akun <strong>{akunMap.get(deleteTarget?.akun_kas_id ?? "") ?? deleteTarget?.akun_kas_id}</strong>?
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
