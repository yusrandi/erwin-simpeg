import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"
import { UnitSelector } from "@/components/UnitSelector"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, RefreshCw, Pencil, Trash2, CreditCard, Settings2 } from "lucide-react"
import { createJurnalOtomatis, generateNoJurnal } from "@/lib/kasHelper"
import type { PosHutang, Hutang as HutangType, BayarHutang } from "@/types/keuangan"
import type { MasterAkun } from "@/types/keuangan"
import type { UnitKerja } from "@/types/auth"

function formatRp(n: number) {
  return n.toLocaleString("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 })
}
function formatTgl(tgl: string) {
  return new Date(tgl).toLocaleDateString("id-ID", { dateStyle: "medium" })
}

const statusBadge: Record<string, { label: string; variant: "default" | "success" | "secondary" | "destructive" }> = {
  BELUM_LUNAS: { label: "Belum Lunas", variant: "destructive" },
  SEBAGIAN:    { label: "Sebagian", variant: "default" },
  LUNAS:       { label: "Lunas", variant: "success" },
}

export default function Hutang() {
  return (
    <UnitSelector>
      {(unitKerjaId, pesantrenId) => (
        <HutangContent unitKerjaId={unitKerjaId} pesantrenId={pesantrenId} />
      )}
    </UnitSelector>
  )
}

function HutangContent({ unitKerjaId, pesantrenId }: { unitKerjaId: string; pesantrenId: string }) {
  const { toast } = useToast()

  // Data
  const [posHutangList, setPosHutangList]   = useState<PosHutang[]>([])
  const [hutangList, setHutangList]         = useState<HutangType[]>([])
  const [bayarList, setBayarList]           = useState<BayarHutang[]>([])
  const [unitList, setUnitList]             = useState<UnitKerja[]>([])
  const [akunList, setAkunList]             = useState<MasterAkun[]>([])
  const [akunKasList, setAkunKasList]       = useState<MasterAkun[]>([])
  const [akunMap, setAkunMap]               = useState<Map<string, string>>(new Map())
  const [loading, setLoading]               = useState(true)
  const [saving, setSaving]                 = useState(false)

  // Dialog states
  const [openPos, setOpenPos]               = useState(false)
  const [openHutang, setOpenHutang]         = useState(false)
  const [openBayar, setOpenBayar]           = useState(false)
  const [openDetail, setOpenDetail]         = useState(false)
  const [editPosTarget, setEditPosTarget]   = useState<PosHutang | null>(null)
  const [deletePosTarget, setDeletePosTarget] = useState<PosHutang | null>(null)
  const [deleteHutangTarget, setDeleteHutangTarget] = useState<HutangType | null>(null)
  const [selectedHutang, setSelectedHutang] = useState<HutangType | null>(null)

  // Forms
  const emptyPosForm  = () => ({ nama: "", akun_kode: "", keterangan: "" })
  const emptyHutangForm = () => ({
    tanggal: new Date().toISOString().slice(0, 10),
    pos_hutang_id: "",
    unit_pemberi_id: "",
    jumlah: 0,
    keterangan: "",
  })
  const emptyBayarForm = () => ({
    tanggal: new Date().toISOString().slice(0, 10),
    jumlah_bayar: 0,
    akun_kas_id: "",
    keterangan: "",
  })

  const [posForm, setPosForm]     = useState(emptyPosForm())
  const [hutangForm, setHutangForm] = useState(emptyHutangForm())
  const [bayarForm, setBayarForm]   = useState(emptyBayarForm())

  // ── Fetch ──────────────────────────────────────────────
  async function fetchAll() {
    setLoading(true)

    // Pos hutang
    const { data: pos } = await supabase
      .from("pos_hutang").select("*")
      .eq("unit_kerja_id", unitKerjaId).order("nama")
    setPosHutangList(pos ?? [])

    // Hutang — fetch terpisah lalu join manual
    const { data: hutang } = await supabase
      .from("hutang").select("*")
      .eq("unit_kerja_id", unitKerjaId)
      .order("tanggal", { ascending: false })

    // Bayar hutang
    const hutangIds = (hutang ?? []).map(h => h.id)
    const { data: bayar } = hutangIds.length
      ? await supabase.from("bayar_hutang").select("*").in("hutang_id", hutangIds).order("tanggal", { ascending: false })
      : { data: [] }
    setBayarList(bayar ?? [])

    // Build pos map & unit pemberi map
    const posMap = new Map((pos ?? []).map(p => [p.id, p]))

    // Unit kerja list (untuk unit pemberi)
    const { data: units } = await supabase
      .from("unit_kerja").select("*").eq("pesantren_id", pesantrenId).order("nama")
    setUnitList(units ?? [])
    const unitMap = new Map((units ?? []).map(u => [u.id, u]))

    // Gabungkan hutang dengan join manual
    const hutangWithJoin: HutangType[] = (hutang ?? []).map(h => ({
      ...h,
      pos_hutang: posMap.get(h.pos_hutang_id)
        ? { nama: posMap.get(h.pos_hutang_id)!.nama, akun_kode: posMap.get(h.pos_hutang_id)!.akun_kode }
        : undefined,
      unit_pemberi: h.unit_pemberi_id && unitMap.get(h.unit_pemberi_id)
        ? { nama: unitMap.get(h.unit_pemberi_id)!.nama }
        : undefined,
    }))
    setHutangList(hutangWithJoin)

    // Master akun
    const { data: akun } = await supabase
      .from("master_akun").select("*")
      .eq("unit_kerja_id", unitKerjaId).order("kode")
    setAkunList(akun ?? [])
    setAkunKasList((akun ?? []).filter(a => a.kelompok === "ASET"))
    setAkunMap(new Map((akun ?? []).map(a => [a.kode, a.nama])))

    setLoading(false)
  }

  useEffect(() => { fetchAll() }, [unitKerjaId])

  // ── Stats ──────────────────────────────────────────────
  const totalHutang     = hutangList.reduce((s, h) => s + Number(h.jumlah), 0)
  const totalSisaHutang = hutangList.reduce((s, h) => s + Number(h.sisa_hutang), 0)
  const totalLunas      = hutangList.filter(h => h.status === "LUNAS").length
  const totalBelumLunas = hutangList.filter(h => h.status !== "LUNAS").length

  // ── Pos Hutang CRUD ────────────────────────────────────
  async function handleSavePos(e: React.FormEvent) {
    e.preventDefault()
    if (!posForm.akun_kode) { toast({ title: "Pilih akun hutang", variant: "destructive" }); return }
    setSaving(true)

    if (editPosTarget) {
      const { error } = await supabase.from("pos_hutang").update(posForm).eq("id", editPosTarget.id)
      if (error) { toast({ title: "Gagal menyimpan", description: error.message, variant: "destructive" }); setSaving(false); return }
      toast({ title: "Pos hutang diperbarui" })
    } else {
      const { error } = await supabase.from("pos_hutang")
        .insert({ ...posForm, unit_kerja_id: unitKerjaId, pesantren_id: pesantrenId })
      if (error) { toast({ title: "Gagal menyimpan", description: error.message, variant: "destructive" }); setSaving(false); return }
      toast({ title: "Pos hutang ditambahkan" })
    }

    setSaving(false); setOpenPos(false); setEditPosTarget(null); setPosForm(emptyPosForm()); fetchAll()
  }

  async function handleDeletePos() {
    if (!deletePosTarget) return
    setSaving(true)
    const { error } = await supabase.from("pos_hutang").delete().eq("id", deletePosTarget.id)
    setSaving(false)
    if (error) { toast({ title: "Gagal menghapus", description: "Pos masih digunakan oleh data hutang.", variant: "destructive" }); setDeletePosTarget(null); return }
    toast({ title: "Pos hutang dihapus" })
    setDeletePosTarget(null); fetchAll()
  }

  // ── Tambah Hutang ──────────────────────────────────────
  async function handleSaveHutang(e: React.FormEvent) {
    e.preventDefault()
    if (!hutangForm.pos_hutang_id) { toast({ title: "Pilih pos hutang", variant: "destructive" }); return }
    if (hutangForm.jumlah <= 0) { toast({ title: "Jumlah harus lebih dari 0", variant: "destructive" }); return }
    setSaving(true)

    try {
      const pos = posHutangList.find(p => p.id === parseInt(hutangForm.pos_hutang_id))
      if (!pos) throw new Error("Pos hutang tidak ditemukan")

      const noHutang = await generateNoJurnal(unitKerjaId, "HT")

      // Jurnal: Debit Kas/Aset, Kredit Hutang
      // Saat terima hutang: kas bertambah (debit kas), hutang bertambah (kredit akun hutang)
      // Tapi kita buat jurnal nanti saat bayar. Saat terima hutang cukup catat saja.
      // Atau bisa buat jurnal: Debit Kas, Kredit Hutang (jika ada akun kas tujuan)
      // Untuk simplicity, jurnal dibuat saat bayar hutang saja

      const { error } = await supabase.from("hutang").insert({
        unit_kerja_id: unitKerjaId,
        pesantren_id: pesantrenId,
        pos_hutang_id: parseInt(hutangForm.pos_hutang_id),
        unit_pemberi_id: hutangForm.unit_pemberi_id || null,
        tanggal: hutangForm.tanggal,
        no_hutang: noHutang,
        jumlah: hutangForm.jumlah,
        sisa_hutang: hutangForm.jumlah,
        keterangan: hutangForm.keterangan || null,
        status: "BELUM_LUNAS",
        jurnal_id: null,
      })
      if (error) throw error

      toast({ title: "Hutang berhasil dicatat" })
      setOpenHutang(false)
      setHutangForm(emptyHutangForm())
      fetchAll()
    } catch (err: any) {
      toast({ title: "Gagal menyimpan", description: err.message, variant: "destructive" })
    }
    setSaving(false)
  }

  async function handleDeleteHutang() {
    if (!deleteHutangTarget) return
    setSaving(true)
    if (deleteHutangTarget.jurnal_id) {
      await supabase.from("jurnal_umum").delete().eq("id", deleteHutangTarget.jurnal_id)
    }
    await supabase.from("hutang").delete().eq("id", deleteHutangTarget.id)
    setSaving(false)
    toast({ title: "Hutang dihapus" })
    setDeleteHutangTarget(null); fetchAll()
  }

  // ── Bayar Hutang ───────────────────────────────────────
  async function handleBayarHutang(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedHutang) return
    if (!bayarForm.akun_kas_id) { toast({ title: "Pilih akun kas", variant: "destructive" }); return }
    if (bayarForm.jumlah_bayar <= 0) { toast({ title: "Jumlah bayar harus lebih dari 0", variant: "destructive" }); return }
    if (bayarForm.jumlah_bayar > selectedHutang.sisa_hutang) {
      toast({ title: "Jumlah bayar melebihi sisa hutang", variant: "destructive" }); return
    }

    setSaving(true)
    try {
      const noBayar = await generateNoJurnal(unitKerjaId, "BH")
      const pos = posHutangList.find(p => p.id === selectedHutang.pos_hutang_id)

      // Jurnal: Debit Akun Hutang, Kredit Kas
      const jurnalId = await createJurnalOtomatis({
        unitKerjaId, pesantrenId,
        tanggal: bayarForm.tanggal,
        noTransaksi: noBayar,
        keterangan: bayarForm.keterangan || `Bayar hutang ${selectedHutang.no_hutang}`,
        akunDebit: pos?.akun_kode ?? "",   // Debit akun hutang (mengurangi kewajiban)
        akunKredit: bayarForm.akun_kas_id, // Kredit kas
        jumlah: bayarForm.jumlah_bayar,
      })
      if (!jurnalId) throw new Error("Gagal membuat jurnal")

      // Simpan bayar_hutang
      const { error: bayarError } = await supabase.from("bayar_hutang").insert({
        hutang_id: selectedHutang.id,
        unit_kerja_id: unitKerjaId,
        pesantren_id: pesantrenId,
        jurnal_id: jurnalId,
        tanggal: bayarForm.tanggal,
        jumlah_bayar: bayarForm.jumlah_bayar,
        akun_kas_id: bayarForm.akun_kas_id,
        keterangan: bayarForm.keterangan || null,
      })
      if (bayarError) throw bayarError

      // Update sisa_hutang & status
      const sisaBaru = Number(selectedHutang.sisa_hutang) - bayarForm.jumlah_bayar
      const statusBaru = sisaBaru <= 0 ? "LUNAS" : "SEBAGIAN"

      await supabase.from("hutang").update({
        sisa_hutang: Math.max(0, sisaBaru),
        status: statusBaru,
      }).eq("id", selectedHutang.id)

      toast({ title: `Pembayaran berhasil. Status: ${statusBaru}` })
      setOpenBayar(false)
      setBayarForm(emptyBayarForm())
      setSelectedHutang(null)
      fetchAll()
    } catch (err: any) {
      toast({ title: "Gagal menyimpan", description: err.message, variant: "destructive" })
    }
    setSaving(false)
  }

  // ── Riwayat bayar per hutang ───────────────────────────
  function getRiwayatBayar(hutangId: number) {
    return bayarList.filter(b => b.hutang_id === hutangId)
  }

  // Akun kewajiban untuk pos hutang
  const akunKewajiban = akunList.filter(a => a.kelompok === "KEWAJIBAN")

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Hutang</h1>
          <p className="text-sm text-muted-foreground mt-1">Kelola hutang internal antar unit</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => { setEditPosTarget(null); setPosForm(emptyPosForm()); setOpenPos(true) }}>
            <Settings2 className="w-4 h-4 mr-2" /> Pos Hutang
          </Button>
          <Button variant="outline" size="sm" onClick={fetchAll} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
          <Button size="sm" onClick={() => { setHutangForm(emptyHutangForm()); setOpenHutang(true) }}
            disabled={posHutangList.length === 0}>
            <Plus className="w-4 h-4 mr-2" /> Catat Hutang
          </Button>
        </div>
      </div>

      {posHutangList.length === 0 && !loading && (
        <div className="p-4 rounded-lg border border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20 text-sm text-yellow-800 dark:text-yellow-300">
          ⚠ Buat <strong>Pos Hutang</strong> terlebih dahulu. Klik tombol "Pos Hutang" di atas.
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Hutang", value: formatRp(totalHutang) },
          { label: "Sisa Hutang", value: formatRp(totalSisaHutang), highlight: true },
          { label: "Belum Lunas", value: `${totalBelumLunas} hutang` },
          { label: "Sudah Lunas", value: `${totalLunas} hutang` },
        ].map(s => (
          <Card key={s.label} className={s.highlight ? "border-destructive/30 bg-destructive/5" : ""}>
            <CardContent className="p-5">
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className={`text-xl font-bold mt-1 ${s.highlight ? "text-destructive" : "text-foreground"}`}>
                {s.value}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabel hutang dengan tabs */}
      <Tabs defaultValue="semua">
        <TabsList className="w-full justify-start border-b rounded-none h-auto p-0 bg-transparent gap-0">
          {[
            { value: "semua", label: "Semua" },
            { value: "BELUM_LUNAS", label: "Belum Lunas" },
            { value: "SEBAGIAN", label: "Sebagian" },
            { value: "LUNAS", label: "Lunas" },
          ].map(tab => (
            <TabsTrigger key={tab.value} value={tab.value}
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-foreground data-[state=active]:bg-transparent px-4 py-2.5 text-sm font-medium text-muted-foreground data-[state=active]:text-foreground">
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {["semua", "BELUM_LUNAS", "SEBAGIAN", "LUNAS"].map(tab => (
          <TabsContent key={tab} value={tab} className="mt-4">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>Tanggal</TableHead>
                      <TableHead>No. Hutang</TableHead>
                      <TableHead>Pos Hutang</TableHead>
                      <TableHead>Unit Pemberi</TableHead>
                      <TableHead className="text-right">Jumlah</TableHead>
                      <TableHead className="text-right">Sisa</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow><TableCell colSpan={8} className="text-center py-12">
                        <div className="flex items-center justify-center gap-2 text-muted-foreground">
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-foreground" /> Memuat...
                        </div>
                      </TableCell></TableRow>
                    ) : hutangList.filter(h => tab === "semua" || h.status === tab).length === 0 ? (
                      <TableRow><TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                        Tidak ada data hutang
                      </TableCell></TableRow>
                    ) : hutangList
                        .filter(h => tab === "semua" || h.status === tab)
                        .map(h => (
                          <TableRow key={h.id}>
                            <TableCell className="text-sm">{formatTgl(h.tanggal)}</TableCell>
                            <TableCell className="font-mono text-xs">{h.no_hutang}</TableCell>
                            <TableCell className="text-sm">{h.pos_hutang?.nama ?? "-"}</TableCell>
                            <TableCell className="text-sm">{h.unit_pemberi?.nama ?? <span className="text-muted-foreground italic">Eksternal</span>}</TableCell>
                            <TableCell className="text-right text-sm font-medium">{formatRp(Number(h.jumlah))}</TableCell>
                            <TableCell className={`text-right text-sm font-semibold ${h.sisa_hutang > 0 ? "text-destructive" : "text-green-600"}`}>
                              {formatRp(Number(h.sisa_hutang))}
                            </TableCell>
                            <TableCell>
                              <Badge variant={statusBadge[h.status].variant} className="text-xs">
                                {statusBadge[h.status].label}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex gap-1 justify-end">
                                <Button size="icon" variant="ghost" className="h-7 w-7"
                                  title="Lihat riwayat & bayar"
                                  onClick={() => { setSelectedHutang(h); setOpenDetail(true) }}>
                                  <CreditCard className="w-3.5 h-3.5 text-blue-500" />
                                </Button>
                                {h.status !== "LUNAS" && (
                                  <Button size="icon" variant="ghost" className="h-7 w-7"
                                    title="Bayar hutang"
                                    onClick={() => { setSelectedHutang(h); setBayarForm(emptyBayarForm()); setOpenBayar(true) }}>
                                    <Pencil className="w-3.5 h-3.5 text-green-600" />
                                  </Button>
                                )}
                                <Button size="icon" variant="ghost" className="h-7 w-7"
                                  onClick={() => setDeleteHutangTarget(h)}>
                                  <Trash2 className="w-3.5 h-3.5 text-destructive" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                    }
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      {/* ── Dialog Pos Hutang ── */}
      <Dialog open={openPos} onOpenChange={open => { if (!open) { setOpenPos(false); setEditPosTarget(null); setDeletePosTarget(null) } }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Kelola Pos Hutang</DialogTitle>
            <DialogDescription>Kategori jenis hutang internal</DialogDescription>
          </DialogHeader>

          {/* Form tambah/edit pos */}
          <form onSubmit={handleSavePos} className="grid grid-cols-3 gap-3 pb-4 border-b">
            <div className="space-y-2">
              <Label>Nama Pos *</Label>
              <Input value={posForm.nama}
                onChange={e => setPosForm(p => ({ ...p, nama: e.target.value }))}
                placeholder="Hutang Operasional" required />
            </div>
            <div className="space-y-2">
              <Label>Akun Kewajiban *</Label>
              <Select value={posForm.akun_kode} onValueChange={v => setPosForm(p => ({ ...p, akun_kode: v }))}>
                <SelectTrigger><SelectValue placeholder="-- Pilih akun --" /></SelectTrigger>
                <SelectContent>
                  {akunKewajiban.length === 0 ? (
                    <div className="px-2 py-3 text-xs text-muted-foreground text-center">Belum ada akun KEWAJIBAN</div>
                  ) : akunKewajiban.map(a => (
                    <SelectItem key={a.kode} value={a.kode}>
                      <span className="font-mono text-xs mr-2 text-muted-foreground">{a.kode}</span>{a.nama}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Keterangan</Label>
              <Input value={posForm.keterangan}
                onChange={e => setPosForm(p => ({ ...p, keterangan: e.target.value }))}
                placeholder="Opsional" />
            </div>
            <div className="col-span-3 flex gap-2">
              <Button type="submit" size="sm" disabled={saving}>
                <Plus className="w-4 h-4 mr-1" />
                {editPosTarget ? "Simpan Perubahan" : "Tambah Pos"}
              </Button>
              {editPosTarget && (
                <Button type="button" size="sm" variant="outline"
                  onClick={() => { setEditPosTarget(null); setPosForm(emptyPosForm()) }}>
                  Batal Edit
                </Button>
              )}
            </div>
          </form>

          {/* List pos hutang */}
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Nama Pos</TableHead>
                <TableHead>Akun</TableHead>
                <TableHead>Keterangan</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {posHutangList.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="text-center py-6 text-muted-foreground text-sm">
                  Belum ada pos hutang
                </TableCell></TableRow>
              ) : posHutangList.map(p => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium text-sm">{p.nama}</TableCell>
                  <TableCell className="text-sm">
                    <span className="font-mono text-xs text-muted-foreground mr-1">{p.akun_kode}</span>
                    {akunMap.get(p.akun_kode) ?? "-"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{p.keterangan ?? "-"}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-1 justify-end">
                      <Button size="icon" variant="ghost" className="h-7 w-7"
                        onClick={() => { setEditPosTarget(p); setPosForm({ nama: p.nama, akun_kode: p.akun_kode, keterangan: p.keterangan ?? "" }) }}>
                        <Pencil className="w-3.5 h-3.5 text-blue-500" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7"
                        onClick={() => setDeletePosTarget(p)}>
                        <Trash2 className="w-3.5 h-3.5 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DialogContent>
      </Dialog>

      {/* ── Dialog Catat Hutang ── */}
      <Dialog open={openHutang} onOpenChange={open => { if (!open) { setOpenHutang(false); setHutangForm(emptyHutangForm()) } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Catat Hutang Baru</DialogTitle>
            <DialogDescription>Hutang internal antar unit dalam pesantren</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveHutang} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tanggal *</Label>
                <Input type="date" value={hutangForm.tanggal}
                  onChange={e => setHutangForm(p => ({ ...p, tanggal: e.target.value }))} required />
              </div>
              <div className="space-y-2">
                <Label>Jumlah *</Label>
                <Input type="number" min="1" value={hutangForm.jumlah || ""}
                  onChange={e => setHutangForm(p => ({ ...p, jumlah: parseFloat(e.target.value) || 0 }))}
                  placeholder="0" required />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Pos Hutang *</Label>
              <Select value={hutangForm.pos_hutang_id}
                onValueChange={v => setHutangForm(p => ({ ...p, pos_hutang_id: v }))}>
                <SelectTrigger><SelectValue placeholder="-- Pilih pos hutang --" /></SelectTrigger>
                <SelectContent>
                  {posHutangList.map(p => (
                    <SelectItem key={p.id} value={String(p.id)}>{p.nama}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Unit Pemberi (Opsional)</Label>
              <Select value={hutangForm.unit_pemberi_id}
                onValueChange={v => setHutangForm(p => ({ ...p, unit_pemberi_id: v === "none" ? "" : v }))}>
                <SelectTrigger><SelectValue placeholder="-- Pilih unit pemberi --" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Eksternal / Tidak Ada</SelectItem>
                  {unitList.filter(u => u.id !== unitKerjaId).map(u => (
                    <SelectItem key={u.id} value={u.id}>{u.nama}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Kosongkan jika hutang dari pihak luar</p>
            </div>
            <div className="space-y-2">
              <Label>Keterangan</Label>
              <Input value={hutangForm.keterangan}
                onChange={e => setHutangForm(p => ({ ...p, keterangan: e.target.value }))}
                placeholder="Opsional" />
            </div>
            <div className="flex gap-3 pt-1">
              <Button type="submit" disabled={saving} className="flex-1">
                {saving ? "Menyimpan..." : "Catat Hutang"}
              </Button>
              <Button type="button" variant="outline"
                onClick={() => { setOpenHutang(false); setHutangForm(emptyHutangForm()) }}>
                Batal
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Dialog Bayar Hutang ── */}
      <Dialog open={openBayar} onOpenChange={open => { if (!open) { setOpenBayar(false); setBayarForm(emptyBayarForm()) } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Bayar Hutang</DialogTitle>
            <DialogDescription>
              {selectedHutang?.no_hutang} — Sisa: {formatRp(Number(selectedHutang?.sisa_hutang ?? 0))}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleBayarHutang} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tanggal *</Label>
                <Input type="date" value={bayarForm.tanggal}
                  onChange={e => setBayarForm(p => ({ ...p, tanggal: e.target.value }))} required />
              </div>
              <div className="space-y-2">
                <Label>Jumlah Bayar *</Label>
                <Input type="number" min="1"
                  max={selectedHutang?.sisa_hutang ?? undefined}
                  value={bayarForm.jumlah_bayar || ""}
                  onChange={e => setBayarForm(p => ({ ...p, jumlah_bayar: parseFloat(e.target.value) || 0 }))}
                  placeholder="0" required />
                <p className="text-xs text-muted-foreground">
                  Maks: {formatRp(Number(selectedHutang?.sisa_hutang ?? 0))}
                </p>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Bayar dari Akun Kas *</Label>
              <Select value={bayarForm.akun_kas_id}
                onValueChange={v => setBayarForm(p => ({ ...p, akun_kas_id: v }))}>
                <SelectTrigger><SelectValue placeholder="-- Pilih akun kas/bank --" /></SelectTrigger>
                <SelectContent>
                  {akunKasList.map(a => (
                    <SelectItem key={a.kode} value={a.kode}>
                      <span className="font-mono text-xs mr-2 text-muted-foreground">{a.kode}</span>{a.nama}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Keterangan</Label>
              <Input value={bayarForm.keterangan}
                onChange={e => setBayarForm(p => ({ ...p, keterangan: e.target.value }))}
                placeholder="Opsional" />
            </div>

            {/* Preview jurnal */}
            {bayarForm.akun_kas_id && bayarForm.jumlah_bayar > 0 && selectedHutang && (
              <div className="rounded-lg border p-3 bg-muted/30 space-y-1.5">
                <p className="text-xs font-semibold text-muted-foreground">Preview Jurnal Otomatis:</p>
                <div className="text-xs space-y-1">
                  <div className="flex justify-between">
                    <span>Debit: {akunMap.get(selectedHutang.pos_hutang?.akun_kode ?? "") ?? selectedHutang.pos_hutang?.akun_kode ?? "Akun Hutang"}</span>
                    <span className="font-medium">{formatRp(bayarForm.jumlah_bayar)}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground pl-4">
                    <span>Kredit: {akunMap.get(bayarForm.akun_kas_id) ?? bayarForm.akun_kas_id}</span>
                    <span>{formatRp(bayarForm.jumlah_bayar)}</span>
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-1">
              <Button type="submit" disabled={saving} className="flex-1">
                {saving ? "Memproses..." : "Bayar Hutang"}
              </Button>
              <Button type="button" variant="outline"
                onClick={() => { setOpenBayar(false); setBayarForm(emptyBayarForm()) }}>
                Batal
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Dialog Detail & Riwayat Bayar ── */}
      <Dialog open={openDetail} onOpenChange={open => { if (!open) { setOpenDetail(false); setSelectedHutang(null) } }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detail Hutang — {selectedHutang?.no_hutang}</DialogTitle>
            <DialogDescription>
              {selectedHutang && `${formatTgl(selectedHutang.tanggal)} · ${selectedHutang.pos_hutang?.nama}`}
            </DialogDescription>
          </DialogHeader>
          {selectedHutang && (
            <div className="space-y-5">
              {/* Info hutang */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "Total Hutang", value: formatRp(Number(selectedHutang.jumlah)) },
                  { label: "Sisa Hutang", value: formatRp(Number(selectedHutang.sisa_hutang)), color: "text-destructive" },
                  { label: "Status", value: statusBadge[selectedHutang.status].label },
                ].map(item => (
                  <div key={item.label} className="p-3 rounded-lg bg-muted/40 text-center">
                    <p className="text-xs text-muted-foreground">{item.label}</p>
                    <p className={`font-bold text-sm mt-1 ${item.color ?? "text-foreground"}`}>{item.value}</p>
                  </div>
                ))}
              </div>

              {/* Riwayat pembayaran */}
              <div>
                <p className="text-sm font-semibold text-foreground mb-2">Riwayat Pembayaran</p>
                {getRiwayatBayar(selectedHutang.id).length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4 border rounded-lg border-dashed">
                    Belum ada pembayaran
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead>Tanggal</TableHead>
                        <TableHead>Akun Kas</TableHead>
                        <TableHead>Keterangan</TableHead>
                        <TableHead className="text-right">Jumlah</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {getRiwayatBayar(selectedHutang.id).map(b => (
                        <TableRow key={b.id}>
                          <TableCell className="text-sm">{formatTgl(b.tanggal)}</TableCell>
                          <TableCell className="text-sm">{akunMap.get(b.akun_kas_id) ?? b.akun_kas_id}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{b.keterangan ?? "-"}</TableCell>
                          <TableCell className="text-right text-sm font-semibold text-green-600">
                            {formatRp(Number(b.jumlah_bayar))}
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="bg-muted/50 font-semibold">
                        <TableCell colSpan={3}>Total Dibayar</TableCell>
                        <TableCell className="text-right text-green-600">
                          {formatRp(getRiwayatBayar(selectedHutang.id).reduce((s, b) => s + Number(b.jumlah_bayar), 0))}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                )}
              </div>

              {selectedHutang.status !== "LUNAS" && (
                <Button className="w-full" onClick={() => {
                  setOpenDetail(false)
                  setBayarForm(emptyBayarForm())
                  setOpenBayar(true)
                }}>
                  <CreditCard className="w-4 h-4 mr-2" /> Bayar Hutang Sekarang
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Delete Pos Dialog ── */}
      <Dialog open={!!deletePosTarget} onOpenChange={open => !open && setDeletePosTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Hapus Pos Hutang</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            Hapus pos <strong>{deletePosTarget?.nama}</strong>? Pos yang masih digunakan tidak bisa dihapus.
          </p>
          <div className="flex gap-3 pt-2">
            <Button variant="destructive" className="flex-1" onClick={handleDeletePos} disabled={saving}>
              {saving ? "Menghapus..." : "Ya, Hapus"}
            </Button>
            <Button variant="outline" onClick={() => setDeletePosTarget(null)}>Batal</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Delete Hutang Dialog ── */}
      <Dialog open={!!deleteHutangTarget} onOpenChange={open => !open && setDeleteHutangTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Hapus Data Hutang</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            Hapus hutang <span className="font-mono font-semibold text-foreground">{deleteHutangTarget?.no_hutang}</span>?
            <br /><span className="text-destructive text-xs mt-1 block">⚠ Semua riwayat pembayaran & jurnal terkait akan ikut terhapus.</span>
          </p>
          <div className="flex gap-3 pt-2">
            <Button variant="destructive" className="flex-1" onClick={handleDeleteHutang} disabled={saving}>
              {saving ? "Menghapus..." : "Ya, Hapus"}
            </Button>
            <Button variant="outline" onClick={() => setDeleteHutangTarget(null)}>Batal</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
