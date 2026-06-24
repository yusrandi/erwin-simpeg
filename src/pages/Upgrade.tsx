import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/hooks/useAuth"
import { useLangganan } from "@/hooks/useLangganan"
import { useToast } from "@/hooks/use-toast"
import { CheckCircle, Clock, Upload, AlertCircle } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import type { PaketLangganan, PembayaranLangganan } from "@/types/langganan"

function formatRp(n: number) {
  return n.toLocaleString("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 })
}

const INFO_BANK = [
  { bank: "BRI", no: "1234-5678-9012-3456", atas: "PT Simpeg Indonesia" },
  { bank: "BCA", no: "1234567890", atas: "PT Simpeg Indonesia" },
  { bank: "Mandiri", no: "1234-5678-9012", atas: "PT Simpeg Indonesia" },
]

export default function Upgrade() {
  const { pesantren, signOut } = useAuth()
  const { langganan, isTrialExpired, sisaHariTrial, refetch } = useLangganan()
  const { toast } = useToast()

  const [paketList, setPaketList] = useState<PaketLangganan[]>([])
  const [riwayat, setRiwayat] = useState<PembayaranLangganan[]>([])
  const [selectedPaket, setSelectedPaket] = useState<PaketLangganan | null>(null)
  const [openForm, setOpenForm] = useState(false)
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    periode_bulan: 1,
    bank_tujuan: "",
    nama_pengirim: "",
    catatan: "",
    bukti_file: null as File | null,
  })

  useEffect(() => {
    // Fetch paket berbayar
    supabase.from("paket_langganan")
      .select("*").eq("aktif", true)
      .neq("kode", "TRIAL").order("urutan")
      .then(({ data }) => setPaketList(data ?? []))

    // Fetch riwayat pembayaran
    if (pesantren?.id) {
      supabase.from("pembayaran_langganan")
        .select("*, paket_langganan(nama, harga)")
        .eq("pesantren_id", pesantren.id)
        .order("created_at", { ascending: false })
        .then(({ data }) => setRiwayat(data ?? []))
    }
  }, [pesantren?.id])

  const totalBayar = selectedPaket
    ? selectedPaket.harga * form.periode_bulan
    : 0

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedPaket || !pesantren?.id) return
    if (!form.nama_pengirim || !form.bank_tujuan) {
      toast({ title: "Lengkapi data pembayaran", variant: "destructive" }); return
    }

    setSaving(true)
    try {
      // Upload bukti transfer ke Supabase Storage (opsional)
      let buktiUrl = null
      if (form.bukti_file) {
        const ext = form.bukti_file.name.split(".").pop()
        const path = `bukti/${pesantren.id}/${Date.now()}.${ext}`
        const { error: uploadError } = await supabase.storage
          .from("pembayaran")
          .upload(path, form.bukti_file)
        if (!uploadError) {
          const { data: urlData } = supabase.storage.from("pembayaran").getPublicUrl(path)
          buktiUrl = urlData.publicUrl
        }
      }

      // Insert pembayaran
      const { error } = await supabase.from("pembayaran_langganan").insert({
        pesantren_id: pesantren.id,
        paket_id: selectedPaket.id,
        jumlah: totalBayar,
        periode_bulan: form.periode_bulan,
        bank_tujuan: form.bank_tujuan,
        nama_pengirim: form.nama_pengirim,
        catatan: form.catatan || null,
        bukti_transfer: buktiUrl,
        status: "MENUNGGU",
      })
      if (error) throw error

      toast({ title: "Pembayaran berhasil dikirim!", description: "Menunggu verifikasi dari admin platform." })
      setOpenForm(false)
      setSelectedPaket(null)
      setForm({ periode_bulan: 1, bank_tujuan: "", nama_pengirim: "", catatan: "", bukti_file: null })

      // Refresh riwayat
      const { data: newRiwayat } = await supabase.from("pembayaran_langganan")
        .select("*, paket_langganan(nama, harga)")
        .eq("pesantren_id", pesantren.id)
        .order("created_at", { ascending: false })
      setRiwayat(newRiwayat ?? [])
      refetch()
    } catch (err: any) {
      toast({ title: "Gagal mengirim pembayaran", description: err.message, variant: "destructive" })
    }
    setSaving(false)
  }

  const statusBadge: Record<string, { label: string; color: string }> = {
    MENUNGGU:     { label: "Menunggu Verifikasi", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300" },
    DIVERIFIKASI: { label: "Terverifikasi", color: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300" },
    DITOLAK:      { label: "Ditolak", color: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300" },
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-background sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-foreground rounded-lg flex items-center justify-center">
              <span className="text-background font-bold text-sm">S</span>
            </div>
            <span className="font-bold text-foreground">SIMPEG</span>
          </div>
          <button
            onClick={signOut}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Keluar
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-10 space-y-10">
        {/* Status langganan saat ini */}
        <div className={`rounded-2xl p-6 border-2 ${
          isTrialExpired
            ? "border-destructive/30 bg-destructive/5"
            : "border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20 dark:border-yellow-900"
        }`}>
          <div className="flex items-start gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
              isTrialExpired ? "bg-destructive/10" : "bg-yellow-100 dark:bg-yellow-900/30"
            }`}>
              {isTrialExpired
                ? <AlertCircle className="w-6 h-6 text-destructive" />
                : <Clock className="w-6 h-6 text-yellow-600" />}
            </div>
            <div>
              <h2 className={`font-bold text-lg ${isTrialExpired ? "text-destructive" : "text-foreground"}`}>
                {isTrialExpired ? "Trial Anda Telah Berakhir" : `Trial Aktif — Sisa ${sisaHariTrial} Hari`}
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                {isTrialExpired
                  ? `Masa trial ${pesantren?.nama} telah habis. Pilih paket di bawah untuk melanjutkan akses.`
                  : `Nikmati semua fitur SIMPEG selama masa trial. Pilih paket sebelum trial habis agar tidak terputus.`}
              </p>
              {!isTrialExpired && langganan?.trial_selesai && (
                <p className="text-xs text-muted-foreground mt-2">
                  Trial berakhir: <strong>{new Date(langganan.trial_selesai).toLocaleDateString("id-ID", { dateStyle: "long" })}</strong>
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Pilih paket */}
        <div>
          <h2 className="text-2xl font-bold text-foreground mb-2">Pilih Paket</h2>
          <p className="text-sm text-muted-foreground mb-6">
            Semua paket sudah termasuk seluruh fitur SIMPEG. Perbedaan hanya pada jumlah unit kerja.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {paketList.map(p => (
              <div
                key={p.id}
                onClick={() => { setSelectedPaket(p); setOpenForm(true) }}
                className={`rounded-2xl p-5 border-2 cursor-pointer transition-all hover:shadow-md ${
                  p.kode === "PRO"
                    ? "border-foreground bg-foreground text-background"
                    : "border-border bg-card hover:border-foreground"
                }`}
              >
                {p.kode === "PRO" && (
                  <div className="inline-flex bg-background text-foreground text-xs font-bold px-2.5 py-1 rounded-full mb-3">
                    Populer
                  </div>
                )}
                <p className={`text-xs font-semibold mb-1 ${p.kode === "PRO" ? "text-background/60" : "text-muted-foreground"}`}>
                  {p.nama}
                </p>
                <p className={`text-2xl font-bold ${p.kode === "PRO" ? "text-background" : "text-foreground"}`}>
                  {p.harga === 0 ? "Custom" : formatRp(p.harga)}
                </p>
                {p.harga > 0 && (
                  <p className={`text-xs mb-4 ${p.kode === "PRO" ? "text-background/60" : "text-muted-foreground"}`}>
                    per bulan
                  </p>
                )}
                <div className={`text-sm mt-3 flex items-center gap-2 ${p.kode === "PRO" ? "text-background" : "text-foreground"}`}>
                  <CheckCircle className="w-4 h-4 shrink-0" />
                  {p.max_unit === -1 ? "Unlimited unit kerja" : `Max ${p.max_unit} unit kerja`}
                </div>
                <div className={`text-sm mt-2 flex items-center gap-2 ${p.kode === "PRO" ? "text-background" : "text-foreground"}`}>
                  <CheckCircle className="w-4 h-4 shrink-0" />
                  Semua fitur SIMPEG
                </div>
                <button className={`w-full mt-4 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                  p.kode === "PRO"
                    ? "bg-background text-foreground hover:bg-background/90"
                    : "bg-foreground text-background hover:bg-foreground/90"
                }`}>
                  {p.kode === "ENTERPRISE" ? "Hubungi Kami" : "Pilih Paket"}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Riwayat pembayaran */}
        {riwayat.length > 0 && (
          <div>
            <h2 className="text-lg font-bold text-foreground mb-4">Riwayat Pembayaran</h2>
            <div className="space-y-3">
              {riwayat.map(r => (
                <div key={r.id} className="flex items-center justify-between p-4 rounded-xl border bg-card">
                  <div>
                    <p className="font-medium text-sm text-foreground">
                      {(r as any).paket_langganan?.nama} — {r.periode_bulan} bulan
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {new Date(r.created_at!).toLocaleDateString("id-ID", { dateStyle: "medium" })} ·
                      a.n. {r.nama_pengirim} via {r.bank_tujuan}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-sm text-foreground">
                      {formatRp(r.jumlah)}
                    </span>
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${statusBadge[r.status]?.color}`}>
                      {statusBadge[r.status]?.label}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Info rekening */}
        <Card>
          <CardContent className="p-6 space-y-4">
            <h3 className="font-bold text-foreground">Rekening Pembayaran</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {INFO_BANK.map(b => (
                <div key={b.bank} className="p-4 rounded-xl bg-muted/40 border">
                  <p className="font-bold text-sm text-foreground">{b.bank}</p>
                  <p className="font-mono text-sm text-foreground mt-1">{b.no}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">a.n. {b.atas}</p>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Transfer sesuai nominal paket yang dipilih, lalu upload bukti transfer melalui form pembayaran.
              Verifikasi dilakukan dalam 1x24 jam hari kerja.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ── Form Pembayaran Dialog ── */}
      <Dialog open={openForm} onOpenChange={open => { if (!open) { setOpenForm(false); setSelectedPaket(null) } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Pembayaran Paket {selectedPaket?.nama}</DialogTitle>
            <DialogDescription>
              Upload bukti transfer setelah melakukan pembayaran
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Pilih durasi */}
            <div className="space-y-2">
              <Label>Durasi Langganan *</Label>
              <div className="grid grid-cols-3 gap-2">
                {[1, 3, 6, 12].map(bln => (
                  <button
                    key={bln}
                    type="button"
                    onClick={() => setForm(p => ({ ...p, periode_bulan: bln }))}
                    className={`py-2.5 rounded-lg border text-sm font-medium transition-all ${
                      form.periode_bulan === bln
                        ? "border-foreground bg-foreground text-background"
                        : "border-border text-foreground hover:border-foreground"
                    }`}
                  >
                    {bln} Bulan
                    {bln >= 6 && (
                      <span className="block text-xs opacity-70">
                        {bln === 6 ? "Hemat 5%" : "Hemat 10%"}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Total */}
            <div className="rounded-lg border p-4 bg-muted/30">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{selectedPaket?.nama} × {form.periode_bulan} bulan</span>
                <span className="font-bold text-foreground">{formatRp(totalBayar)}</span>
              </div>
            </div>

            {/* Info bank tujuan */}
            <div className="space-y-2">
              <Label>Transfer ke Bank *</Label>
              <div className="grid grid-cols-3 gap-2">
                {INFO_BANK.map(b => (
                  <button
                    key={b.bank}
                    type="button"
                    onClick={() => setForm(p => ({ ...p, bank_tujuan: b.bank }))}
                    className={`py-2.5 rounded-lg border text-sm font-medium transition-all ${
                      form.bank_tujuan === b.bank
                        ? "border-foreground bg-foreground text-background"
                        : "border-border text-foreground hover:border-foreground"
                    }`}
                  >
                    {b.bank}
                  </button>
                ))}
              </div>
              {form.bank_tujuan && (
                <div className="p-3 rounded-lg bg-muted/40 text-xs">
                  <p className="font-mono font-bold text-foreground">
                    {INFO_BANK.find(b => b.bank === form.bank_tujuan)?.no}
                  </p>
                  <p className="text-muted-foreground mt-0.5">
                    a.n. {INFO_BANK.find(b => b.bank === form.bank_tujuan)?.atas}
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Nama Pengirim *</Label>
              <Input
                value={form.nama_pengirim}
                onChange={e => setForm(p => ({ ...p, nama_pengirim: e.target.value }))}
                placeholder="Sesuai nama di rekening"
                required
              />
            </div>

            {/* Upload bukti */}
            <div className="space-y-2">
              <Label>Bukti Transfer</Label>
              <div className="relative">
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={e => setForm(p => ({ ...p, bukti_file: e.target.files?.[0] ?? null }))}
                  className="hidden"
                  id="bukti-upload"
                />
                <label
                  htmlFor="bukti-upload"
                  className={`flex items-center gap-3 w-full border-2 border-dashed rounded-lg px-4 py-3 cursor-pointer transition-colors ${
                    form.bukti_file
                      ? "border-green-400 bg-green-50 dark:bg-green-950/20"
                      : "border-border hover:border-foreground"
                  }`}
                >
                  <Upload className={`w-4 h-4 shrink-0 ${form.bukti_file ? "text-green-600" : "text-muted-foreground"}`} />
                  <span className={`text-sm ${form.bukti_file ? "text-green-700 dark:text-green-400" : "text-muted-foreground"}`}>
                    {form.bukti_file ? form.bukti_file.name : "Klik untuk upload bukti transfer (jpg, png, pdf)"}
                  </span>
                </label>
              </div>
              <p className="text-xs text-muted-foreground">Bisa dikirim belakangan jika belum ada</p>
            </div>

            <div className="space-y-2">
              <Label>Catatan</Label>
              <Input
                value={form.catatan}
                onChange={e => setForm(p => ({ ...p, catatan: e.target.value }))}
                placeholder="Opsional"
              />
            </div>

            <div className="flex gap-3 pt-1">
              <Button type="submit" disabled={saving} className="flex-1">
                {saving ? "Mengirim..." : "Kirim Pembayaran"}
              </Button>
              <Button type="button" variant="outline"
                onClick={() => { setOpenForm(false); setSelectedPaket(null) }}>
                Batal
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
