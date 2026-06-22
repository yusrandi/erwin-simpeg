import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"
import { UnitSelector } from "@/components/UnitSelector"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, RefreshCw, ArrowDownCircle, ArrowUpCircle, ArrowLeftRight, Eye, Trash2 } from "lucide-react"
import { createJurnalOtomatis, generateNoJurnal, getSaldoAkun } from "@/lib/kasHelper"
import type { MasterAkun } from "@/types/keuangan"
import type { KasTransaksi } from "@/types/keuangan"

function formatRp(n: number) {
  return n.toLocaleString("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 })
}
function formatTgl(tgl: string) {
  return new Date(tgl).toLocaleDateString("id-ID", { dateStyle: "medium" })
}

export default function KasBank() {
  return (
    <UnitSelector>
      {(unitKerjaId, pesantrenId) => (
        <KasBankContent unitKerjaId={unitKerjaId} pesantrenId={pesantrenId} />
      )}
    </UnitSelector>
  )
}

function KasBankContent({ unitKerjaId, pesantrenId }: { unitKerjaId: string; pesantrenId: string }) {
  const { toast } = useToast()

  // Akun kas/bank dari master_akun kelompok ASET
  const [akunKasList, setAkunKasList] = useState<MasterAkun[]>([])
  // Semua akun untuk akun lawan
  const [semuaAkun, setSemuaAkun] = useState<MasterAkun[]>([])
  // Saldo per akun
  const [saldoMap, setSaldoMap] = useState<Map<string, number>>(new Map())
  // Transaksi
  const [transaksi, setTransaksi] = useState<KasTransaksi[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [viewTarget, setViewTarget] = useState<KasTransaksi | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<KasTransaksi | null>(null)

  // Form states
  const [openForm, setOpenForm] = useState(false)
  const [tipeForm, setTipeForm] = useState<"SALDO_AWAL" | "KAS_MASUK" | "KAS_KELUAR" | "TRANSFER">("KAS_MASUK")

  const emptyForm = () => ({
    tanggal: new Date().toISOString().slice(0, 10),
    akun_kas_id: "",
    akun_lawan_id: "",
    akun_kas_tujuan_id: "", // khusus transfer
    jumlah: 0,
    keterangan: "",
  })
  const [form, setForm] = useState(emptyForm())

  async function fetchAkun() {
    const { data: kas } = await supabase
      .from("master_akun").select("*")
      .eq("unit_kerja_id", unitKerjaId)
      .eq("kelompok", "ASET")
      .order("kode")
    setAkunKasList(kas ?? [])

    const { data: semua } = await supabase
      .from("master_akun").select("*")
      .eq("unit_kerja_id", unitKerjaId)
      .order("kode")
    setSemuaAkun(semua ?? [])

    // Hitung saldo per akun kas
    const map = new Map<string, number>()
    for (const akun of kas ?? []) {
      const saldo = await getSaldoAkun(akun.kode, akun.tipe_normal, unitKerjaId)
      map.set(akun.kode, saldo)
    }
    setSaldoMap(map)
  }

  async function fetchTransaksi() {
    setLoading(true)
    const { data } = await supabase
      .from("kas_transaksi").select("*")
      .eq("unit_kerja_id", unitKerjaId)
      .order("tanggal", { ascending: false })
      .order("id", { ascending: false })
    setTransaksi(data ?? [])
    setLoading(false)
  }

  useEffect(() => {
    async function init() {
      await fetchAkun()
      await fetchTransaksi()
    }
    init()
  }, [unitKerjaId])

  const akunMap = new Map(semuaAkun.map(a => [a.kode, a]))

  // Total saldo semua kas/bank
  const totalSaldo = Array.from(saldoMap.values()).reduce((s, v) => s + v, 0)

  function openTipeForm(tipe: typeof tipeForm) {
    setTipeForm(tipe)
    setForm(emptyForm())
    setOpenForm(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.akun_kas_id) { toast({ title: "Pilih akun kas/bank", variant: "destructive" }); return }
    if (form.jumlah <= 0) { toast({ title: "Jumlah harus lebih dari 0", variant: "destructive" }); return }

    setSaving(true)
    try {
      // Tentukan prefix no transaksi
      const prefixMap = {
        SALDO_AWAL: "SA",
        KAS_MASUK: "KM",
        KAS_KELUAR: "KK",
        TRANSFER: "TR",
      }
      const noTransaksi = await generateNoJurnal(unitKerjaId, prefixMap[tipeForm])

      // Tentukan debit/kredit
      let akunDebit = ""
      let akunKredit = ""
      let akunLawan = ""

      if (tipeForm === "SALDO_AWAL") {
        // Debit Kas, Kredit Modal/Ekuitas (akun lawan dipilih user)
        akunDebit = form.akun_kas_id
        akunKredit = form.akun_lawan_id
        akunLawan = form.akun_lawan_id
      } else if (tipeForm === "KAS_MASUK") {
        // Debit Kas, Kredit akun lawan (pendapatan/piutang)
        akunDebit = form.akun_kas_id
        akunKredit = form.akun_lawan_id
        akunLawan = form.akun_lawan_id
      } else if (tipeForm === "KAS_KELUAR") {
        // Debit akun lawan (biaya/hutang), Kredit Kas
        akunDebit = form.akun_lawan_id
        akunKredit = form.akun_kas_id
        akunLawan = form.akun_lawan_id
      } else if (tipeForm === "TRANSFER") {
        // Debit Kas Tujuan, Kredit Kas Sumber
        akunDebit = form.akun_kas_tujuan_id
        akunKredit = form.akun_kas_id
        akunLawan = form.akun_kas_tujuan_id
      }

      if (!akunDebit || !akunKredit) {
        toast({ title: "Pilih akun lawan transaksi", variant: "destructive" })
        setSaving(false); return
      }

      // Buat jurnal otomatis
      const jurnalId = await createJurnalOtomatis({
        unitKerjaId, pesantrenId,
        tanggal: form.tanggal,
        noTransaksi,
        keterangan: form.keterangan || `${tipeForm} - ${akunMap.get(form.akun_kas_id)?.nama}`,
        akunDebit, akunKredit,
        jumlah: form.jumlah,
      })

      if (!jurnalId) throw new Error("Gagal membuat jurnal otomatis")

      // Simpan kas_transaksi
      const { error } = await supabase.from("kas_transaksi").insert({
        unit_kerja_id: unitKerjaId,
        pesantren_id: pesantrenId,
        jurnal_id: jurnalId,
        tipe: tipeForm,
        tanggal: form.tanggal,
        no_transaksi: noTransaksi,
        akun_kas_id: form.akun_kas_id,
        akun_lawan_id: akunLawan,
        jumlah: form.jumlah,
        keterangan: form.keterangan || null,
      })
      if (error) throw error

      toast({ title: "Transaksi berhasil disimpan & jurnal dibuat otomatis" })
      setOpenForm(false)
      setForm(emptyForm())
      await fetchAkun()
      await fetchTransaksi()
    } catch (err: any) {
      toast({ title: "Gagal menyimpan", description: err.message, variant: "destructive" })
    }
    setSaving(false)
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setSaving(true)
    // Hapus jurnal juga (cascade ke jurnal_detail)
    if (deleteTarget.jurnal_id) {
      await supabase.from("jurnal_umum").delete().eq("id", deleteTarget.jurnal_id)
    }
    await supabase.from("kas_transaksi").delete().eq("id", deleteTarget.id)
    setSaving(false)
    toast({ title: "Transaksi dihapus" })
    setDeleteTarget(null)
    await fetchAkun()
    await fetchTransaksi()
  }

  const tipeBadge: Record<string, { label: string; variant: "default" | "success" | "secondary" | "destructive" }> = {
    SALDO_AWAL: { label: "Saldo Awal", variant: "secondary" },
    KAS_MASUK:  { label: "Kas Masuk", variant: "success" },
    KAS_KELUAR: { label: "Kas Keluar", variant: "destructive" },
    TRANSFER:   { label: "Transfer", variant: "default" },
  }

  // Akun lawan yang bisa dipilih (exclude akun kas sendiri)
  const akunLawanList = semuaAkun.filter(a => a.kode !== form.akun_kas_id)
  const akunKasTujuan = akunKasList.filter(a => a.kode !== form.akun_kas_id)

  // Group akun untuk dropdown
  const grouped = ["ASET","KEWAJIBAN","MODAL","PENDAPATAN","BEBAN"]
    .map(k => ({ kelompok: k, akuns: akunLawanList.filter(a => a.kelompok === k) }))
    .filter(g => g.akuns.length > 0)

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Kas & Bank</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Kelola transaksi kas dan rekening bank
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={async () => { await fetchAkun(); await fetchTransaksi() }} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>

      {/* Saldo per akun */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="lg:col-span-1 border-foreground/20 bg-muted/40">
          <CardContent className="p-5">
            <p className="text-xs text-muted-foreground">Total Saldo</p>
            <p className="text-2xl font-bold text-foreground mt-1">{formatRp(totalSaldo)}</p>
            <p className="text-xs text-muted-foreground mt-1">{akunKasList.length} akun kas/bank</p>
          </CardContent>
        </Card>
        {akunKasList.map(akun => (
          <Card key={akun.kode}>
            <CardContent className="p-5">
              <p className="text-xs text-muted-foreground font-mono">{akun.kode}</p>
              <p className="text-sm font-medium text-foreground mt-0.5 truncate">{akun.nama}</p>
              <p className="text-xl font-bold text-foreground mt-1">
                {formatRp(saldoMap.get(akun.kode) ?? 0)}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tombol aksi */}
      {akunKasList.length === 0 ? (
        <div className="p-4 rounded-lg border border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20 text-sm text-yellow-800 dark:text-yellow-300">
          ⚠ Belum ada akun Kas/Bank. Buat akun dengan kelompok <strong>ASET</strong> di halaman Master Akun terlebih dahulu.
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { tipe: "SALDO_AWAL" as const, icon: Plus, label: "Saldo Awal", color: "border-slate-200 hover:border-slate-400" },
            { tipe: "KAS_MASUK" as const, icon: ArrowDownCircle, label: "Kas Masuk", color: "border-green-200 hover:border-green-400 text-green-700" },
            { tipe: "KAS_KELUAR" as const, icon: ArrowUpCircle, label: "Kas Keluar", color: "border-red-200 hover:border-red-400 text-red-700" },
            { tipe: "TRANSFER" as const, icon: ArrowLeftRight, label: "Transfer", color: "border-blue-200 hover:border-blue-400 text-blue-700" },
          ].map(({ tipe, icon: Icon, label, color }) => (
            <button
              key={tipe}
              onClick={() => openTipeForm(tipe)}
              className={`flex items-center justify-center gap-2.5 p-4 rounded-xl border-2 transition-all bg-card font-medium text-sm ${color}`}
            >
              <Icon className="w-5 h-5" />
              {label}
            </button>
          ))}
        </div>
      )}

      {/* Tabs riwayat */}
      <Tabs defaultValue="semua">
        <TabsList className="w-full justify-start border-b rounded-none h-auto p-0 bg-transparent gap-0">
          {[
            { value: "semua", label: "Semua" },
            { value: "KAS_MASUK", label: "Kas Masuk" },
            { value: "KAS_KELUAR", label: "Kas Keluar" },
            { value: "TRANSFER", label: "Transfer" },
            { value: "SALDO_AWAL", label: "Saldo Awal" },
          ].map(tab => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-foreground data-[state=active]:bg-transparent px-4 py-2.5 text-sm font-medium text-muted-foreground data-[state=active]:text-foreground"
            >
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {["semua", "KAS_MASUK", "KAS_KELUAR", "TRANSFER", "SALDO_AWAL"].map(tab => (
          <TabsContent key={tab} value={tab} className="mt-4">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>Tanggal</TableHead>
                      <TableHead>No. Transaksi</TableHead>
                      <TableHead>Tipe</TableHead>
                      <TableHead>Akun Kas</TableHead>
                      <TableHead>Akun Lawan</TableHead>
                      <TableHead>Keterangan</TableHead>
                      <TableHead className="text-right">Jumlah</TableHead>
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
                    ) : transaksi.filter(t => tab === "semua" || t.tipe === tab).length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                          Belum ada transaksi
                        </TableCell>
                      </TableRow>
                    ) : transaksi
                        .filter(t => tab === "semua" || t.tipe === tab)
                        .map(t => {
                          const badge = tipeBadge[t.tipe]
                          return (
                            <TableRow key={t.id}>
                              <TableCell className="text-sm">{formatTgl(t.tanggal)}</TableCell>
                              <TableCell className="font-mono text-xs">{t.no_transaksi}</TableCell>
                              <TableCell>
                                <Badge variant={badge.variant} className="text-xs">{badge.label}</Badge>
                              </TableCell>
                              <TableCell className="text-sm">
                                {akunMap.get(t.akun_kas_id)?.nama ?? t.akun_kas_id}
                              </TableCell>
                              <TableCell className="text-sm">
                                {akunMap.get(t.akun_lawan_id)?.nama ?? t.akun_lawan_id}
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground max-w-[160px] truncate">
                                {t.keterangan ?? "-"}
                              </TableCell>
                              <TableCell className={`text-right text-sm font-semibold ${
                                t.tipe === "KAS_MASUK" || t.tipe === "SALDO_AWAL" ? "text-green-600" :
                                t.tipe === "KAS_KELUAR" ? "text-destructive" : ""
                              }`}>
                                {t.tipe === "KAS_KELUAR" ? "-" : "+"}{formatRp(t.jumlah)}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex gap-1 justify-end">
                                  <Button size="icon" variant="ghost" className="h-7 w-7"
                                    onClick={() => setViewTarget(t)}>
                                    <Eye className="w-3.5 h-3.5" />
                                  </Button>
                                  <Button size="icon" variant="ghost" className="h-7 w-7"
                                    onClick={() => setDeleteTarget(t)}>
                                    <Trash2 className="w-3.5 h-3.5 text-destructive" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          )
                        })
                    }
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      {/* ── Form Dialog ── */}
      <Dialog open={openForm} onOpenChange={open => { if (!open) { setOpenForm(false); setForm(emptyForm()) } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {tipeForm === "SALDO_AWAL" && "Input Saldo Awal"}
              {tipeForm === "KAS_MASUK" && "Kas Masuk"}
              {tipeForm === "KAS_KELUAR" && "Kas Keluar"}
              {tipeForm === "TRANSFER" && "Transfer Kas/Bank"}
            </DialogTitle>
            <DialogDescription>
              Jurnal akan dibuat otomatis setelah transaksi disimpan.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tanggal *</Label>
                <Input type="date" value={form.tanggal}
                  onChange={e => setForm(p => ({ ...p, tanggal: e.target.value }))} required />
              </div>
              <div className="space-y-2">
                <Label>Jumlah *</Label>
                <Input type="number" min="1" value={form.jumlah || ""}
                  onChange={e => setForm(p => ({ ...p, jumlah: parseFloat(e.target.value) || 0 }))}
                  placeholder="0" required />
              </div>
            </div>

            {/* Akun kas sumber */}
            <div className="space-y-2">
              <Label>
                {tipeForm === "TRANSFER" ? "Akun Kas Sumber *" :
                 tipeForm === "KAS_MASUK" ? "Masuk ke Akun *" :
                 tipeForm === "KAS_KELUAR" ? "Keluar dari Akun *" :
                 "Akun Kas/Bank *"}
              </Label>
              <Select value={form.akun_kas_id} onValueChange={v => setForm(p => ({ ...p, akun_kas_id: v }))}>
                <SelectTrigger><SelectValue placeholder="-- Pilih akun kas/bank --" /></SelectTrigger>
                <SelectContent>
                  {akunKasList.map(a => (
                    <SelectItem key={a.kode} value={a.kode}>
                      <span className="font-mono text-xs mr-2 text-muted-foreground">{a.kode}</span>
                      {a.nama} — <span className="text-muted-foreground">{formatRp(saldoMap.get(a.kode) ?? 0)}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Akun lawan / tujuan */}
            {tipeForm === "TRANSFER" ? (
              <div className="space-y-2">
                <Label>Akun Kas Tujuan *</Label>
                <Select value={form.akun_kas_tujuan_id}
                  onValueChange={v => setForm(p => ({ ...p, akun_kas_tujuan_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="-- Pilih akun tujuan --" /></SelectTrigger>
                  <SelectContent>
                    {akunKasTujuan.map(a => (
                      <SelectItem key={a.kode} value={a.kode}>
                        <span className="font-mono text-xs mr-2 text-muted-foreground">{a.kode}</span>
                        {a.nama}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="space-y-2">
                <Label>
                  {tipeForm === "SALDO_AWAL" ? "Akun Modal/Ekuitas *" :
                   tipeForm === "KAS_MASUK" ? "Sumber Dana (Akun Kredit) *" :
                   "Tujuan Pengeluaran (Akun Debit) *"}
                </Label>
                <Select value={form.akun_lawan_id}
                  onValueChange={v => setForm(p => ({ ...p, akun_lawan_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="-- Pilih akun lawan --" /></SelectTrigger>
                  <SelectContent>
                    {grouped.map(g => (
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
                <p className="text-xs text-muted-foreground">
                  {tipeForm === "SALDO_AWAL" && "Pilih akun Modal atau Ekuitas pesantren"}
                  {tipeForm === "KAS_MASUK" && "Contoh: Pendapatan SPP, Piutang, dll"}
                  {tipeForm === "KAS_KELUAR" && "Contoh: Beban Gaji, Biaya ATK, dll"}
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label>Keterangan</Label>
              <Input value={form.keterangan}
                onChange={e => setForm(p => ({ ...p, keterangan: e.target.value }))}
                placeholder="Opsional" />
            </div>

            {/* Preview jurnal */}
            {form.akun_kas_id && form.jumlah > 0 && (
              <div className="rounded-lg border p-3 bg-muted/30 space-y-2">
                <p className="text-xs font-semibold text-muted-foreground">Preview Jurnal Otomatis:</p>
                <div className="space-y-1 text-xs">
                  {tipeForm === "KAS_MASUK" && <>
                    <div className="flex justify-between">
                      <span className="text-foreground">Debit: {akunMap.get(form.akun_kas_id)?.nama ?? form.akun_kas_id}</span>
                      <span className="font-medium">{formatRp(form.jumlah)}</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground pl-4">
                      <span>Kredit: {form.akun_lawan_id ? akunMap.get(form.akun_lawan_id)?.nama : "—"}</span>
                      <span>{formatRp(form.jumlah)}</span>
                    </div>
                  </>}
                  {tipeForm === "KAS_KELUAR" && <>
                    <div className="flex justify-between">
                      <span className="text-foreground">Debit: {form.akun_lawan_id ? akunMap.get(form.akun_lawan_id)?.nama : "—"}</span>
                      <span className="font-medium">{formatRp(form.jumlah)}</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground pl-4">
                      <span>Kredit: {akunMap.get(form.akun_kas_id)?.nama ?? form.akun_kas_id}</span>
                      <span>{formatRp(form.jumlah)}</span>
                    </div>
                  </>}
                  {tipeForm === "SALDO_AWAL" && <>
                    <div className="flex justify-between">
                      <span className="text-foreground">Debit: {akunMap.get(form.akun_kas_id)?.nama ?? form.akun_kas_id}</span>
                      <span className="font-medium">{formatRp(form.jumlah)}</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground pl-4">
                      <span>Kredit: {form.akun_lawan_id ? akunMap.get(form.akun_lawan_id)?.nama : "—"}</span>
                      <span>{formatRp(form.jumlah)}</span>
                    </div>
                  </>}
                  {tipeForm === "TRANSFER" && <>
                    <div className="flex justify-between">
                      <span className="text-foreground">Debit: {form.akun_kas_tujuan_id ? akunMap.get(form.akun_kas_tujuan_id)?.nama : "—"}</span>
                      <span className="font-medium">{formatRp(form.jumlah)}</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground pl-4">
                      <span>Kredit: {akunMap.get(form.akun_kas_id)?.nama ?? form.akun_kas_id}</span>
                      <span>{formatRp(form.jumlah)}</span>
                    </div>
                  </>}
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-1">
              <Button type="submit" disabled={saving} className="flex-1">
                {saving ? "Menyimpan..." : "Simpan Transaksi"}
              </Button>
              <Button type="button" variant="outline"
                onClick={() => { setOpenForm(false); setForm(emptyForm()) }}>
                Batal
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── View Dialog ── */}
      <Dialog open={!!viewTarget} onOpenChange={open => !open && setViewTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Detail Transaksi</DialogTitle>
            <DialogDescription>{viewTarget?.no_transaksi}</DialogDescription>
          </DialogHeader>
          {viewTarget && (
            <div className="space-y-3 text-sm">
              {[
                { label: "Tanggal", value: formatTgl(viewTarget.tanggal) },
                { label: "Tipe", value: tipeBadge[viewTarget.tipe]?.label },
                { label: "Akun Kas", value: akunMap.get(viewTarget.akun_kas_id)?.nama ?? viewTarget.akun_kas_id },
                { label: "Akun Lawan", value: akunMap.get(viewTarget.akun_lawan_id)?.nama ?? viewTarget.akun_lawan_id },
                { label: "Jumlah", value: formatRp(viewTarget.jumlah) },
                { label: "Keterangan", value: viewTarget.keterangan ?? "-" },
                { label: "No. Jurnal", value: viewTarget.jurnal_id ? `#${viewTarget.jurnal_id}` : "-" },
              ].map(item => (
                <div key={item.label} className="flex justify-between border-b border-muted pb-2 last:border-0">
                  <span className="text-muted-foreground">{item.label}</span>
                  <span className="font-medium text-right">{item.value}</span>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Delete Dialog ── */}
      <Dialog open={!!deleteTarget} onOpenChange={open => !open && setDeleteTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Hapus Transaksi</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            Hapus transaksi <span className="font-mono font-semibold text-foreground">{deleteTarget?.no_transaksi}</span>?
            <br /><span className="text-destructive text-xs mt-1 block">⚠ Jurnal terkait akan ikut terhapus.</span>
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
