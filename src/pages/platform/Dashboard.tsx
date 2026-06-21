import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Card, CardContent } from "@/components/ui/card"
import { Building2, CheckCircle, Clock, XCircle } from "lucide-react"

export default function PlatformDashboard() {
  const [stats, setStats] = useState({ total: 0, aktif: 0, pending: 0, nonaktif: 0 })

  useEffect(() => {
    supabase.from("pesantren").select("status").then(({ data }) => {
      if (!data) return
      setStats({
        total: data.length,
        aktif: data.filter(d => d.status === "AKTIF").length,
        pending: data.filter(d => d.status === "PENDING").length,
        nonaktif: data.filter(d => d.status === "NONAKTIF").length,
      })
    })
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Platform Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Overview seluruh pesantren terdaftar</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Pesantren", value: stats.total, icon: Building2 },
          { label: "Aktif", value: stats.aktif, icon: CheckCircle },
          { label: "Menunggu Approve", value: stats.pending, icon: Clock },
          { label: "Non Aktif", value: stats.nonaktif, icon: XCircle },
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
