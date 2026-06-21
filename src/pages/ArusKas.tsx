import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"
import { UnitSelector } from "@/components/UnitSelector"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Pencil, Trash2, RefreshCw, Settings2 } from "lucide-react"
import type { MasterAkun, ArusKasKategori, ArusKasRow, AktivitasArusKas, TipeKas } from "@/types/keuangan"

function formatRp(n: number) {
  return n.toLocaleString("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 })
}

const AKTIVITAS: AktivitasArusKas[] = ["OPERASIONAL", "INVESTASI", "PENDANAAN"]
const aktivitasLabel: Record<AktivitasArusKas, string> = {
  OPERASIONAL: "Aktivitas Operasional",
  INVESTASI: "Aktivitas Investasi",
  PENDANAAN: "Aktivitas Pendanaan",
}
const aktivitasBadge: Record<AktivitasArusKas, string> = {
  OPERASIONAL: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  INVESTASI: "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300",
  PENDANAAN: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300",
}
const emptyForm = () => ({ akun_kode: "", aktivitas: "OPERASIONAL" as AktivitasArusKas, tipe_kas: "MASUK" as TipeKas })

export default function ArusKas() {
  return (
    <UnitSelector>
      {(unitKerjaId) => <ArusKasContent unitKerjaId={unitKerjaId} />}
    </UnitSelector>
  )
}

function ArusKasContent({ unitKerjaId }: { unitKerjaId: string }) {
  const { toast } = useToast()
  const [masterAkun, setMasterAkun] = useState<MasterAkun[]>([])
  const [kategoriList, setKategoriList] = useState<ArusKasKategori[]>([])
  const [arusKasData, setArusKasData] = useState<ArusKasRow[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [filterFrom, setFilterFrom] = useState("")
  const [filterTo, setFilterTo] = useState("")
  const [openKategori, setOpenKategori] = useState(false)
  const [editTarget, setEditTarget] = useState<ArusKasKategori | null>(null)
  const [form, setForm] = useState(emptyForm())

  const [akunMap, setAkunMap] = useState<Map<string, string>>(new Map())

  async function fetchMasterAkun() {
        const { data } = await supabase
            .from("master_akun")
            .select("*")
            .eq("unit_kerja_id", unitKerjaId)
            .order("kode")
        const rows = data ?? []
        setMasterAkun(rows)

        // Build lookup map
        const map = new Map<string, string>()
        rows.forEach(a => map.set(a.kode, a.nama))
        setAkunMap(map)
    }


  async function fetchKategori() {
        const { data, error } = await supabase
            .from("arus_kas_kategori")
            .select("id, akun_kode, aktivitas, tipe_kas, unit_kerja_id") // tanpa join
            .eq("unit_kerja_id", unitKerjaId)
            .order("aktivitas")

        if (error) {
            toast({ title: "Gagal memuat kategori", description: error.message, variant: "destructive" })
            return
        }
        setKategoriList(data ?? [])
    }

  async function fetchArusKas() {
    setLoading(true)

    const { data: kategori } = await supabase
        .from("arus_kas_kategori")
        .select("id, akun_kode, aktivitas, tipe_kas, unit_kerja_id")
        .eq("unit_kerja_id", unitKerjaId)

    if (!kategori?.length) { setArusKasData([]); setLoading(false); return }

    const kodeList = kategori.map((k: any) => k.akun_kode)
    const { data: details } = await supabase.from("jurnal_detail")
      .select("akun_kode, debit, kredit, jurnal_umum(tanggal)")
      .in("akun_kode", kodeList)

    if (!details) { setLoading(false); return }

    const filtered = (details as any[]).filter(d => {
      const tgl = d.jurnal_umum?.tanggal
      if (filterFrom && tgl < filterFrom) return false
      if (filterTo && tgl > filterTo) return false
      return true
    })

    const map = new Map<string, number>()
    filtered.forEach(d => {
      const kat = kategori.find((k: any) => k.akun_kode === d.akun_kode)
      if (!kat) return
      const nilai = kat.tipe_kas === "MASUK" ? Number(d.debit) - Number(d.kredit) : Number(d.kredit) - Number(d.debit)
      map.set(d.akun_kode, (map.get(d.akun_kode) ?? 0) + nilai)
    })

    setArusKasData(kategori.map((k: any) => ({
        akun_kode: k.akun_kode,
        akun_nama: akunMap.get(k.akun_kode) ?? k.akun_kode, // ← dari map
        aktivitas: k.aktivitas,
        tipe_kas: k.tipe_kas,
        total: map.get(k.akun_kode) ?? 0,
    })))
    setLoading(false)
  }
useEffect(() => {
  async function init() {
    await fetchMasterAkun()  // tunggu selesai dulu
    await fetchKategori()
    await fetchArusKas()
  }
  init()
}, [unitKerjaId])
  useEffect(() => {
  if (akunMap.size > 0) fetchArusKas()  // hanya fetch kalau akunMap sudah ada
}, [filterFrom, filterTo])

  function subtotal(a: AktivitasArusKas) {
    return arusKasData.filter(r => r.aktivitas === a).reduce((s, r) => s + r.total, 0)
  }
  const totalBersih = AKTIVITAS.reduce((s, a) => s + subtotal(a), 0)

  const akunTersedia = masterAkun.filter(a => {
        // Kalau sedang edit, akun milik editTarget tetap tampil
        if (editTarget && a.kode === editTarget.akun_kode) return true
        // Selain itu, filter akun yang sudah ada di kategori
        return !kategoriList.some(k => k.akun_kode === a.kode)
    })

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()

    // Saat edit, akun_kode sudah fix — skip validasi akun
    if (!editTarget && !form.akun_kode) {
        toast({ title: "Pilih akun terlebih dahulu", variant: "destructive" })
        return
    }

    // Cek duplikat hanya saat tambah baru
    if (!editTarget) {
        const sudahAda = kategoriList.some(k => k.akun_kode === form.akun_kode)
        if (sudahAda) {
        toast({
            title: "Akun sudah terdaftar",
            description: "Akun ini sudah ada di kategori arus kas.",
            variant: "destructive"
        })
        return
        }
    }

    setSaving(true)

    if (editTarget?.id) {
        // Saat edit — hanya update aktivitas & tipe_kas, akun_kode tidak berubah
        const { error } = await supabase
        .from("arus_kas_kategori")
        .update({ aktivitas: form.aktivitas, tipe_kas: form.tipe_kas })
        .eq("id", editTarget.id)
        if (error) {
        toast({ title: "Gagal menyimpan", description: error.message, variant: "destructive" })
        setSaving(false); return
        }
        toast({ title: "Kategori diperbarui" })
    } else {
        const { error } = await supabase
        .from("arus_kas_kategori")
        .insert({ ...form, unit_kerja_id: unitKerjaId })
        if (error) {
        if (error.code === "23505") {
            toast({ title: "Akun sudah terdaftar", description: "Pilih akun lain.", variant: "destructive" })
        } else {
            toast({ title: "Gagal menyimpan", description: error.message, variant: "destructive" })
        }
        setSaving(false); return
        }
        toast({ title: "Kategori ditambahkan" })
    }

    setSaving(false)
    setEditTarget(null)
    setForm(emptyForm())
    fetchKategori()
    fetchArusKas()
    }

  async function handleDelete(id: number) {
    await supabase.from("arus_kas_kategori").delete().eq("id", id)
    toast({ title: "Kategori dihapus" })
    fetchKategori(); fetchArusKas()
  }

  function openEdit(k: ArusKasKategori) {
    setEditTarget(k)
    setForm({ akun_kode: k.akun_kode, aktivitas: k.aktivitas, tipe_kas: k.tipe_kas })
    setOpenKategori(true)
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Arus Kas</h1>
          <p className="text-sm text-muted-foreground mt-1">Menampilkan kondisi keuangan pesantren</p>
        </div>
        <Button size="sm" variant="outline" onClick={() => { setEditTarget(null); setForm(emptyForm()); setOpenKategori(true) }}>
          <Settings2 className="w-4 h-4 mr-2" /> Kelola Kategori
        </Button>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-2">
              <Label>Dari Tanggal</Label>
              <Input type="date" value={filterFrom} onChange={e => setFilterFrom(e.target.value)} className="w-40" />
            </div>
            <div className="space-y-2">
              <Label>Sampai Tanggal</Label>
              <Input type="date" value={filterTo} onChange={e => setFilterTo(e.target.value)} className="w-40" />
            </div>
            <Button variant="outline" size="sm" onClick={fetchArusKas} disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} /> Tampilkan
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {AKTIVITAS.map(a => (
          <Card key={a}>
            <CardContent className="p-5">
              <p className="text-xs text-muted-foreground">{aktivitasLabel[a]}</p>
              <p className={`text-xl font-bold mt-1 ${subtotal(a) < 0 ? "text-destructive" : "text-foreground"}`}>{formatRp(subtotal(a))}</p>
            </CardContent>
          </Card>
        ))}
        <Card className="border-foreground/20 bg-muted/40">
          <CardContent className="p-5">
            <p className="text-xs text-muted-foreground">Kenaikan Bersih Kas</p>
            <p className={`text-xl font-bold mt-1 ${totalBersih < 0 ? "text-destructive" : "text-foreground"}`}>{formatRp(totalBersih)}</p>
          </CardContent>
        </Card>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40 text-muted-foreground gap-2">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-foreground" /> Memuat...
        </div>
      ) : arusKasData.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-40 text-muted-foreground text-sm border rounded-lg border-dashed gap-2">
          <p>Belum ada kategori arus kas.</p>
          <p>Klik <strong>Kelola Kategori</strong> untuk menambahkan akun.</p>
        </div>
      ) : (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Laporan Arus Kas</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Kode</TableHead><TableHead>Nama Akun</TableHead>
                  <TableHead>Aktivitas</TableHead><TableHead>Tipe</TableHead>
                  <TableHead className="text-right">Jumlah</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {AKTIVITAS.map(aktivitas => {
                  const rowsAktivitas = arusKasData.filter(r => r.aktivitas === aktivitas)
                  if (!rowsAktivitas.length) return null
                  return (
                    <>
                      <TableRow key={`h-${aktivitas}`} className="bg-muted/30">
                        <TableCell colSpan={5} className="font-semibold text-sm py-2 px-4">{aktivitasLabel[aktivitas]}</TableCell>
                      </TableRow>
                      {rowsAktivitas.map(r => (
                        <TableRow key={r.akun_kode}>
                          <TableCell className="font-mono text-sm pl-8">{r.akun_kode}</TableCell>
                          <TableCell className="text-sm">{r.akun_nama}</TableCell>
                          <TableCell><span className={`text-xs font-medium px-2 py-0.5 rounded-full ${aktivitasBadge[r.aktivitas]}`}>{r.aktivitas}</span></TableCell>
                          <TableCell><Badge variant={r.tipe_kas === "MASUK" ? "success" : "secondary"} className="text-xs">{r.tipe_kas}</Badge></TableCell>
                          <TableCell className={`text-right text-sm font-medium ${r.total < 0 ? "text-destructive" : ""}`}>{formatRp(r.total)}</TableCell>
                        </TableRow>
                      ))}
                      <TableRow key={`sub-${aktivitas}`} className="border-t">
                        <TableCell colSpan={4} className="text-sm font-semibold pl-8 py-2">Subtotal {aktivitasLabel[aktivitas]}</TableCell>
                        <TableCell className={`text-right font-bold ${subtotal(aktivitas) < 0 ? "text-destructive" : ""}`}>{formatRp(subtotal(aktivitas))}</TableCell>
                      </TableRow>
                    </>
                  )
                })}
                <TableRow className="bg-muted/50 border-t-2">
                  <TableCell colSpan={4} className="font-bold py-3">Kenaikan/(Penurunan) Bersih Kas</TableCell>
                  <TableCell className={`text-right font-bold text-base ${totalBersih < 0 ? "text-destructive" : ""}`}>{formatRp(totalBersih)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Kelola Kategori Dialog */}
      <Dialog
        open={openKategori}
        onOpenChange={open => {
            if (!open) {
            setOpenKategori(false)
            setEditTarget(null)
            setForm(emptyForm())  // ← pastikan form di-reset
            }
        }}
        >
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Kelola Kategori Arus Kas</DialogTitle></DialogHeader>
          <form onSubmit={handleSave} className="grid grid-cols-3 gap-3 pb-4 border-b">
            <div className="space-y-2">
                <Label>Akun *</Label>
                {editTarget ? (
                // Saat edit — tampilkan nama akun saja, tidak bisa diubah
                <div className="flex h-10 items-center px-3 rounded-md border bg-muted text-sm text-muted-foreground">
                    <span className="font-mono text-xs mr-2">{editTarget.akun_kode}</span>
                    {akunMap.get(editTarget.akun_kode) ?? editTarget.akun_kode}
                </div>
                ) : (
                // Saat tambah baru — dropdown pilih akun
                <Select
                    value={form.akun_kode}
                    onValueChange={v => setForm(p => ({ ...p, akun_kode: v }))}
                >
                    <SelectTrigger><SelectValue placeholder="-- Pilih akun --" /></SelectTrigger>
                    <SelectContent>
                    {akunTersedia.length === 0 ? (
                        <div className="px-2 py-3 text-xs text-muted-foreground text-center">
                        Semua akun sudah terdaftar
                        </div>
                    ) : akunTersedia.map(a => (
                        <SelectItem key={a.kode} value={a.kode}>
                        <span className="font-mono text-xs mr-2 text-muted-foreground">{a.kode}</span>
                        {a.nama}
                        </SelectItem>
                    ))}
                    </SelectContent>
                </Select>
                )}
                {editTarget && (
                <p className="text-xs text-muted-foreground">Akun tidak bisa diubah</p>
                )}
            </div>

            <div className="space-y-2">
                <Label>Aktivitas *</Label>
                <Select value={form.aktivitas} onValueChange={v => setForm(p => ({ ...p, aktivitas: v as AktivitasArusKas }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                    {AKTIVITAS.map(a => <SelectItem key={a} value={a}>{aktivitasLabel[a]}</SelectItem>)}
                </SelectContent>
                </Select>
            </div>

            <div className="space-y-2">
                <Label>Tipe *</Label>
                <Select value={form.tipe_kas} onValueChange={v => setForm(p => ({ ...p, tipe_kas: v as TipeKas }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                    <SelectItem value="MASUK">Kas Masuk</SelectItem>
                    <SelectItem value="KELUAR">Kas Keluar</SelectItem>
                </SelectContent>
                </Select>
            </div>

            <div className="col-span-3 flex gap-2">
                <Button type="submit" size="sm" disabled={saving}>
                <Plus className="w-4 h-4 mr-1" />
                {editTarget ? "Simpan Perubahan" : "Tambah"}
                </Button>
                {editTarget && (
                <Button
                    type="button" size="sm" variant="outline"
                    onClick={() => { setEditTarget(null); setForm(emptyForm()) }}
                >
                    Batal Edit
                </Button>
                )}
            </div>
        </form>
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Kode</TableHead><TableHead>Nama Akun</TableHead>
                <TableHead>Aktivitas</TableHead><TableHead>Tipe</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {kategoriList.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-6 text-muted-foreground text-sm">Belum ada kategori</TableCell></TableRow>
              ) : kategoriList.map(k => (
                <TableRow key={k.id}>
                  <TableCell className="font-mono text-sm">{k.akun_kode}</TableCell>
                  <TableCell className="text-sm">{akunMap.get(k.akun_kode) ?? k.akun_kode}</TableCell>
                  <TableCell><span className={`text-xs font-medium px-2 py-0.5 rounded-full ${aktivitasBadge[k.aktivitas]}`}>{k.aktivitas}</span></TableCell>
                  <TableCell><Badge variant={k.tipe_kas === "MASUK" ? "success" : "secondary"} className="text-xs">{k.tipe_kas}</Badge></TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-1 justify-end">
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(k)}>
                        <Pencil className="w-3.5 h-3.5 text-blue-500" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleDelete(k.id!)}>
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
    </div>
  )
}
