import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/hooks/useAuth"
import { useUnit } from "@/hooks/useUnit"
import { useLangganan } from "@/hooks/useLangganan"
import { UnitSelector } from "@/components/UnitSelector"
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts"
import {
  Users, Award, TrendingUp,
  TrendingDown, Wallet, ArrowUpRight, ArrowDownRight,
  Building, BookOpen, CreditCard, Calendar
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

function formatRp(n: number) {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}M`
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}Jt`
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}Rb`
  return n.toString()
}

function formatRpFull(n: number) {
  return n.toLocaleString("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 })
}

const BULAN = ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"]

export default function Dashboard() {
  const { isSuperadminPesantren } = useUnit()

  if (isSuperadminPesantren) {
    return (
      <UnitSelector>
        {(unitKerjaId, pesantrenId) => (
          <DashboardContent unitKerjaId={unitKerjaId} pesantrenId={pesantrenId} />
        )}
      </UnitSelector>
    )
  }
  return <DashboardContentFromAuth />
}

function DashboardContentFromAuth() {
  const { profile } = useAuth()
  if (!profile?.unit_kerja_id || !profile?.pesantren_id) return null
  return <DashboardContent unitKerjaId={profile.unit_kerja_id} pesantrenId={profile.pesantren_id} />
}

// interface StatCard {
//   label: string
//   value: string | number
//   sub: string
//   icon: any
//   trend?: number
//   color: string
// }

function DashboardContent({ unitKerjaId }: { unitKerjaId: string; pesantrenId: string }) {
  const { langganan, paket, sisaHariTrial } = useLangganan()

  // States
  const [unitNama, setUnitNama] = useState("")
  const [loading, setLoading] = useState(true)

  // Pegawai stats
  const [totalPegawai, setTotalPegawai] = useState(0)
  const [aktifPegawai, setAktifPegawai] = useState(0)
  const [tetapPegawai, setTetapPegawai] = useState(0)
  const [recentPegawai, setRecentPegawai] = useState<any[]>([])
  const [pegawaiByJabatan, setPegawaiByJabatan] = useState<any[]>([])
  const [pegawaiByStatus, setPegawaiByStatus] = useState<any[]>([])

  // Keuangan stats
  const [totalKasMasuk, setTotalKasMasuk] = useState(0)
  const [totalKasKeluar, setTotalKasKeluar] = useState(0)
  const [totalHutang, setTotalHutang] = useState(0)
  const [totalJurnal, setTotalJurnal] = useState(0)
  const [kasChartData, setKasChartData] = useState<any[]>([])
  const [jurnalChartData, setJurnalChartData] = useState<any[]>([])

  useEffect(() => {
    async function load() {
      setLoading(true)

      // Nama unit
      const { data: unit } = await supabase
        .from("unit_kerja").select("nama").eq("id", unitKerjaId).single()
      setUnitNama(unit?.nama ?? "")

      await Promise.all([
        loadPegawai(),
        loadKeuangan(),
      ])

      setLoading(false)
    }
    load()
  }, [unitKerjaId])

  async function loadPegawai() {
    const { data } = await supabase
      .from("pegawai").select("*").eq("unit_kerja_id", unitKerjaId)

    if (!data) return

    setTotalPegawai(data.length)
    setAktifPegawai(data.filter(d => d.aktif === "AKTIF").length)
    setTetapPegawai(data.filter(d => d.status_pegawai === "TETAP").length)
    setRecentPegawai(data.slice(-4).reverse())

    // By jabatan (top 5)
    const jabatanMap: Record<string, number> = {}
    data.forEach(d => { jabatanMap[d.jabatan] = (jabatanMap[d.jabatan] || 0) + 1 })
    setPegawaiByJabatan(
      Object.entries(jabatanMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, value]) => ({ name, value }))
    )

    // By status untuk pie chart
    const aktif = data.filter(d => d.aktif === "AKTIF").length
    const nonAktif = data.length - aktif
    // const tetap = data.filter(d => d.status_pegawai === "TETAP").length
    // const tidakTetap = data.length - tetap
    setPegawaiByStatus([
      { name: "Aktif", value: aktif, color: "#0f172a" },
      { name: "Non Aktif", value: nonAktif, color: "#94a3b8" },
    ])
  }

  async function loadKeuangan() {
    const tahunIni = new Date().getFullYear()

    // Kas transaksi tahun ini
    const { data: kasData } = await supabase
      .from("kas_transaksi").select("tipe, jumlah, tanggal")
      .eq("unit_kerja_id", unitKerjaId)
      .gte("tanggal", `${tahunIni}-01-01`)
      .lte("tanggal", `${tahunIni}-12-31`)

    if (kasData) {
      const masuk = kasData.filter(d => d.tipe === "KAS_MASUK" || d.tipe === "SALDO_AWAL")
        .reduce((s, d) => s + Number(d.jumlah), 0)
      const keluar = kasData.filter(d => d.tipe === "KAS_KELUAR")
        .reduce((s, d) => s + Number(d.jumlah), 0)
      setTotalKasMasuk(masuk)
      setTotalKasKeluar(keluar)

      // Group by bulan untuk chart
      const byBulan = Array.from({ length: 12 }, (_, i) => ({
        bulan: BULAN[i],
        masuk: 0,
        keluar: 0,
      }))
      kasData.forEach(d => {
        const bulan = new Date(d.tanggal).getMonth()
        if (d.tipe === "KAS_MASUK" || d.tipe === "SALDO_AWAL") byBulan[bulan].masuk += Number(d.jumlah)
        if (d.tipe === "KAS_KELUAR") byBulan[bulan].keluar += Number(d.jumlah)
      })
      // Hanya tampilkan s.d. bulan ini
      const bulanIni = new Date().getMonth()
      setKasChartData(byBulan.slice(0, bulanIni + 1))
    }

    // Hutang
    const { data: hutangData } = await supabase
      .from("hutang").select("sisa_hutang")
      .eq("unit_kerja_id", unitKerjaId)
      .neq("status", "LUNAS")
    setTotalHutang(hutangData?.reduce((s, d) => s + Number(d.sisa_hutang), 0) ?? 0)

    // Jurnal per bulan tahun ini
    const { data: jurnalData } = await supabase
      .from("jurnal_umum").select("tanggal")
      .eq("unit_kerja_id", unitKerjaId)
      .gte("tanggal", `${tahunIni}-01-01`)
    setTotalJurnal(jurnalData?.length ?? 0)

    if (jurnalData) {
      const byBulan = Array.from({ length: 12 }, (_, i) => ({
        bulan: BULAN[i], jurnal: 0,
      }))
      jurnalData.forEach(d => {
        const bulan = new Date(d.tanggal).getMonth()
        byBulan[bulan].jurnal++
      })
      const bulanIni = new Date().getMonth()
      setJurnalChartData(byBulan.slice(0, bulanIni + 1))
    }
  }

  const saldoNet = totalKasMasuk - totalKasKeluar

//   const COLORS_PIE = ["#0f172a", "#94a3b8", "#475569", "#cbd5e1"]

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null
    return (
      <div className="bg-background border border-border rounded-lg shadow-lg p-3 text-xs">
        <p className="font-semibold text-foreground mb-1">{label}</p>
        {payload.map((p: any) => (
          <p key={p.name} style={{ color: p.color }}>
            {p.name}: {typeof p.value === "number" && p.value > 999
              ? formatRpFull(p.value)
              : p.value}
          </p>
        ))}
      </div>
    )
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground" />
    </div>
  )

  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {unitNama} · {new Date().toLocaleDateString("id-ID", { dateStyle: "long" })}
          </p>
        </div>
        {langganan?.status === "TRIAL" && (
          <div className="flex items-center gap-2 bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-900 text-yellow-700 dark:text-yellow-400 text-xs font-medium px-3 py-2 rounded-lg">
            <Calendar className="w-3.5 h-3.5" />
            Trial {sisaHariTrial} hari lagi
          </div>
        )}
      </div>

      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          {
            label: "Total Pegawai",
            value: totalPegawai,
            sub: `${aktifPegawai} aktif`,
            icon: Users,
            color: "bg-blue-500",
          },
          {
            label: "Kas Masuk",
            value: `Rp ${formatRp(totalKasMasuk)}`,
            sub: "Tahun ini",
            icon: TrendingUp,
            color: "bg-green-500",
            trend: 1,
          },
          {
            label: "Kas Keluar",
            value: `Rp ${formatRp(totalKasKeluar)}`,
            sub: "Tahun ini",
            icon: TrendingDown,
            color: "bg-red-500",
            trend: -1,
          },
          {
            label: "Sisa Hutang",
            value: `Rp ${formatRp(totalHutang)}`,
            sub: "Belum lunas",
            icon: CreditCard,
            color: totalHutang > 0 ? "bg-orange-500" : "bg-slate-400",
          },
        ].map(s => (
          <Card key={s.label} className="border overflow-hidden">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className="space-y-1 flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground font-medium">{s.label}</p>
                  <p className="text-2xl font-bold text-foreground truncate">{s.value}</p>
                  <div className="flex items-center gap-1">
                    {s.trend === 1 && <ArrowUpRight className="w-3 h-3 text-green-500" />}
                    {s.trend === -1 && <ArrowDownRight className="w-3 h-3 text-red-500" />}
                    <p className="text-xs text-muted-foreground">{s.sub}</p>
                  </div>
                </div>
                <div className={`w-10 h-10 ${s.color} rounded-xl flex items-center justify-center shrink-0 ml-3`}>
                  <s.icon className="w-5 h-5 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Row 2: Stat tambahan ── */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          { label: "Pegawai Tetap", value: tetapPegawai, total: totalPegawai, icon: Award, color: "text-purple-600" },
          { label: "Tidak Tetap", value: totalPegawai - tetapPegawai, total: totalPegawai, icon: Users, color: "text-orange-600" },
          { label: "Jurnal Tahun Ini", value: totalJurnal, icon: BookOpen, color: "text-blue-600" },
          { label: "Saldo Bersih", value: `Rp ${formatRp(saldoNet)}`, icon: Wallet, color: saldoNet >= 0 ? "text-green-600" : "text-red-600" },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="p-5 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center shrink-0">
                <s.icon className={`w-5 h-5 ${s.color}`} />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className={`text-xl font-bold mt-0.5 ${s.color} truncate`}>
                  {s.value}
                </p>
                {"total" in s && s.total! > 0 && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {Math.round(((s.value as number) / s.total!) * 100)}% dari total
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Charts Row 1: Kas Trend + Jabatan ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Area Chart — Kas Masuk vs Keluar */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center justify-between">
              <span>Arus Kas Tahun {new Date().getFullYear()}</span>
              <div className="flex items-center gap-4 text-xs font-normal">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-900 dark:bg-slate-100" />
                  Masuk
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-400" />
                  Keluar
                </span>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {kasChartData.length === 0 ? (
              <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
                Belum ada data transaksi tahun ini
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={kasChartData} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id="gradMasuk" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0f172a" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#0f172a" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradKeluar" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#94a3b8" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.06} />
                  <XAxis dataKey="bulan" tick={{ fontSize: 11, fill: "currentColor", opacity: 0.5 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "currentColor", opacity: 0.5 }} axisLine={false} tickLine={false}
                    tickFormatter={v => formatRp(v)} width={45} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="masuk" name="Kas Masuk" stroke="#0f172a"
                    strokeWidth={2} fill="url(#gradMasuk)" dot={{ fill: "#0f172a", r: 3 }} activeDot={{ r: 5 }} />
                  <Area type="monotone" dataKey="keluar" name="Kas Keluar" stroke="#94a3b8"
                    strokeWidth={2} fill="url(#gradKeluar)" dot={{ fill: "#94a3b8", r: 3 }} activeDot={{ r: 5 }} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Pie Chart — Status Pegawai */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Status Pegawai</CardTitle>
          </CardHeader>
          <CardContent>
            {totalPegawai === 0 ? (
              <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
                Belum ada data pegawai
              </div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie
                      data={pegawaiByStatus}
                      cx="50%" cy="50%"
                      innerRadius={45} outerRadius={70}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {pegawaiByStatus.map((entry, i) => (
                        <Cell key={i} fill={entry.color} strokeWidth={0} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2 mt-2">
                  {pegawaiByStatus.map(s => (
                    <div key={s.name} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: s.color }} />
                        <span className="text-muted-foreground">{s.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-foreground">{s.value}</span>
                        <span className="text-xs text-muted-foreground">
                          ({Math.round((s.value / totalPegawai) * 100)}%)
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Charts Row 2: Jurnal + Jabatan + Recent ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Bar Chart — Jurnal per Bulan */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Jurnal per Bulan</CardTitle>
          </CardHeader>
          <CardContent>
            {jurnalChartData.length === 0 ? (
              <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
                Belum ada jurnal tahun ini
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={jurnalChartData} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.06} vertical={false} />
                  <XAxis dataKey="bulan" tick={{ fontSize: 10, fill: "currentColor", opacity: 0.5 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "currentColor", opacity: 0.5 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="jurnal" name="Jurnal" fill="currentColor" radius={[4, 4, 0, 0]} maxBarSize={32}
                    className="fill-foreground opacity-80" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Bar Chart — Top Jabatan */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Top Jabatan</CardTitle>
          </CardHeader>
          <CardContent>
            {pegawaiByJabatan.length === 0 ? (
              <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
                Belum ada data
              </div>
            ) : (
              <div className="space-y-3 pt-2">
                {pegawaiByJabatan.map((j, i) => (
                  <div key={j.name} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-foreground font-medium truncate flex-1 mr-2">{j.name}</span>
                      <span className="text-muted-foreground font-semibold shrink-0">{j.value}</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-1.5">
                      <div
                        className="h-1.5 rounded-full bg-foreground transition-all"
                        style={{ width: `${(j.value / pegawaiByJabatan[0].value) * 100}%`, opacity: 1 - i * 0.15 }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent pegawai */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center justify-between">
              Pegawai Terbaru
              <Badge variant="outline" className="text-xs font-normal">{totalPegawai} total</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentPegawai.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">Belum ada data</p>
            ) : recentPegawai.map(p => (
              <div key={p.id} className="flex items-center gap-3">
                <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center shrink-0">
                  <span className="text-xs font-bold text-foreground">
                    {p.nama_pegawai.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{p.nama_pegawai}</p>
                  <p className="text-xs text-muted-foreground">{p.jabatan}</p>
                </div>
                <Badge variant={p.aktif === "AKTIF" ? "success" : "secondary"} className="text-xs shrink-0">
                  {p.aktif === "AKTIF" ? "Aktif" : "Non Aktif"}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* ── Summary Row ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Ringkasan keuangan */}
        <Card className="md:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Ringkasan Keuangan Tahun {new Date().getFullYear()}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: "Total Kas Masuk", value: formatRpFull(totalKasMasuk), color: "text-green-600", bg: "bg-green-50 dark:bg-green-950/20" },
                { label: "Total Kas Keluar", value: formatRpFull(totalKasKeluar), color: "text-red-600", bg: "bg-red-50 dark:bg-red-950/20" },
                { label: "Saldo Bersih", value: formatRpFull(saldoNet), color: saldoNet >= 0 ? "text-blue-600" : "text-red-600", bg: "bg-blue-50 dark:bg-blue-950/20" },
              ].map(item => (
                <div key={item.label} className={`rounded-xl p-4 ${item.bg}`}>
                  <p className="text-xs text-muted-foreground mb-1">{item.label}</p>
                  <p className={`font-bold text-base ${item.color}`}>{item.value}</p>
                </div>
              ))}
            </div>

            {/* Progress bar kas */}
            {(totalKasMasuk > 0 || totalKasKeluar > 0) && (
              <div className="mt-4 space-y-2">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Rasio Pengeluaran</span>
                  <span>{totalKasMasuk > 0 ? Math.round((totalKasKeluar / totalKasMasuk) * 100) : 0}%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className="h-2 rounded-full bg-foreground transition-all"
                    style={{ width: `${totalKasMasuk > 0 ? Math.min((totalKasKeluar / totalKasMasuk) * 100, 100) : 0}%` }}
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Info paket */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Info Langganan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-foreground rounded-xl flex items-center justify-center">
                <Building className="w-5 h-5 text-background" />
              </div>
              <div>
                <p className="font-bold text-foreground">{paket?.nama ?? "—"}</p>
                <p className="text-xs text-muted-foreground">
                  {langganan?.status === "TRIAL" ? "Masa Trial" : "Langganan Aktif"}
                </p>
              </div>
            </div>

            {langganan?.status === "TRIAL" && (
              <div className={`rounded-lg p-3 text-sm ${
                sisaHariTrial <= 3
                  ? "bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900"
                  : "bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-900"
              }`}>
                <p className={`font-semibold ${sisaHariTrial <= 3 ? "text-red-700 dark:text-red-400" : "text-yellow-700 dark:text-yellow-400"}`}>
                  {sisaHariTrial <= 0 ? "Trial habis!" : `${sisaHariTrial} hari lagi`}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Berakhir {langganan.trial_selesai
                    ? new Date(langganan.trial_selesai).toLocaleDateString("id-ID", { dateStyle: "medium" })
                    : "-"}
                </p>
              </div>
            )}

            {langganan?.status === "AKTIF" && langganan.tanggal_selesai && (
              <div className="rounded-lg p-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 text-sm">
                <p className="font-semibold text-green-700 dark:text-green-400">Aktif</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  s.d. {new Date(langganan.tanggal_selesai).toLocaleDateString("id-ID", { dateStyle: "medium" })}
                </p>
              </div>
            )}

            <a href="/upgrade" className="block w-full text-center text-xs font-medium text-muted-foreground hover:text-foreground border border-border rounded-lg py-2 transition-colors">
              {langganan?.status === "TRIAL" ? "Upgrade Sekarang →" : "Kelola Langganan →"}
            </a>
          </CardContent>
        </Card>
      </div>

    </div>
  )
}
