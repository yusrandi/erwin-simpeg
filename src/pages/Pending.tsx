import { useAuth } from "@/hooks/useAuth"
import { Button } from "@/components/ui/button"
import { Clock } from "lucide-react"

export default function Pending() {
  const { pesantren, signOut } = useAuth()

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md text-center space-y-5">
        <div className="w-16 h-16 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center mx-auto">
          <Clock className="w-8 h-8 text-yellow-600" />
        </div>
        <div className="space-y-2">
          <h1 className="text-xl font-bold text-foreground">Menunggu Persetujuan</h1>
          <p className="text-sm text-muted-foreground">
            Pendaftaran <strong>{pesantren?.nama}</strong> sedang dalam proses review
            oleh superadmin platform. Anda akan bisa mengakses dashboard setelah
            pendaftaran disetujui.
          </p>
        </div>
        <div className="p-4 rounded-lg border bg-muted/30 text-left space-y-2 text-sm">
          <p className="font-medium text-foreground">Detail Pendaftaran:</p>
          <div className="space-y-1 text-muted-foreground">
            <p>Nama: <span className="text-foreground">{pesantren?.nama}</span></p>
            <p>Kode: <span className="text-foreground font-mono">{pesantren?.kode}</span></p>
            <p>Email: <span className="text-foreground">{pesantren?.email}</span></p>
          </div>
        </div>
        <Button variant="outline" className="w-full" onClick={signOut}>
          Keluar
        </Button>
      </div>
    </div>
  )
}
