import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { UnitSelector } from "@/components/UnitSelector"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RefreshCw } from "lucide-react"
import type { LabaRugiRow } from "@/types/keuangan"

function formatRp(n: number) {
  return n.toLocaleString("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 })
}

export default function LabaRugi() {
  return (
    <UnitSelector>
      {(unitKerjaId) => <LabaRugiContent unitKerjaId={unitKerjaId} />}
    </UnitSelector>
  )
}

function LabaRugiContent({ unitKerjaId }: { unitKerjaId: string }) {
  const [rows, setRows] = useState<LabaRugiRow[]>([])
  const [loading, setLoading] = useState(true)
  const [filterFrom, setFilterFrom] = useState("")
  const [filterTo, setFilterTo] = useState("")

  async function fetchData() {
    setLoading(true)
    const { data: akunList } = await supabase
      .from("master_akun").select("kode, nama, kelompok, tipe_normal")
      .eq("unit_kerja_id", unitKerjaId)
      .in("kelompok", ["PENDAPATAN", "BEBAN"])
      .order("kelompok").order("kode")

    if (!akunList?.length) { setRows([]); setLoading(false); return }

    const { data: details } = await supabase
      .from("jurnal_detail").select("akun_kode, debit, kredit, jurnal_umum(tanggal)")
      .in("akun_kode", akunList.map(a => a.kode))

    if (!details) { setLoading(false); return }

    const filtered = (details as any[]).filter(d => {
      const tgl = d.jurnal_umum?.tanggal
      if (filterFrom && tgl < filterFrom) return false
      if (filterTo && tgl > filterTo) return false
      return true
    })

    const map = new Map<string, number>()
    filtered.forEach(d => {
      const akun = akunList.find(a => a.kode === d.akun_kode)
      if (!akun) return
      const nilai = akun.tipe_normal === "KREDIT"
        ? Number(d.kredit) - Number(d.debit)
        : Number(d.debit) - Number(d.kredit)
      map.set(d.akun_kode, (map.get(d.akun_kode) ?? 0) + nilai)
    })

    setRows(akunList.map(a => ({
      akun_kode: a.kode, akun_nama: a.nama,
      kelompok: a.kelompok as "PENDAPATAN" | "BEBAN",
      total: map.get(a.kode) ?? 0,
    })))
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [unitKerjaId, filterFrom, filterTo])

  const totalPendapatan = rows.filter(r => r.kelompok === "PENDAPATAN").reduce((s, r) => s + r.total, 0)
  const totalBeban = rows.filter(r => r.kelompok === "BEBAN").reduce((s, r) => s + r.total, 0)
  const labaRugiBersih = totalPendapatan - totalBeban
  const isLaba = labaRugiBersih >= 0

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Laba Rugi</h1>
          <p className="text-sm text-muted-foreground mt-1">Menampilkan seluruh data pendapatan dan beban</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} /> Refresh
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
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Total Pendapatan</p>
            <p className="text-2xl font-bold text-foreground mt-1">{formatRp(totalPendapatan)}</p>
            <p className="text-xs text-muted-foreground mt-1">{rows.filter(r => r.kelompok === "PENDAPATAN").length} akun</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Total Beban</p>
            <p className="text-2xl font-bold text-foreground mt-1">{formatRp(totalBeban)}</p>
            <p className="text-xs text-muted-foreground mt-1">{rows.filter(r => r.kelompok === "BEBAN").length} akun</p>
          </CardContent>
        </Card>
        <Card className={isLaba
          ? "border-green-200 bg-green-50 dark:bg-green-950/20"
          : "border-red-200 bg-red-50 dark:bg-red-950/20"}>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">{isLaba ? "Laba Bersih" : "Rugi Bersih"}</p>
            <p className={`text-2xl font-bold mt-1 ${isLaba ? "text-green-600" : "text-destructive"}`}>
              {formatRp(Math.abs(labaRugiBersih))}
            </p>
          </CardContent>
        </Card>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40 text-muted-foreground gap-2">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-foreground" /> Memuat...
        </div>
      ) : rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-40 text-muted-foreground text-sm border rounded-lg border-dashed gap-2">
          <p>Belum ada akun Pendapatan atau Beban.</p>
          <p>Tambahkan di <strong>Master Akun</strong> dengan kelompok PENDAPATAN atau BEBAN.</p>
        </div>
      ) : (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Laporan Laba Rugi</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Kode Akun</TableHead><TableHead>Nama Akun</TableHead>
                  <TableHead className="text-right">Jumlah</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.filter(r => r.kelompok === "PENDAPATAN").length > 0 && (
                  <>
                    <TableRow className="bg-muted/30">
                      <TableCell colSpan={3} className="font-semibold text-sm py-2 px-4">Pendapatan</TableCell>
                    </TableRow>
                    {rows.filter(r => r.kelompok === "PENDAPATAN").map(r => (
                      <TableRow key={r.akun_kode}>
                        <TableCell className="font-mono text-sm pl-8">{r.akun_kode}</TableCell>
                        <TableCell className="text-sm">{r.akun_nama}</TableCell>
                        <TableCell className="text-right text-sm font-medium">{formatRp(r.total)}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="border-t">
                      <TableCell colSpan={2} className="font-semibold text-sm pl-8 py-2">Total Pendapatan</TableCell>
                      <TableCell className="text-right font-bold">{formatRp(totalPendapatan)}</TableCell>
                    </TableRow>
                  </>
                )}
                {rows.filter(r => r.kelompok === "BEBAN").length > 0 && (
                  <>
                    <TableRow className="bg-muted/30">
                      <TableCell colSpan={3} className="font-semibold text-sm py-2 px-4">Beban</TableCell>
                    </TableRow>
                    {rows.filter(r => r.kelompok === "BEBAN").map(r => (
                      <TableRow key={r.akun_kode}>
                        <TableCell className="font-mono text-sm pl-8">{r.akun_kode}</TableCell>
                        <TableCell className="text-sm">{r.akun_nama}</TableCell>
                        <TableCell className="text-right text-sm font-medium">{formatRp(r.total)}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="border-t">
                      <TableCell colSpan={2} className="font-semibold text-sm pl-8 py-2">Total Beban</TableCell>
                      <TableCell className="text-right font-bold">{formatRp(totalBeban)}</TableCell>
                    </TableRow>
                  </>
                )}
                <TableRow className="bg-muted/50 border-t-2">
                  <TableCell colSpan={2} className="font-bold py-3">{isLaba ? "Laba Bersih" : "Rugi Bersih"}</TableCell>
                  <TableCell className={`text-right font-bold text-base ${isLaba ? "text-green-600" : "text-destructive"}`}>
                    {formatRp(Math.abs(labaRugiBersih))}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
