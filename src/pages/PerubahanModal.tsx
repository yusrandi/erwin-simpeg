import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { UnitSelector } from "@/components/UnitSelector"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RefreshCw } from "lucide-react"

function formatRp(n: number) {
  return n.toLocaleString("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 })
}

interface ModalRow {
  akun_kode: string
  akun_nama: string
  saldo_awal: number
  saldo_akhir: number
  perubahan: number
}

export default function PerubahanModal() {
  return (
    <UnitSelector>
      {(unitKerjaId) => <PerubahanModalContent unitKerjaId={unitKerjaId} />}
    </UnitSelector>
  )
}

function PerubahanModalContent({ unitKerjaId }: { unitKerjaId: string }) {
  const [rows, setRows] = useState<ModalRow[]>([])
  const [labaRugiAwal, setLabaRugiAwal] = useState(0)
  const [labaRugiAkhir, setLabaRugiAkhir] = useState(0)
  const [loading, setLoading] = useState(true)
  const [periodeAwal, setPeriodeAwal] = useState(
    new Date(new Date().getFullYear(), 0, 1).toISOString().slice(0, 10)
  )
  const [periodeAkhir, setPeriodeAkhir] = useState(
    new Date().toISOString().slice(0, 10)
  )

  async function fetchData() {
    setLoading(true)

    const { data: akunModal } = await supabase
      .from("master_akun").select("kode, nama, tipe_normal")
      .eq("unit_kerja_id", unitKerjaId).eq("kelompok", "MODAL").order("kode")

    const { data: akunLR } = await supabase
      .from("master_akun").select("kode, kelompok, tipe_normal")
      .eq("unit_kerja_id", unitKerjaId).in("kelompok", ["PENDAPATAN", "BEBAN"])

    const semuaKode = [
      ...(akunModal ?? []).map(a => a.kode),
      ...(akunLR ?? []).map(a => a.kode),
    ]

    if (!semuaKode.length) { setRows([]); setLoading(false); return }

    const { data: details } = await supabase
      .from("jurnal_detail").select("akun_kode, debit, kredit, jurnal_umum(tanggal)")
      .in("akun_kode", semuaKode)

    const allDetails = ((details ?? []) as any[])

    function hitungSaldo(kode: string, tipeNormal: string, sampai: string, dari?: string) {
      return allDetails
        .filter(d => {
          const tgl = d.jurnal_umum?.tanggal
          if (dari && tgl < dari) return false
          return tgl <= sampai
        })
        .filter(d => d.akun_kode === kode)
        .reduce((s, d) => s + (tipeNormal === "DEBIT"
          ? Number(d.debit) - Number(d.kredit)
          : Number(d.kredit) - Number(d.debit)), 0)
    }

    function hitungLabaRugi(sampai: string, dari?: string) {
      let pendapatan = 0, beban = 0
      ;(akunLR ?? []).forEach(a => {
        const saldo = hitungSaldo(a.kode, a.tipe_normal, sampai, dari)
        if (a.kelompok === "PENDAPATAN") pendapatan += saldo
        else beban += saldo
      })
      return pendapatan - beban
    }

    const sebelumAwal = new Date(periodeAwal)
    sebelumAwal.setDate(sebelumAwal.getDate() - 1)
    const tglSebelumAwal = sebelumAwal.toISOString().slice(0, 10)

    const modalRows: ModalRow[] = (akunModal ?? []).map(a => {
      const saldo_awal = hitungSaldo(a.kode, a.tipe_normal, tglSebelumAwal)
      const saldo_akhir = hitungSaldo(a.kode, a.tipe_normal, periodeAkhir)
      return { akun_kode: a.kode, akun_nama: a.nama, saldo_awal, saldo_akhir, perubahan: saldo_akhir - saldo_awal }
    })

    setRows(modalRows)
    setLabaRugiAwal(hitungLabaRugi(tglSebelumAwal))
    setLabaRugiAkhir(hitungLabaRugi(periodeAkhir))
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [unitKerjaId, periodeAwal, periodeAkhir])

  const totalModalAwal = rows.reduce((s, r) => s + r.saldo_awal, 0) + labaRugiAwal
  const totalModalAkhir = rows.reduce((s, r) => s + r.saldo_akhir, 0) + labaRugiAkhir
  const totalPerubahan = totalModalAkhir - totalModalAwal

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Perubahan Modal</h1>
          <p className="text-sm text-muted-foreground mt-1">Informasi nilai modal selama periode tertentu</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-2">
              <Label>Awal Periode</Label>
              <Input type="date" value={periodeAwal} onChange={e => setPeriodeAwal(e.target.value)} className="w-44" />
            </div>
            <div className="space-y-2">
              <Label>Akhir Periode</Label>
              <Input type="date" value={periodeAkhir} onChange={e => setPeriodeAkhir(e.target.value)} className="w-44" />
            </div>
          </div>
        </CardContent>
      </Card>

      {!loading && rows.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-5">
              <p className="text-sm text-muted-foreground">Modal Awal Periode</p>
              <p className="text-2xl font-bold text-foreground mt-1">{formatRp(totalModalAwal)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <p className="text-sm text-muted-foreground">Modal Akhir Periode</p>
              <p className="text-2xl font-bold text-foreground mt-1">{formatRp(totalModalAkhir)}</p>
            </CardContent>
          </Card>
          <Card className={totalPerubahan >= 0
            ? "border-green-200 bg-green-50 dark:bg-green-950/20"
            : "border-red-200 bg-red-50 dark:bg-red-950/20"}>
            <CardContent className="p-5">
              <p className="text-sm text-muted-foreground">Perubahan Modal</p>
              <p className={`text-2xl font-bold mt-1 ${totalPerubahan >= 0 ? "text-green-600" : "text-destructive"}`}>
                {totalPerubahan >= 0 ? "+" : ""}{formatRp(totalPerubahan)}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-40 text-muted-foreground gap-2">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-foreground" /> Memuat...
        </div>
      ) : rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-40 text-muted-foreground text-sm border rounded-lg border-dashed gap-2">
          <p>Belum ada akun Modal.</p>
          <p>Tambahkan di <strong>Master Akun</strong> dengan kelompok MODAL.</p>
        </div>
      ) : (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Laporan Perubahan Modal</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Kode</TableHead><TableHead>Nama Akun</TableHead>
                  <TableHead className="text-right">Saldo Awal</TableHead>
                  <TableHead className="text-right">Perubahan</TableHead>
                  <TableHead className="text-right">Saldo Akhir</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map(r => (
                  <TableRow key={r.akun_kode}>
                    <TableCell className="font-mono text-sm">{r.akun_kode}</TableCell>
                    <TableCell className="text-sm">{r.akun_nama}</TableCell>
                    <TableCell className="text-right text-sm">{formatRp(r.saldo_awal)}</TableCell>
                    <TableCell className={`text-right text-sm font-medium ${r.perubahan < 0 ? "text-destructive" : r.perubahan > 0 ? "text-green-600" : ""}`}>
                      {r.perubahan > 0 ? "+" : ""}{formatRp(r.perubahan)}
                    </TableCell>
                    <TableCell className="text-right text-sm font-medium">{formatRp(r.saldo_akhir)}</TableCell>
                  </TableRow>
                ))}
                <TableRow>
                  <TableCell className="font-mono text-sm text-muted-foreground">—</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {labaRugiAkhir >= 0 ? "Laba Bersih" : "Rugi Bersih"} Periode Berjalan
                  </TableCell>
                  <TableCell className="text-right text-sm">{formatRp(labaRugiAwal)}</TableCell>
                  <TableCell className={`text-right text-sm font-medium ${(labaRugiAkhir - labaRugiAwal) < 0 ? "text-destructive" : "text-green-600"}`}>
                    {(labaRugiAkhir - labaRugiAwal) > 0 ? "+" : ""}{formatRp(labaRugiAkhir - labaRugiAwal)}
                  </TableCell>
                  <TableCell className={`text-right text-sm font-medium ${labaRugiAkhir < 0 ? "text-destructive" : ""}`}>
                    {formatRp(labaRugiAkhir)}
                  </TableCell>
                </TableRow>
                <TableRow className="bg-muted/50 border-t-2 font-bold">
                  <TableCell colSpan={2}>Total Modal</TableCell>
                  <TableCell className="text-right">{formatRp(totalModalAwal)}</TableCell>
                  <TableCell className={`text-right ${totalPerubahan < 0 ? "text-destructive" : "text-green-600"}`}>
                    {totalPerubahan > 0 ? "+" : ""}{formatRp(totalPerubahan)}
                  </TableCell>
                  <TableCell className="text-right">{formatRp(totalModalAkhir)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
