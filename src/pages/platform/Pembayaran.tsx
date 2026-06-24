import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/hooks/useAuth"
import { useToast } from "@/hooks/use-toast"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { CheckCircle, XCircle, Eye, RefreshCw } from "lucide-react"
import type { PembayaranLangganan } from "@/types/langganan"

function formatRp(n: number) {
  return n.toLocaleString("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 })
}

const statusBadge: Record<string, string> = {
  MENUNGGU:     "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300",
  DIVERIFIKASI: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  DITOLAK:      "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
}

export default function PlatformPembayaran() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [data, setData] = useState<PembayaranLangganan[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [viewTarget, setViewTarget] = useState<PembayaranLangganan | null>(null)
  const [catatanTolak, setCatatanTolak] = useState("")
  const [openTolak, setOpenTolak] = useState(false)

  async function fetchData() {
    setLoading(true)
    const { data: rows } = await supabase
      .from("pembayaran_langganan")
      .select("*, paket_langganan(nama, harga), pesantren(nama, kode)")
      .order("created_at", { ascending: false })
    setData(rows ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [])

  async function handleVerifikasi(p: PembayaranLangganan) {
    if (!user?.id) return
    setSaving(true)
    try {
      // 1. Update status pembayaran
      await supabase.from("pembayaran_langganan").update({
        status: "DIVERIFIKASI",
        verified_by: user.id,
        verified_at: new Date().toISOString(),
      }).eq("id", p.id)

      // 2. Hitung tanggal selesai langganan
      const mulai = new Date()
      const selesai = new Date(mulai)
      selesai.setMonth(selesai.getMonth() + p.periode_bulan)

      // 3. Cek apakah sudah ada langganan aktif
      const { data: existing } = await supabase
        .from("langganan")
        .select("id, tanggal_selesai")
        .eq("pesantren_id", p.pesantren_id)
        .eq("status", "AKTIF")
        .single()

      if (existing) {
        // Perpanjang dari tanggal selesai yang sudah ada
        const tglSelesaiExisting = new Date(existing.tanggal_selesai!)
        const tglSelesaiBaru = new Date(tglSelesaiExisting)
        tglSelesaiBaru.setMonth(tglSelesaiBaru.getMonth() + p.periode_bulan)

        await supabase.from("langganan").update({
          paket_id: p.paket_id,
          tanggal_selesai: tglSelesaiBaru.toISOString().slice(0, 10),
        }).eq("id", existing.id)
      } else {
        // Buat langganan baru
        const { data: newLangganan } = await supabase.from("langganan").insert({
          pesantren_id: p.pesantren_id,
          paket_id: p.paket_id,
          status: "AKTIF",
          tanggal_mulai: mulai.toISOString().slice(0, 10),
          tanggal_selesai: selesai.toISOString().slice(0, 10),
        }).select().single()

        // Update pembayaran dengan langganan_id
        if (newLangganan) {
          await supabase.from("pembayaran_langganan")
            .update({ langganan_id: newLangganan.id }).eq("id", p.id)
        }
      }

      toast({ title: "Pembayaran diverifikasi & langganan diaktifkan" })
      setViewTarget(null)
      fetchData()
    } catch (err: any) {
      toast({ title: "Gagal verifikasi", description: err.message, variant: "destructive" })
    }
    setSaving(false)
  }

  async function handleTolak() {
    if (!viewTarget || !user?.id) return
    setSaving(true)
    await supabase.from("pembayaran_langganan").update({
      status: "DITOLAK",
      verified_by: user.id,
      verified_at: new Date().toISOString(),
      catatan_verifikasi: catatanTolak || null,
    }).eq("id", viewTarget.id)
    setSaving(false)
    toast({ title: "Pembayaran ditolak" })
    setOpenTolak(false)
    setViewTarget(null)
    setCatatanTolak("")
    fetchData()
  }

  const pending = data.filter(d => d.status === "MENUNGGU").length

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Verifikasi Pembayaran</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {pending > 0
              ? <span className="text-yellow-600 font-medium">{pending} pembayaran menunggu verifikasi</span>
              : "Semua pembayaran sudah diverifikasi"}
          </p>
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
                <TableHead>Pesantren</TableHead>
                <TableHead>Paket</TableHead>
                <TableHead>Durasi</TableHead>
                <TableHead className="text-right">Jumlah</TableHead>
                <TableHead>Bank</TableHead>
                <TableHead>Pengirim</TableHead>
                <TableHead>Tanggal</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={9} className="text-center py-12">
                  <div className="flex items-center justify-center gap-2 text-muted-foreground">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-foreground" /> Memuat...
                  </div>
                </TableCell></TableRow>
              ) : data.length === 0 ? (
                <TableRow><TableCell colSpan={9} className="text-center py-12 text-muted-foreground">
                  Belum ada pembayaran
                </TableCell></TableRow>
              ) : data.map(p => (
                <TableRow key={p.id}>
                  <TableCell className="text-sm">
                    <p className="font-medium">{(p as any).pesantren?.nama}</p>
                    <p className="text-xs font-mono text-muted-foreground">{(p as any).pesantren?.kode}</p>
                  </TableCell>
                  <TableCell className="text-sm">{(p as any).paket_langganan?.nama}</TableCell>
                  <TableCell className="text-sm">{p.periode_bulan} bulan</TableCell>
                  <TableCell className="text-right text-sm font-semibold">{formatRp(p.jumlah)}</TableCell>
                  <TableCell className="text-sm">{p.bank_tujuan}</TableCell>
                  <TableCell className="text-sm">{p.nama_pengirim}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(p.created_at!).toLocaleDateString("id-ID", { dateStyle: "medium" })}
                  </TableCell>
                  <TableCell>
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${statusBadge[p.status]}`}>
                      {p.status === "MENUNGGU" ? "Menunggu" :
                       p.status === "DIVERIFIKASI" ? "Terverifikasi" : "Ditolak"}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-1 justify-end">
                      <Button size="icon" variant="ghost" className="h-7 w-7"
                        onClick={() => setViewTarget(p)}>
                        <Eye className="w-3.5 h-3.5" />
                      </Button>
                      {p.status === "MENUNGGU" && (
                        <>
                          <Button size="icon" variant="ghost" className="h-7 w-7"
                            onClick={() => handleVerifikasi(p)} disabled={saving}>
                            <CheckCircle className="w-3.5 h-3.5 text-green-600" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7"
                            onClick={() => { setViewTarget(p); setOpenTolak(true) }} disabled={saving}>
                            <XCircle className="w-3.5 h-3.5 text-destructive" />
                          </Button>
                        </>
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
      <Dialog open={!!viewTarget && !openTolak} onOpenChange={open => !open && setViewTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Detail Pembayaran</DialogTitle>
            <DialogDescription>{(viewTarget as any)?.pesantren?.nama}</DialogDescription>
          </DialogHeader>
          {viewTarget && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                {[
                  { label: "Paket", value: (viewTarget as any).paket_langganan?.nama },
                  { label: "Durasi", value: `${viewTarget.periode_bulan} bulan` },
                  { label: "Jumlah", value: formatRp(viewTarget.jumlah) },
                  { label: "Bank", value: viewTarget.bank_tujuan },
                  { label: "Pengirim", value: viewTarget.nama_pengirim },
                  { label: "Tanggal", value: new Date(viewTarget.created_at!).toLocaleDateString("id-ID", { dateStyle: "long" }) },
                  { label: "Status", value: viewTarget.status },
                  { label: "Catatan", value: viewTarget.catatan ?? "-" },
                ].map(item => (
                  <div key={item.label}>
                    <p className="text-xs text-muted-foreground">{item.label}</p>
                    <p className="font-medium mt-0.5">{item.value}</p>
                  </div>
                ))}
              </div>

              {viewTarget.bukti_transfer && (
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Bukti Transfer</p>
                  <a
                    href={viewTarget.bukti_transfer}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm text-blue-600 underline"
                  >
                    Lihat Bukti Transfer
                  </a>
                </div>
              )}

              {viewTarget.status === "MENUNGGU" && (
                <div className="flex gap-3 pt-2 border-t">
                  <Button className="flex-1" onClick={() => handleVerifikasi(viewTarget)} disabled={saving}>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    {saving ? "Memproses..." : "Verifikasi & Aktifkan"}
                  </Button>
                  <Button variant="destructive" onClick={() => setOpenTolak(true)} disabled={saving}>
                    <XCircle className="w-4 h-4 mr-2" /> Tolak
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Tolak Dialog */}
      <Dialog open={openTolak} onOpenChange={open => { if (!open) { setOpenTolak(false); setCatatanTolak("") } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Tolak Pembayaran</DialogTitle>
            <DialogDescription>
              Pembayaran dari {(viewTarget as any)?.pesantren?.nama} akan ditolak.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Alasan Penolakan</Label>
              <Input
                value={catatanTolak}
                onChange={e => setCatatanTolak(e.target.value)}
                placeholder="Bukti tidak jelas, nominal tidak sesuai, dll"
              />
            </div>
            <div className="flex gap-3">
              <Button variant="destructive" className="flex-1" onClick={handleTolak} disabled={saving}>
                {saving ? "Memproses..." : "Ya, Tolak"}
              </Button>
              <Button variant="outline" onClick={() => { setOpenTolak(false); setCatatanTolak("") }}>
                Batal
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
