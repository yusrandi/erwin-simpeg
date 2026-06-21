import { useNavigate } from "react-router-dom"
import { supabase } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"
import { PegawaiForm } from "@/components/PegawaiForm"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { UserPlus } from "lucide-react"
import type { PegawaiFormData } from "@/types/pegawai"
import { useState } from "react"
import { useUnit } from "@/hooks/useUnit"

export default function TambahPegawai() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)

  const { pesantren_id } = useUnit()

  async function handleSubmit(data: PegawaiFormData) {
    setLoading(true)
    const { error } = await supabase.from("pegawai").insert([{
        ...data,
        pesantren_id,
        unit_kerja_id: data.unit_kerja_id,
    }])
    setLoading(false)
    if (error) {
        console.log({error});

        toast({ title: "Gagal menambahkan", description: error.message, variant: "destructive" })
        return
    }
    toast({ title: "Pegawai berhasil ditambahkan!" })
    navigate("/pegawai")
}

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-foreground">
            Tambah Pegawai
        </h1>

        <p className="text-sm text-muted-foreground">
            Isi form di bawah untuk mendaftarkan pegawai baru
        </p>
    </div>

      <Card className="border bg-card">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-base">
            <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center">
  <UserPlus className="w-4 h-4" />
</div> Data Pegawai Baru
          </CardTitle>
          <CardDescription>Semua field bertanda * wajib diisi</CardDescription>
        </CardHeader>
       <CardContent className={loading ? "opacity-60 pointer-events-none" : ""}>
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
