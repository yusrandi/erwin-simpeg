import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/hooks/useAuth"
import { useUnit } from "@/hooks/useUnit"
import { UnitSelector } from "@/components/UnitSelector"
import { StatCard } from "@/components/StatCard"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Users, UserCheck, UserX, Award, GraduationCap, Building, TrendingUp, Heart } from "lucide-react"
import type { Pegawai } from "@/types/pegawai"

export default function Dashboard() {
  const { isSuperadminPesantren } = useUnit()

  // Superadmin pesantren perlu pilih unit dulu
  if (isSuperadminPesantren) {
    return (
      <UnitSelector>
        {(unitKerjaId, pesantrenId) => (
          <DashboardContent unitKerjaId={unitKerjaId} pesantrenId={pesantrenId} />
        )}
      </UnitSelector>
    )
  }

  // Admin unit langsung render
  return <DashboardContentFromAuth />
}

// Untuk admin unit — ambil dari auth
function DashboardContentFromAuth() {
  const { profile } = useAuth()
  if (!profile?.unit_kerja_id || !profile?.pesantren_id) return null
  return <DashboardContent unitKerjaId={profile.unit_kerja_id} pesantrenId={profile.pesantren_id} />
}

interface Stats {
  total: number
  aktif: number
  nonAktif: number
  tetap: number
  tidakTetap: number
  lakiLaki: number
  perempuan: number
}

function DashboardContent({ unitKerjaId }: { unitKerjaId: string; pesantrenId: string }) {
  const [stats, setStats] = useState<Stats | null>(null)
  const [recent, setRecent] = useState<Pegawai[]>([])
  const [jabatanStats, setJabatanStats] = useState<{ label: string; count: number }[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const { data } = await supabase
        .from("pegawai").select("*")
        .eq("unit_kerja_id", unitKerjaId)

      if (!data) { setLoading(false); return }

      setStats({
        total: data.length,
        aktif: data.filter(d => d.aktif === "AKTIF").length,
        nonAktif: data.filter(d => d.aktif === "NON AKTIF").length,
        tetap: data.filter(d => d.status_pegawai === "TETAP").length,
        tidakTetap: data.filter(d => d.status_pegawai === "TIDAK TETAP").length,
        lakiLaki: data.filter(d => d.jenis_kelamin === "LAKI-LAKI").length,
        perempuan: data.filter(d => d.jenis_kelamin === "PEREMPUAN").length,
      })

      setRecent(data.slice(-5).reverse())

      const jabatanMap: Record<string, number> = {}
      data.forEach(d => { jabatanMap[d.jabatan] = (jabatanMap[d.jabatan] || 0) + 1 })
      setJabatanStats(
        Object.entries(jabatanMap)
          .map(([label, count]) => ({ label, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5)
      )

      setLoading(false)
    }
    load()
  }, [unitKerjaId])

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground" />
    </div>
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">Ringkasan data kepegawaian</p>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard title="Total Pegawai" value={stats?.total ?? 0} icon={Users} subtitle="Seluruh data pegawai" />
        <StatCard title="Pegawai Aktif" value={stats?.aktif ?? 0} icon={UserCheck} subtitle="Saat ini aktif" />
        <StatCard title="Non Aktif" value={stats?.nonAktif ?? 0} icon={UserX} subtitle="Tidak aktif" />
        <StatCard title="Status Tetap" value={stats?.tetap ?? 0} icon={Award} subtitle="Pegawai tetap" />
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard title="Tidak Tetap" value={stats?.tidakTetap ?? 0} icon={TrendingUp} subtitle="Pegawai kontrak" />
        <StatCard title="Laki-laki" value={stats?.lakiLaki ?? 0} icon={Users} subtitle="Pegawai pria" />
        <StatCard title="Perempuan" value={stats?.perempuan ?? 0} icon={Heart} subtitle="Pegawai wanita" />
        <StatCard title="Jabatan" value={jabatanStats.length} icon={Building} subtitle="Jenis jabatan" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Building className="w-4 h-4" /> Top Jabatan
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {jabatanStats.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Belum ada data</p>
            ) : jabatanStats.map(({ label, count }) => (
              <div key={label} className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground flex-1 truncate">{label}</span>
                <div className="w-24 bg-muted rounded-full h-2">
                  <div
                    className="bg-foreground h-2 rounded-full"
                    style={{ width: `${(count / (stats?.total || 1)) * 100}%` }}
                  />
                </div>
                <span className="text-sm font-semibold w-6 text-right">{count}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <GraduationCap className="w-4 h-4" /> Pegawai Terbaru
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {recent.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Belum ada data</p>
            ) : recent.map(p => (
              <div key={p.id} className="flex items-center justify-between py-1">
                <div>
                  <p className="text-sm font-medium text-foreground">{p.nama_pegawai}</p>
                  <p className="text-xs text-muted-foreground">{p.jabatan}</p>
                </div>
                <Badge variant={p.aktif === "AKTIF" ? "success" : "secondary"} className="text-xs">
                  {p.aktif}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
