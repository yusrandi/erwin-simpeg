import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Card, CardContent } from "@/components/ui/card"
import { Building2, CheckCircle, Clock, XCircle, Loader2 } from "lucide-react"

export default function PlatformDashboard() {
  const [stats, setStats] = useState({ total: 0, aktif: 0, trial: 0, trialExpired: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true)
      setError(null)

      try {
        const { data, error: supabaseError } = await supabase
          .from("pesantren")
          .select(`
            status,
            langganan ( status, trial_selesai )
          `)

        if (supabaseError) throw supabaseError
        if (!data) {
          setStats({ total: 0, aktif: 0, trial: 0, trialExpired: 0 })
          return
        }

        const now = new Date()
        setStats({
          total: data.length,
          aktif: data.filter(d => (d as any).langganan?.[0]?.status === "AKTIF").length,
          trial: data.filter(d => {
            const l = (d as any).langganan?.[0]
            return l?.status === "TRIAL" && new Date(l.trial_selesai) >= now
          }).length,
          trialExpired: data.filter(d => {
            const l = (d as any).langganan?.[0]
            return l?.status === "TRIAL" && new Date(l.trial_selesai) < now
          }).length,
        })
      } catch (err: any) {
        console.error("Gagal mengambil data dashboard:", err)
        setError(err.message || "Terjadi kesalahan saat mengambil data")
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [])

  // Tampilkan loading
  if (loading) {
    return (
      <div className="flex items-center justify-center h-60">
        <Loader2 className="w-10 h-10 animate-spin text-muted-foreground" />
      </div>
    )
  }

  // Tampilkan error
  if (error) {
    return (
      <div className="text-center text-destructive py-10">
        <p className="text-lg font-semibold">Gagal memuat data</p>
        <p className="text-sm">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-md"
        >
          Coba lagi
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Platform Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Overview seluruh pesantren terdaftar</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Pesantren", value: stats.total, icon: Building2 },
          { label: "Langganan Aktif", value: stats.aktif, icon: CheckCircle },
          { label: "Masa Trial", value: stats.trial, icon: Clock },
          { label: "Trial Expired", value: stats.trialExpired, icon: XCircle },
        ].map(item => (
          <Card key={item.label}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{item.label}</p>
                  <p className="text-3xl font-bold text-foreground mt-1">{item.value}</p>
                </div>
                <div className="w-10 h-10 rounded-md border flex items-center justify-center bg-muted">
                  <item.icon className="w-5 h-5 text-foreground" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
