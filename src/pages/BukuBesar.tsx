import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { RefreshCw } from "lucide-react"
import type { MasterAkun } from "@/types/keuangan"

interface BukuBesarRow {
  tanggal: string
  no_jurnal: string
  keterangan: string
  debit: number
  kredit: number
  saldo: number
}

function formatRp(n: number) {
  return n.toLocaleString("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 })
}

export default function BukuBesar() {
  const [masterAkun, setMasterAkun] = useState<MasterAkun[]>([])
  const [selectedKode, setSelectedKode] = useState("")
  const [rows, setRows] = useState<BukuBesarRow[]>([])
  const [loading, setLoading] = useState(false)
  const [filterFrom, setFilterFrom] = useState("")
  const [filterTo, setFilterTo] = useState("")

  async function fetchMasterAkun() {
    const { data } = await supabase.from("master_akun").select("*").order("kode")
    setMasterAkun(data ?? [])
  }

  async function fetchBukuBesar() {
    if (!selectedKode) return
    setLoading(true)

    const { data, error } = await supabase
      .from("jurnal_detail")
      .select(`
        debit, kredit,
        jurnal_umum ( tanggal, no_jurnal, keterangan )
      `)
      .eq("akun_kode", selectedKode)
      .order("jurnal_umum(tanggal)", { ascending: true })

    if (error || !data) { setLoading(false); return }

    // flatten
    let entries = (data as any[]).map(d => ({
      tanggal: d.jurnal_umum.tanggal as string,
      no_jurnal: d.jurnal_umum.no_jurnal as string,
      keterangan: d.jurnal_umum.keterangan as string,
      debit: Number(d.debit),
      kredit: Number(d.kredit),
    }))

    // filter tanggal
    if (filterFrom) entries = entries.filter(e => e.tanggal >= filterFrom)
    if (filterTo)   entries = entries.filter(e => e.tanggal <= filterTo)

    // saldo berjalan — arah saldo ikut tipe_normal akun
    const akun = masterAkun.find(a => a.kode === selectedKode)
    let saldo = 0
    const withSaldo: BukuBesarRow[] = entries.map(e => {
      // tipe DEBIT: saldo naik kalau debit, turun kalau kredit
      // tipe KREDIT: saldo naik kalau kredit, turun kalau debit
      if (akun?.tipe_normal === "KREDIT") {
        saldo += e.kredit - e.debit
      } else {
        saldo += e.debit - e.kredit
      }
      return { ...e, saldo }
    })

    setRows(withSaldo)
    setLoading(false)
  }

  useEffect(() => { fetchMasterAkun() }, [])
  useEffect(() => { fetchBukuBesar() }, [selectedKode, filterFrom, filterTo])

  const selectedAkun = masterAkun.find(a => a.kode === selectedKode)
  const totalDebit  = rows.reduce((s, r) => s + r.debit, 0)
  const totalKredit = rows.reduce((s, r) => s + r.kredit, 0)
  const saldoAkhir  = rows.length > 0 ? rows[rows.length - 1].saldo : 0

  // kelompok akun per kategori untuk grouping di dropdown
  const kelompokOrder = ["ASET", "KEWAJIBAN", "MODAL", "PENDAPATAN", "BEBAN"]
  const grouped = kelompokOrder.map(k => ({
    kelompok: k,
    akuns: masterAkun.filter(a => a.kelompok === k),
  })).filter(g => g.akuns.length > 0)

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Buku Besar</h1>
        <p className="text-sm text-muted-foreground mt-1">Pengelompokan semua transaksi keuangan per akun</p>
      </div>

      {/* Filter */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-2 min-w-[240px]">
              <Label>Pilih Akun *</Label>
              <Select value={selectedKode} onValueChange={setSelectedKode}>
                <SelectTrigger>
                  <SelectValue placeholder="-- Pilih akun --" />
                </SelectTrigger>
                <SelectContent>
                  {grouped.map(g => (
                    <div key={g.kelompok}>
                      {/* group label */}
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

            <div className="space-y-2">
              <Label>Dari Tanggal</Label>
              <Input type="date" value={filterFrom} onChange={e => setFilterFrom(e.target.value)} className="w-40" />
            </div>
            <div className="space-y-2">
              <Label>Sampai Tanggal</Label>
              <Input type="date" value={filterTo} onChange={e => setFilterTo(e.target.value)} className="w-40" />
            </div>
            <Button variant="outline" size="sm" onClick={fetchBukuBesar} disabled={loading || !selectedKode}>
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} /> Tampilkan
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Summary cards */}
      {selectedKode && rows.length > 0 && (
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: "Kelompok Akun", value: selectedAkun?.kelompok ?? "-" },
            { label: "Total Debit", value: formatRp(totalDebit) },
            { label: "Total Kredit", value: formatRp(totalKredit) },
            {
              label: "Saldo Akhir",
              value: formatRp(Math.abs(saldoAkhir)),
              sub: saldoAkhir >= 0
                ? (selectedAkun?.tipe_normal === "KREDIT" ? "Kredit" : "Debit")
                : (selectedAkun?.tipe_normal === "KREDIT" ? "Debit" : "Kredit")
            },
          ].map(item => (
            <Card key={item.label}>
              <CardContent className="p-5">
                <p className="text-xs text-muted-foreground">{item.label}</p>
                <p className="text-lg font-bold text-foreground mt-1 truncate">{item.value}</p>
                {item.sub && <p className="text-xs text-muted-foreground mt-0.5">{item.sub}</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Tabel */}
      {selectedKode ? (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              <span className="font-mono">{selectedKode}</span> — {selectedAkun?.nama}
              <span className="ml-3 text-xs font-normal text-muted-foreground">
                Tipe normal: {selectedAkun?.tipe_normal}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Tanggal</TableHead>
                  <TableHead>No. Jurnal</TableHead>
                  <TableHead>Keterangan</TableHead>
                  <TableHead className="text-right">Debit</TableHead>
                  <TableHead className="text-right">Kredit</TableHead>
                  <TableHead className="text-right">Saldo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                      <div className="flex items-center justify-center gap-2">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-foreground" /> Memuat...
                      </div>
                    </TableCell>
                  </TableRow>
                ) : rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                      Tidak ada transaksi untuk akun ini
                    </TableCell>
                  </TableRow>
                ) : (
                  <>
                    {rows.map((r, i) => (
                      <TableRow key={i}>
                        <TableCell className="text-sm">
                          {new Date(r.tanggal).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })}
                        </TableCell>
                        <TableCell className="font-mono text-sm">{r.no_jurnal}</TableCell>
                        <TableCell className="text-sm">{r.keterangan}</TableCell>
                        <TableCell className="text-right text-sm">{r.debit > 0 ? formatRp(r.debit) : "-"}</TableCell>
                        <TableCell className="text-right text-sm">{r.kredit > 0 ? formatRp(r.kredit) : "-"}</TableCell>
                        <TableCell className={`text-right text-sm font-medium ${r.saldo < 0 ? "text-destructive" : ""}`}>
                          {formatRp(Math.abs(r.saldo))}
                          <span className="text-xs text-muted-foreground ml-1">
                            {r.saldo >= 0
                              ? (selectedAkun?.tipe_normal === "KREDIT" ? "K" : "D")
                              : (selectedAkun?.tipe_normal === "KREDIT" ? "D" : "K")}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-muted/50 font-semibold border-t-2">
                      <TableCell colSpan={3}>Total</TableCell>
                      <TableCell className="text-right">{formatRp(totalDebit)}</TableCell>
                      <TableCell className="text-right">{formatRp(totalKredit)}</TableCell>
                      <TableCell className="text-right">
                        {formatRp(Math.abs(saldoAkhir))}
                        <span className="text-xs text-muted-foreground ml-1">
                          {saldoAkhir >= 0
                            ? (selectedAkun?.tipe_normal === "KREDIT" ? "K" : "D")
                            : (selectedAkun?.tipe_normal === "KREDIT" ? "D" : "K")}
                        </span>
                      </TableCell>
                    </TableRow>
                  </>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        <div className="flex items-center justify-center h-40 text-muted-foreground text-sm border rounded-lg border-dashed">
          Pilih akun terlebih dahulu untuk menampilkan buku besar
        </div>
      )}
    </div>
  )
}
