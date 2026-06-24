import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { RefreshCw, CheckCircle, XCircle, Eye } from "lucide-react"
import type { Pesantren } from "@/types/auth"

// const statusBadge: Record<string, string> = {
//   PENDING:   "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300",
//   AKTIF:     "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
//   NONAKTIF:  "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
// }

export default function PlatformPesantren() {
  const { toast } = useToast()
  const [data, setData] = useState<Pesantren[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [viewTarget, setViewTarget] = useState<Pesantren | null>(null)

  async function fetchData() {
    setLoading(true)
    const { data: rows } = await supabase
        .from("pesantren")
        .select(`
            *,
            langganan (
            status, tanggal_selesai, trial_selesai,
            paket_langganan ( nama )
            )
        `)
        .order("created_at", { ascending: false })
    setData(rows ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [])

async function updateStatus(id: string, status: "AKTIF" | "NONAKTIF") {
  setSaving(true)
  const { error } = await supabase.from("pesantren").update({ status }).eq("id", id)

  // Jika disetujui, buat trial otomatis
  if (status === "AKTIF" && !error) {
    await supabase.rpc("create_trial_langganan", { p_pesantren_id: id })
  }

  setSaving(false)
  if (error) { toast({ title: "Gagal update status", variant: "destructive" }); return }
  toast({ title: `Pesantren ${status === "AKTIF" ? "disetujui & trial dimulai" : "dinonaktifkan"}` })
  setViewTarget(null)
  fetchData()
}

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Manajemen Pesantren</h1>
          <p className="text-sm text-muted-foreground mt-1">Approve atau tolak pendaftaran pesantren</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Nama Pesantren</TableHead>
                <TableHead>Kode</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Telepon</TableHead>
                <TableHead>Langganan</TableHead>
                <TableHead>Terdaftar</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12">
                    <div className="flex items-center justify-center gap-2 text-muted-foreground">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-foreground" /> Memuat...
                    </div>
                  </TableCell>
                </TableRow>
              ) : data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                    Belum ada pesantren terdaftar
                  </TableCell>
                </TableRow>
              ) : data.map(p => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium text-sm">{p.nama}</TableCell>
                  <TableCell className="font-mono text-sm">{p.kode}</TableCell>
                  <TableCell className="text-sm">{p.email}</TableCell>
                  <TableCell className="text-sm">{p.telepon ?? "-"}</TableCell>
                  <TableCell>
                        {(() => {
                            const l = (p as any).langganan?.[0]
                            if (!l) return <span className="text-xs text-muted-foreground">-</span>
                            const expired = l.status === "TRIAL" && new Date(l.trial_selesai) < new Date()
                            return (
                            <div>
                                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                                expired ? "bg-red-100 text-red-800" :
                                l.status === "AKTIF" ? "bg-green-100 text-green-800" :
                                "bg-yellow-100 text-yellow-800"
                                }`}>
                                {expired ? "Trial Expired" : l.status === "TRIAL" ? "Trial" : l.paket_langganan?.nama ?? l.status}
                                </span>
                                {l.tanggal_selesai && (
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    s.d. {new Date(l.tanggal_selesai).toLocaleDateString("id-ID", { dateStyle: "medium" })}
                                </p>
                                )}
                            </div>
                            )
                        })()}
                </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(p.created_at).toLocaleDateString("id-ID", { dateStyle: "medium" })}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-1 justify-end">
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setViewTarget(p)}>
                        <Eye className="w-3.5 h-3.5" />
                      </Button>
                      {p.status === "PENDING" && (
                        <>
                          <Button size="icon" variant="ghost" className="h-7 w-7"
                            onClick={() => updateStatus(p.id, "AKTIF")} disabled={saving}>
                            <CheckCircle className="w-3.5 h-3.5 text-green-600" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7"
                            onClick={() => updateStatus(p.id, "NONAKTIF")} disabled={saving}>
                            <XCircle className="w-3.5 h-3.5 text-destructive" />
                          </Button>
                        </>
                      )}
                      {p.status === "AKTIF" && (
                        <Button size="icon" variant="ghost" className="h-7 w-7"
                          onClick={() => updateStatus(p.id, "NONAKTIF")} disabled={saving}>
                          <XCircle className="w-3.5 h-3.5 text-destructive" />
                        </Button>
                      )}
                      {p.status === "NONAKTIF" && (
                        <Button size="icon" variant="ghost" className="h-7 w-7"
                          onClick={() => updateStatus(p.id, "AKTIF")} disabled={saving}>
                          <CheckCircle className="w-3.5 h-3.5 text-green-600" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={!!viewTarget} onOpenChange={open => !open && setViewTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{viewTarget?.nama}</DialogTitle>
            <DialogDescription>Kode: {viewTarget?.kode}</DialogDescription>
          </DialogHeader>
          {viewTarget && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                {[
                  { label: "Email", value: viewTarget.email },
                  { label: "Telepon", value: viewTarget.telepon ?? "-" },
                  { label: "Alamat", value: viewTarget.alamat ?? "-" },
                  { label: "Status", value: viewTarget.status },
                  { label: "Terdaftar", value: new Date(viewTarget.created_at).toLocaleDateString("id-ID", { dateStyle: "long" }) },
                ].map(item => (
                  <div key={item.label}>
                    <p className="text-muted-foreground text-xs">{item.label}</p>
                    <p className="font-medium mt-0.5">{item.value}</p>
                  </div>
                ))}
              </div>

              {viewTarget.status === "PENDING" && (
                <div className="flex gap-3 pt-2 border-t">
                  <Button className="flex-1" onClick={() => updateStatus(viewTarget.id, "AKTIF")} disabled={saving}>
                    <CheckCircle className="w-4 h-4 mr-2" /> Setujui
                  </Button>
                  <Button variant="destructive" onClick={() => updateStatus(viewTarget.id, "NONAKTIF")} disabled={saving}>
                    <XCircle className="w-4 h-4 mr-2" /> Tolak
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
