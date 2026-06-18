import { useNavigate } from "react-router-dom"
import { supabase } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"
import { PegawaiForm } from "@/components/PegawaiForm"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { UserPlus } from "lucide-react"
import type { PegawaiFormData } from "@/types/pegawai"
import { useState } from "react"

export default function TambahPegawai() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)

  async function handleSubmit(data: PegawaiFormData) {
    setLoading(true)
    const { error } = await supabase.from("pegawai").insert([data])
    setLoading(false)
    if (error) {
      toast({ title: "Gagal menambahkan", description: error.message, variant: "destructive" })
      return
    }
    toast({ title: "Pegawai berhasil ditambahkan!", variant: "success" as never })
    navigate("/pegawai")
  }

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Tambah Pegawai</h1>
        <p className="text-sm text-muted-foreground mt-1">Isi form di bawah untuk mendaftarkan pegawai baru</p>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-base">
            <UserPlus className="w-4 h-4 text-blue-500" /> Data Pegawai Baru
          </CardTitle>
          <CardDescription>Semua field bertanda * wajib diisi</CardDescription>
        </CardHeader>
        <CardContent>
          <PegawaiForm
            onSubmit={handleSubmit}
            onCancel={() => navigate("/pegawai")}
            submitLabel="Tambah Pegawai"
            isLoading={loading}
          />
        </CardContent>
      </Card>
    </div>
  )
}
