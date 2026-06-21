import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { UnitSelector } from "@/components/UnitSelector"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RefreshCw } from "lucide-react"
import type { NeracaRow } from "@/types/keuangan"

function formatRp(n: number) {
  return n.toLocaleString("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 })
}

type KelompokNeraca = "ASET" | "KEWAJIBAN" | "MODAL"

export default function Neraca() {
  return (
    <UnitSelector>
      {(unitKerjaId) => <NeracaContent unitKerjaId={unitKerjaId} />}
    </UnitSelector>
  )
}

function NeracaContent({ unitKerjaId }: { unitKerjaId: string }) {
  const [rows, setRows] = useState<NeracaRow[]>([])
  const [labaRugi, setLabaRugi] = useState(0)
  const [loading, setLoading] = useState(true)
  const [filterDate, setFilterDate] = useState(new Date().toISOString().slice(0, 10))

  async function fetchData() {
    setLoading(true)

    const { data: akunNeraca } = await supabase
      .from("master_akun").select("kode, nama, kelompok, tipe_normal")
      .eq("unit_kerja_id", unitKerjaId)
      .in("kelompok", ["ASET", "KEWAJIBAN", "MODAL"])
      .order("kelompok").order("kode")

    const { data: akunLR } = await supabase
      .from("master_akun").select("kode, kelompok, tipe_normal")
      .eq("unit_kerja_id", unitKerjaId)
      .in("kelompok", ["PENDAPATAN", "BEBAN"])

    const semuaAkun = [...(akunNeraca ?? []), ...(akunLR ?? [])]
    if (!semuaAkun.length) { setRows([]); setLoading(false); return }

    const { data: details } = await supabase
      .from("jurnal_detail").select("akun_kode, debit, kredit, jurnal_umum(tanggal)")
      .in("akun_kode", semuaAkun.map(a => a.kode))

    const filtered = ((details ?? []) as any[]).filter(d => d.jurnal_umum?.tanggal <= filterDate)

    const map = new Map<string, number>()
    filtered.forEach(d => {
      const akun = semuaAkun.find(a => a.kode === d.akun_kode)
      if (!akun) return
      const nilai = akun.tipe_normal === "DEBIT"
        ? Number(d.debit) - Number(d.kredit)
        : Number(d.kredit) - Number(d.debit)
      map.set(d.akun_kode, (map.get(d.akun_kode) ?? 0) + nilai)
    })

    setRows((akunNeraca ?? []).map(a => ({
      akun_kode: a.kode, akun_nama: a.nama,
      kelompok: a.kelompok as KelompokNeraca,
      total: map.get(a.kode) ?? 0,
    })))

    let pendapatan = 0, beban = 0
    ;(akunLR ?? []).forEach(a => {
      const saldo = map.get(a.kode) ?? 0
      if (a.kelompok === "PENDAPATAN") pendapatan += saldo
      else beban += saldo
    })
    setLabaRugi(pendapatan - beban)
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [unitKerjaId, filterDate])

  function subtotal(k: KelompokNeraca) {
    return rows.filter(r => r.kelompok === k).reduce((s, r) => s + r.total, 0)
  }

  const totalAset = subtotal("ASET")
  const totalKewajiban = subtotal("KEWAJIBAN")
  const totalModal = subtotal("MODAL") + labaRugi
  const totalPassiva = totalKewajiban + totalModal
  const isBalance = Math.abs(totalAset - totalPassiva) < 1

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Neraca</h1>
          <p className="text-sm text-muted-foreground mt-1">Menampilkan posisi keuangan pada tanggal tertentu</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4 items-end">
            <div className="space-y-2">
              <Label>Per Tanggal</Label>
              <Input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)} className="w-44" />
            </div>
          </div>
        </CardContent>
      </Card>

      {!loading && rows.length > 0 && (
        <>
          <div className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium ${
            isBalance
              ? "bg-green-50 border-green-200 text-green-700 dark:bg-green-950/20 dark:border-green-900 dark:text-green-400"
              : "bg-red-50 border-red-200 text-red-700 dark:bg-red-950/20 dark:border-red-900 dark:text-red-400"
          }`}>
            {isBalance
              ? "✓ Neraca balance — Total Aset = Total Kewajiban + Modal"
              : `⚠ Neraca belum balance — selisih ${formatRp(Math.abs(totalAset - totalPassiva))}`}
          </div>

          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "Total Aset", value: formatRp(totalAset) },
              { label: "Total Kewajiban", value: formatRp(totalKewajiban) },
              { label: "Total Modal", value: formatRp(totalModal), sub: `Termasuk ${labaRugi >= 0 ? "laba" : "rugi"} ${formatRp(Math.abs(labaRugi))}` },
            ].map(item => (
              <Card key={item.label}>
                <CardContent className="p-5">
                  <p className="text-sm text-muted-foreground">{item.label}</p>
                  <p className="text-2xl font-bold text-foreground mt-1">{item.value}</p>
                  {item.sub && <p className="text-xs text-muted-foreground mt-1">{item.sub}</p>}
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-40 text-muted-foreground gap-2">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-foreground" /> Memuat...
        </div>
      ) : rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-40 text-muted-foreground text-sm border rounded-lg border-dashed gap-2">
          <p>Belum ada akun Aset, Kewajiban, atau Modal.</p>
          <p>Tambahkan di <strong>Master Akun</strong> terlebih dahulu.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Aset</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Kode</TableHead><TableHead>Nama Akun</TableHead>
                    <TableHead className="text-right">Saldo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.filter(r => r.kelompok === "ASET").map(r => (
                    <TableRow key={r.akun_kode}>
                      <TableCell className="font-mono text-sm">{r.akun_kode}</TableCell>
                      <TableCell className="text-sm">{r.akun_nama}</TableCell>
                      <TableCell className="text-right text-sm font-medium">{formatRp(r.total)}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-muted/50 border-t-2 font-bold">
                    <TableCell colSpan={2}>Total Aset</TableCell>
                    <TableCell className="text-right">{formatRp(totalAset)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Kewajiban & Modal</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Kode</TableHead><TableHead>Nama Akun</TableHead>
                    <TableHead className="text-right">Saldo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.filter(r => r.kelompok === "KEWAJIBAN").length > 0 && (
                    <>
                      <TableRow className="bg-muted/30">
                        <TableCell colSpan={3} className="font-semibold text-sm py-2 px-4">Kewajiban</TableCell>
                      </TableRow>
                      {rows.filter(r => r.kelompok === "KEWAJIBAN").map(r => (
                        <TableRow key={r.akun_kode}>
                          <TableCell className="font-mono text-sm pl-8">{r.akun_kode}</TableCell>
                          <TableCell className="text-sm">{r.akun_nama}</TableCell>
                          <TableCell className="text-right text-sm font-medium">{formatRp(r.total)}</TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="border-t">
                        <TableCell colSpan={2} className="font-semibold text-sm pl-8 py-2">Total Kewajiban</TableCell>
                        <TableCell className="text-right font-bold">{formatRp(totalKewajiban)}</TableCell>
                      </TableRow>
                    </>
                  )}
                  {rows.filter(r => r.kelompok === "MODAL").length > 0 && (
                    <>
                      <TableRow className="bg-muted/30">
                        <TableCell colSpan={3} className="font-semibold text-sm py-2 px-4">Modal</TableCell>
                      </TableRow>
                      {rows.filter(r => r.kelompok === "MODAL").map(r => (
                        <TableRow key={r.akun_kode}>
                          <TableCell className="font-mono text-sm pl-8">{r.akun_kode}</TableCell>
                          <TableCell className="text-sm">{r.akun_nama}</TableCell>
                          <TableCell className="text-right text-sm font-medium">{formatRp(r.total)}</TableCell>
                        </TableRow>
                      ))}
                      <TableRow>
                        <TableCell className="font-mono text-sm pl-8 text-muted-foreground">—</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {labaRugi >= 0 ? "Laba Bersih" : "Rugi Bersih"} Tahun Berjalan
                        </TableCell>
                        <TableCell className={`text-right text-sm font-medium ${labaRugi < 0 ? "text-destructive" : ""}`}>
                          {formatRp(labaRugi)}
                        </TableCell>
                      </TableRow>
                      <TableRow className="border-t">
                        <TableCell colSpan={2} className="font-semibold text-sm pl-8 py-2">Total Modal</TableCell>
                        <TableCell className="text-right font-bold">{formatRp(totalModal)}</TableCell>
                      </TableRow>
                    </>
                  )}
                  <TableRow className={`border-t-2 font-bold ${!isBalance ? "bg-red-50 dark:bg-red-950/20" : "bg-muted/50"}`}>
                    <TableCell colSpan={2}>Total Kewajiban & Modal</TableCell>
                    <TableCell className="text-right">{formatRp(totalPassiva)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
