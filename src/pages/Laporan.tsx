import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { UnitSelector } from "@/components/UnitSelector"
import { ExportButton } from "@/components/ExportButton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { RefreshCw } from "lucide-react"

function formatRp(n: number) {
  return n.toLocaleString("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 })
}
function formatTgl(tgl: string) {
  return new Date(tgl).toLocaleDateString("id-ID", { dateStyle: "medium" })
}

export default function Laporan() {
  return (
    <UnitSelector>
      {(unitKerjaId, pesantrenId) => (
        <LaporanContent unitKerjaId={unitKerjaId} pesantrenId={pesantrenId} />
      )}
    </UnitSelector>
  )
}

function LaporanContent({ unitKerjaId }: { unitKerjaId: string; pesantrenId: string }) {
  const [unitNama, setUnitNama] = useState("")
  const [filterFrom, setFilterFrom] = useState(
    new Date(new Date().getFullYear(), 0, 1).toISOString().slice(0, 10)
  )
  const [filterTo, setFilterTo] = useState(new Date().toISOString().slice(0, 10))

  // Data per laporan
  const [pegawaiData, setPegawaiData] = useState<any[]>([])
  const [jurnalData, setJurnalData] = useState<any[]>([])
  const [kasData, setKasData] = useState<any[]>([])
  const [hutangData, setHutangData] = useState<any[]>([])
  const [akunMap, setAkunMap] = useState<Map<string, string>>(new Map())
  const [posHutangMap, setPosHutangMap] = useState<Map<number, string>>(new Map())
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // Ambil nama unit
    supabase.from("unit_kerja").select("nama").eq("id", unitKerjaId).single()
      .then(({ data }) => setUnitNama(data?.nama ?? ""))

    // Ambil master akun untuk mapping
    supabase.from("master_akun").select("kode, nama").eq("unit_kerja_id", unitKerjaId)
      .then(({ data }) => setAkunMap(new Map((data ?? []).map((a: any) => [a.kode, a.nama]))))

    // Ambil pos hutang
    supabase.from("pos_hutang").select("id, nama").eq("unit_kerja_id", unitKerjaId)
      .then(({ data }) => setPosHutangMap(new Map((data ?? []).map((p: any) => [p.id, p.nama]))))
  }, [unitKerjaId])

  async function fetchAll() {
    setLoading(true)
    await Promise.all([
      fetchPegawai(),
      fetchJurnal(),
      fetchKas(),
      fetchHutang(),
    ])
    setLoading(false)
  }

  useEffect(() => { fetchAll() }, [unitKerjaId, filterFrom, filterTo])

  // ── Laporan Pegawai ─────────────────────────────────────
  async function fetchPegawai() {
    const { data } = await supabase
      .from("pegawai").select("*")
      .eq("unit_kerja_id", unitKerjaId)
      .order("nama_pegawai")
    setPegawaiData(data ?? [])
  }

  // ── Laporan Jurnal ──────────────────────────────────────
  async function fetchJurnal() {
    const { data: jurnal } = await supabase
      .from("jurnal_umum").select("*")
      .eq("unit_kerja_id", unitKerjaId)
      .gte("tanggal", filterFrom)
      .lte("tanggal", filterTo)
      .order("tanggal")

    if (!jurnal?.length) { setJurnalData([]); return }

    const ids = jurnal.map(j => j.id)
    const { data: detail } = await supabase
      .from("jurnal_detail").select("*").in("jurnal_id", ids)

    // Group detail
    const detailMap = new Map<number, any[]>()
    ;(detail ?? []).forEach(d => {
      const list = detailMap.get(d.jurnal_id) ?? []
      list.push(d)
      detailMap.set(d.jurnal_id, list)
    })

    const rows = jurnal.map(j => {
      const details = detailMap.get(j.id) ?? []
      const totalD = details.reduce((s: number, d: any) => s + Number(d.debit), 0)
      const totalK = details.reduce((s: number, d: any) => s + Number(d.kredit), 0)
      return { ...j, total_debit: totalD, total_kredit: totalK }
    })
    setJurnalData(rows)
  }

  // ── Laporan Kas ─────────────────────────────────────────
  async function fetchKas() {
    const { data } = await supabase
      .from("kas_transaksi").select("*")
      .eq("unit_kerja_id", unitKerjaId)
      .gte("tanggal", filterFrom)
      .lte("tanggal", filterTo)
      .order("tanggal")
    setKasData(data ?? [])
  }

  // ── Laporan Hutang ──────────────────────────────────────
  async function fetchHutang() {
    const { data } = await supabase
      .from("hutang").select("*")
      .eq("unit_kerja_id", unitKerjaId)
      .gte("tanggal", filterFrom)
      .lte("tanggal", filterTo)
      .order("tanggal")
    setHutangData(data ?? [])
  }

  // ── Konfigurasi export per laporan ──────────────────────

  const opsiPegawai = {
    judul: "Laporan Data Pegawai",
    subjudul: `Unit: ${unitNama}`,
    namaFile: `laporan-pegawai-${unitNama}`,
    kolom: [
      { header: "No", key: "_no", width: 5 },
      { header: "Nama Pegawai", key: "nama_pegawai", width: 25 },
      { header: "NIP", key: "id_nip", width: 15 },
      { header: "Jabatan", key: "jabatan", width: 20 },
      { header: "Pendidikan", key: "pendidikan_terakhir", width: 15 },
      { header: "Status", key: "status_pegawai", width: 12 },
      { header: "Aktif", key: "aktif", width: 10 },
      { header: "Masuk", key: "tahun_masuk", width: 8 },
      { header: "Jalur", key: "jalur_masuk", width: 12 },
      { header: "HP", key: "hp", width: 15 },
    ],
    data: pegawaiData.map((p, i) => ({ ...p, _no: i + 1 })),
  }

  const opsiJurnal = {
    judul: "Laporan Jurnal Umum",
    subjudul: `Unit: ${unitNama} | Periode: ${formatTgl(filterFrom)} – ${formatTgl(filterTo)}`,
    namaFile: `laporan-jurnal-${filterFrom}-${filterTo}`,
    kolom: [
      { header: "No", key: "_no", width: 5 },
      { header: "Tanggal", key: "tanggal", width: 15, format: (v: string) => formatTgl(v) },
      { header: "No. Jurnal", key: "no_jurnal", width: 15 },
      { header: "Keterangan", key: "keterangan", width: 30 },
      { header: "Total Debit", key: "total_debit", width: 20, align: "right" as const, format: (v: number) => formatRp(v) },
      { header: "Total Kredit", key: "total_kredit", width: 20, align: "right" as const, format: (v: number) => formatRp(v) },
    ],
    data: jurnalData.map((j, i) => ({ ...j, _no: i + 1 })),
    footer: `Total: ${jurnalData.length} jurnal`,
  }

  const opsiKas = {
    judul: "Laporan Kas & Bank",
    subjudul: `Unit: ${unitNama} | Periode: ${formatTgl(filterFrom)} – ${formatTgl(filterTo)}`,
    namaFile: `laporan-kas-${filterFrom}-${filterTo}`,
    kolom: [
      { header: "No", key: "_no", width: 5 },
      { header: "Tanggal", key: "tanggal", width: 15, format: (v: string) => formatTgl(v) },
      { header: "No. Transaksi", key: "no_transaksi", width: 18 },
      { header: "Tipe", key: "tipe", width: 12 },
      { header: "Akun Kas", key: "akun_kas_id", width: 20, format: (v: string) => akunMap.get(v) ?? v },
      { header: "Akun Lawan", key: "akun_lawan_id", width: 20, format: (v: string) => akunMap.get(v) ?? v },
      { header: "Keterangan", key: "keterangan", width: 25 },
      { header: "Jumlah", key: "jumlah", width: 20, align: "right" as const, format: (v: number) => formatRp(v) },
    ],
    data: kasData.map((k, i) => ({ ...k, _no: i + 1 })),
  }

  const opsiHutang = {
    judul: "Laporan Hutang",
    subjudul: `Unit: ${unitNama} | Periode: ${formatTgl(filterFrom)} – ${formatTgl(filterTo)}`,
    namaFile: `laporan-hutang-${filterFrom}-${filterTo}`,
    kolom: [
      { header: "No", key: "_no", width: 5 },
      { header: "Tanggal", key: "tanggal", width: 15, format: (v: string) => formatTgl(v) },
      { header: "No. Hutang", key: "no_hutang", width: 15 },
      { header: "Pos Hutang", key: "pos_hutang_id", width: 20, format: (v: number) => posHutangMap.get(v) ?? "-" },
      { header: "Jumlah", key: "jumlah", width: 20, align: "right" as const, format: (v: number) => formatRp(v) },
      { header: "Sisa Hutang", key: "sisa_hutang", width: 20, align: "right" as const, format: (v: number) => formatRp(v) },
      { header: "Status", key: "status", width: 15 },
      { header: "Keterangan", key: "keterangan", width: 25 },
    ],
    data: hutangData.map((h, i) => ({ ...h, _no: i + 1 })),
  }

  const tipeBadge: Record<string, "default" | "success" | "secondary" | "destructive"> = {
    SALDO_AWAL: "secondary",
    KAS_MASUK: "success",
    KAS_KELUAR: "destructive",
    TRANSFER: "default",
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Laporan</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Export laporan ke PDF atau Excel
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchAll} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>

      {/* Filter periode */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-2">
              <Label>Dari Tanggal</Label>
              <Input type="date" value={filterFrom}
                onChange={e => setFilterFrom(e.target.value)} className="w-40" />
            </div>
            <div className="space-y-2">
              <Label>Sampai Tanggal</Label>
              <Input type="date" value={filterTo}
                onChange={e => setFilterTo(e.target.value)} className="w-40" />
            </div>
            <Button variant="outline" size="sm" onClick={fetchAll} disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              Terapkan
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabs laporan */}
      <Tabs defaultValue="pegawai">
        <TabsList className="w-full justify-start border-b rounded-none h-auto p-0 bg-transparent gap-0">
          {[
            { value: "pegawai", label: "Data Pegawai" },
            { value: "jurnal", label: "Jurnal Umum" },
            { value: "kas", label: "Kas & Bank" },
            { value: "hutang", label: "Hutang" },
          ].map(tab => (
            <TabsTrigger key={tab.value} value={tab.value}
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-foreground data-[state=active]:bg-transparent px-4 py-2.5 text-sm font-medium text-muted-foreground data-[state=active]:text-foreground">
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* ── Tab Pegawai ── */}
        <TabsContent value="pegawai" className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-foreground">Data Pegawai</p>
              <p className="text-xs text-muted-foreground">{pegawaiData.length} pegawai</p>
            </div>
            <ExportButton opsi={opsiPegawai} disabled={loading} />
          </div>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="w-10">#</TableHead>
                    <TableHead>Nama</TableHead>
                    <TableHead>NIP</TableHead>
                    <TableHead>Jabatan</TableHead>
                    <TableHead>Pendidikan</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Aktif</TableHead>
                    <TableHead>Masuk</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow><TableCell colSpan={8} className="text-center py-10">
                      <div className="flex items-center justify-center gap-2 text-muted-foreground">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-foreground" /> Memuat...
                      </div>
                    </TableCell></TableRow>
                  ) : pegawaiData.length === 0 ? (
                    <TableRow><TableCell colSpan={8} className="text-center py-10 text-muted-foreground">
                      Belum ada data pegawai
                    </TableCell></TableRow>
                  ) : pegawaiData.map((p, i) => (
                    <TableRow key={p.id}>
                      <TableCell className="text-xs text-muted-foreground">{i + 1}</TableCell>
                      <TableCell className="font-medium text-sm">{p.nama_pegawai}</TableCell>
                      <TableCell className="text-xs font-mono text-muted-foreground">{p.id_nip}</TableCell>
                      <TableCell className="text-sm">{p.jabatan}</TableCell>
                      <TableCell className="text-sm">{p.pendidikan_terakhir}</TableCell>
                      <TableCell>
                        <Badge variant={p.status_pegawai === "TETAP" ? "default" : "secondary"} className="text-xs">
                          {p.status_pegawai}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={p.aktif === "AKTIF" ? "success" : "secondary"} className="text-xs">
                          {p.aktif}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">{p.tahun_masuk}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Tab Jurnal ── */}
        <TabsContent value="jurnal" className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-foreground">Jurnal Umum</p>
              <p className="text-xs text-muted-foreground">{jurnalData.length} jurnal</p>
            </div>
            <ExportButton opsi={opsiJurnal} disabled={loading} />
          </div>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="w-10">#</TableHead>
                    <TableHead>Tanggal</TableHead>
                    <TableHead>No. Jurnal</TableHead>
                    <TableHead>Keterangan</TableHead>
                    <TableHead className="text-right">Total Debit</TableHead>
                    <TableHead className="text-right">Total Kredit</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-10">
                      <div className="flex items-center justify-center gap-2 text-muted-foreground">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-foreground" /> Memuat...
                      </div>
                    </TableCell></TableRow>
                  ) : jurnalData.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                      Tidak ada jurnal pada periode ini
                    </TableCell></TableRow>
                  ) : (
                    <>
                      {jurnalData.map((j, i) => (
                        <TableRow key={j.id}>
                          <TableCell className="text-xs text-muted-foreground">{i + 1}</TableCell>
                          <TableCell className="text-sm">{formatTgl(j.tanggal)}</TableCell>
                          <TableCell className="font-mono text-sm">{j.no_jurnal}</TableCell>
                          <TableCell className="text-sm">{j.keterangan}</TableCell>
                          <TableCell className="text-right text-sm font-medium">{formatRp(j.total_debit)}</TableCell>
                          <TableCell className="text-right text-sm font-medium">{formatRp(j.total_kredit)}</TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="bg-muted/50 font-semibold">
                        <TableCell colSpan={4}>Total</TableCell>
                        <TableCell className="text-right">{formatRp(jurnalData.reduce((s, j) => s + j.total_debit, 0))}</TableCell>
                        <TableCell className="text-right">{formatRp(jurnalData.reduce((s, j) => s + j.total_kredit, 0))}</TableCell>
                      </TableRow>
                    </>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Tab Kas ── */}
        <TabsContent value="kas" className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-foreground">Kas & Bank</p>
              <p className="text-xs text-muted-foreground">{kasData.length} transaksi</p>
            </div>
            <ExportButton opsi={opsiKas} disabled={loading} />
          </div>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="w-10">#</TableHead>
                    <TableHead>Tanggal</TableHead>
                    <TableHead>No. Transaksi</TableHead>
                    <TableHead>Tipe</TableHead>
                    <TableHead>Akun Kas</TableHead>
                    <TableHead>Akun Lawan</TableHead>
                    <TableHead className="text-right">Jumlah</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow><TableCell colSpan={7} className="text-center py-10">
                      <div className="flex items-center justify-center gap-2 text-muted-foreground">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-foreground" /> Memuat...
                      </div>
                    </TableCell></TableRow>
                  ) : kasData.length === 0 ? (
                    <TableRow><TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                      Tidak ada transaksi pada periode ini
                    </TableCell></TableRow>
                  ) : (
                    <>
                      {kasData.map((k, i) => (
                        <TableRow key={k.id}>
                          <TableCell className="text-xs text-muted-foreground">{i + 1}</TableCell>
                          <TableCell className="text-sm">{formatTgl(k.tanggal)}</TableCell>
                          <TableCell className="font-mono text-xs">{k.no_transaksi}</TableCell>
                          <TableCell>
                            <Badge variant={tipeBadge[k.tipe] ?? "default"} className="text-xs">
                              {k.tipe.replace("_", " ")}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">{akunMap.get(k.akun_kas_id) ?? k.akun_kas_id}</TableCell>
                          <TableCell className="text-sm">{akunMap.get(k.akun_lawan_id) ?? k.akun_lawan_id}</TableCell>
                          <TableCell className={`text-right text-sm font-semibold ${
                            k.tipe === "KAS_KELUAR" ? "text-destructive" : "text-green-600"
                          }`}>
                            {k.tipe === "KAS_KELUAR" ? "-" : "+"}{formatRp(k.jumlah)}
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="bg-muted/50 font-semibold">
                        <TableCell colSpan={6}>Total Masuk</TableCell>
                        <TableCell className="text-right text-green-600">
                          +{formatRp(kasData.filter(k => k.tipe !== "KAS_KELUAR").reduce((s: number, k: any) => s + Number(k.jumlah), 0))}
                        </TableCell>
                      </TableRow>
                      <TableRow className="bg-muted/50 font-semibold">
                        <TableCell colSpan={6}>Total Keluar</TableCell>
                        <TableCell className="text-right text-destructive">
                          -{formatRp(kasData.filter(k => k.tipe === "KAS_KELUAR").reduce((s: number, k: any) => s + Number(k.jumlah), 0))}
                        </TableCell>
                      </TableRow>
                    </>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Tab Hutang ── */}
        <TabsContent value="hutang" className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-foreground">Hutang</p>
              <p className="text-xs text-muted-foreground">{hutangData.length} hutang</p>
            </div>
            <ExportButton opsi={opsiHutang} disabled={loading} />
          </div>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="w-10">#</TableHead>
                    <TableHead>Tanggal</TableHead>
                    <TableHead>No. Hutang</TableHead>
                    <TableHead>Pos Hutang</TableHead>
                    <TableHead className="text-right">Jumlah</TableHead>
                    <TableHead className="text-right">Sisa</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow><TableCell colSpan={7} className="text-center py-10">
                      <div className="flex items-center justify-center gap-2 text-muted-foreground">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-foreground" /> Memuat...
                      </div>
                    </TableCell></TableRow>
                  ) : hutangData.length === 0 ? (
                    <TableRow><TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                      Tidak ada hutang pada periode ini
                    </TableCell></TableRow>
                  ) : (
                    <>
                      {hutangData.map((h, i) => (
                        <TableRow key={h.id}>
                          <TableCell className="text-xs text-muted-foreground">{i + 1}</TableCell>
                          <TableCell className="text-sm">{formatTgl(h.tanggal)}</TableCell>
                          <TableCell className="font-mono text-xs">{h.no_hutang}</TableCell>
                          <TableCell className="text-sm">{posHutangMap.get(h.pos_hutang_id) ?? "-"}</TableCell>
                          <TableCell className="text-right text-sm font-medium">{formatRp(Number(h.jumlah))}</TableCell>
                          <TableCell className={`text-right text-sm font-semibold ${Number(h.sisa_hutang) > 0 ? "text-destructive" : "text-green-600"}`}>
                            {formatRp(Number(h.sisa_hutang))}
                          </TableCell>
                          <TableCell>
                            <Badge variant={
                              h.status === "LUNAS" ? "success" :
                              h.status === "SEBAGIAN" ? "default" : "destructive"
                            } className="text-xs">
                              {h.status.replace("_", " ")}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="bg-muted/50 font-semibold">
                        <TableCell colSpan={4}>Total Hutang</TableCell>
                        <TableCell className="text-right">{formatRp(hutangData.reduce((s: number, h: any) => s + Number(h.jumlah), 0))}</TableCell>
                        <TableCell className="text-right text-destructive">
                          {formatRp(hutangData.reduce((s: number, h: any) => s + Number(h.sisa_hutang), 0))}
                        </TableCell>
                        <TableCell />
                      </TableRow>
                    </>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
