import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { UnitSelector } from "@/components/UnitSelector"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart3 } from "lucide-react"
import type { Pegawai } from "@/types/pegawai"

function BarItem({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-slate-600 dark:text-slate-400 w-36 text-right shrink-0 truncate">{label}</span>
      <div className="flex-1 bg-muted rounded-full h-5 relative overflow-hidden">
        <div
          className={`h-5 rounded-full transition-all duration-500 flex items-center justify-end pr-2 ${color}`}
          style={{ width: `${max ? (value / max) * 100 : 0}%` }}
        >
          {value > 0 && <span className="text-white text-xs font-semibold">{value}</span>}
        </div>
      </div>
    </div>
  )
}

const barColors = [
  "bg-foreground", "bg-foreground/80", "bg-foreground/60",
  "bg-foreground/50", "bg-foreground/40", "bg-foreground/30"
]

export default function Statistik() {
  return (
    <UnitSelector>
      {(unitKerjaId) => <StatistikContent unitKerjaId={unitKerjaId} />}
    </UnitSelector>
  )
}

function StatistikContent({ unitKerjaId }: { unitKerjaId: string }) {
  const [data, setData] = useState<Pegawai[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    supabase
      .from("pegawai").select("*")
      .eq("unit_kerja_id", unitKerjaId)
      .then(({ data: rows }) => {
        setData(rows ?? [])
        setLoading(false)
      })
  }, [unitKerjaId])

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground" />
    </div>
  )

  // Jabatan stats
  const jabatanMap: Record<string, number> = {}
  data.forEach(d => { jabatanMap[d.jabatan] = (jabatanMap[d.jabatan] || 0) + 1 })
  const jabatanStats = Object.entries(jabatanMap).sort((a, b) => b[1] - a[1])
  const maxJabatan = Math.max(...jabatanStats.map(j => j[1]), 1)

  // Pendidikan stats
  const didikMap: Record<string, number> = {}
  data.forEach(d => { didikMap[d.pendidikan_terakhir] = (didikMap[d.pendidikan_terakhir] || 0) + 1 })
  const didikStats = Object.entries(didikMap).sort((a, b) => b[1] - a[1])
  const maxDidik = Math.max(...didikStats.map(d => d[1]), 1)

  // Jalur masuk
  const jalurMap: Record<string, number> = {}
  data.forEach(d => { jalurMap[d.jalur_masuk] = (jalurMap[d.jalur_masuk] || 0) + 1 })
  const jalurStats = Object.entries(jalurMap).sort((a, b) => b[1] - a[1])
  const maxJalur = Math.max(...jalurStats.map(j => j[1]), 1)

  // Tahun masuk
  const tahunMap: Record<number, number> = {}
  data.forEach(d => { tahunMap[d.tahun_masuk] = (tahunMap[d.tahun_masuk] || 0) + 1 })
  const tahunStats = Object.entries(tahunMap).sort((a, b) => Number(a[0]) - Number(b[0]))
  const maxTahun = Math.max(...tahunStats.map(t => t[1]), 1)

  // Status komposisi
  const aktif = data.filter(d => d.aktif === "AKTIF").length
  const tetap = data.filter(d => d.status_pegawai === "TETAP").length
  const menikah = data.filter(d => d.menikah === "MENIKAH").length
  const lakiLaki = data.filter(d => d.jenis_kelamin === "LAKI-LAKI").length

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Statistik</h1>
        <p className="text-sm text-muted-foreground mt-1">Analisis data kepegawaian secara visual</p>
      </div>

      {data.length === 0 ? (
        <div className="flex items-center justify-center h-40 text-muted-foreground text-sm border rounded-lg border-dashed">
          Belum ada data pegawai di unit ini
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <BarChart3 className="w-4 h-4" /> Berdasarkan Jabatan
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2.5">
                {jabatanStats.map(([jabatan, count], i) => (
                  <BarItem key={jabatan} label={jabatan} value={count} max={maxJabatan} color={barColors[i % barColors.length]} />
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <BarChart3 className="w-4 h-4" /> Berdasarkan Pendidikan
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2.5">
                {didikStats.map(([didik, count], i) => (
                  <BarItem key={didik} label={didik} value={count} max={maxDidik} color={barColors[i % barColors.length]} />
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <BarChart3 className="w-4 h-4" /> Berdasarkan Jalur Masuk
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2.5">
                {jalurStats.map(([jalur, count], i) => (
                  <BarItem key={jalur} label={jalur} value={count} max={maxJalur} color={barColors[i % barColors.length]} />
                ))}
              </CardContent>
            </Card>

            <Card className="lg:col-span-1">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <BarChart3 className="w-4 h-4" /> Rekrutmen per Tahun
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2.5">
                {tahunStats.map(([tahun, count], i) => (
                  <BarItem key={tahun} label={tahun} value={count} max={maxTahun} color={barColors[i % barColors.length]} />
                ))}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Ringkasan Komposisi</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: "Total Pegawai", value: data.length },
                  { label: "% Aktif", value: `${data.length ? Math.round((aktif / data.length) * 100) : 0}%` },
                  { label: "% Tetap", value: `${data.length ? Math.round((tetap / data.length) * 100) : 0}%` },
                  { label: "% Laki-laki", value: `${data.length ? Math.round((lakiLaki / data.length) * 100) : 0}%` },
                  { label: "Pegawai Aktif", value: aktif },
                  { label: "Pegawai Tetap", value: tetap },
                  { label: "Sudah Menikah", value: menikah },
                  { label: "Belum Menikah", value: data.length - menikah },
                ].map(item => (
                  <div key={item.label} className="text-center p-4 bg-muted/40 rounded-lg">
                    <p className="text-2xl font-bold text-foreground">{item.value}</p>
                    <p className="text-xs text-muted-foreground mt-1">{item.label}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
