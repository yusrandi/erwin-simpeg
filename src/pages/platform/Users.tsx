import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { RefreshCw } from "lucide-react"

interface UserRow {
  id: string
  nama: string
  role: string
  pesantren_nama: string | null
  unit_kerja_nama: string | null
  email: string | null
  created_at: string
}

const roleBadge: Record<string, string> = {
  SUPERADMIN_PLATFORM:  "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300",
  SUPERADMIN_PESANTREN: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  ADMIN_UNIT:           "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
}

const roleLabel: Record<string, string> = {
  SUPERADMIN_PLATFORM:  "Superadmin Platform",
  SUPERADMIN_PESANTREN: "Superadmin Pesantren",
  ADMIN_UNIT:           "Admin Unit",
}

export default function PlatformUsers() {
  const { toast } = useToast()
  const [data, setData] = useState<UserRow[]>([])
  const [loading, setLoading] = useState(true)

  async function fetchData() {
    setLoading(true)

    // Fetch profiles + join pesantren & unit_kerja
    const { data: profiles, error } = await supabase
      .from("profiles")
      .select(`
        id, nama, role, created_at,
        pesantren ( nama ),
        unit_kerja ( nama )
      `)
      .order("created_at", { ascending: false })

    if (error) {
      toast({ title: "Gagal memuat data", variant: "destructive" })
      setLoading(false)
      return
    }

    // Fetch email dari auth.users via RPC atau langsung
    // Supabase tidak expose auth.users langsung, pakai admin API
    // Untuk display, kita tampilkan data profile saja
    const rows: UserRow[] = (profiles ?? []).map((p: any) => ({
      id: p.id,
      nama: p.nama,
      role: p.role,
      pesantren_nama: p.pesantren?.nama ?? null,
      unit_kerja_nama: p.unit_kerja?.nama ?? null,
      email: null, // tidak bisa akses auth.users dari client
      created_at: p.created_at,
    }))

    setData(rows)
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [])

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Manajemen Users</h1>
          <p className="text-sm text-muted-foreground mt-1">Semua pengguna yang terdaftar di platform</p>
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
                <TableHead>Nama</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Pesantren</TableHead>
                <TableHead>Unit Kerja</TableHead>
                <TableHead>Terdaftar</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12">
                    <div className="flex items-center justify-center gap-2 text-muted-foreground">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-foreground" />
                      Memuat...
                    </div>
                  </TableCell>
                </TableRow>
              ) : data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                    Belum ada user terdaftar
                  </TableCell>
                </TableRow>
              ) : data.map(u => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium text-sm">{u.nama}</TableCell>
                  <TableCell>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${roleBadge[u.role] ?? ""}`}>
                      {roleLabel[u.role] ?? u.role}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm">{u.pesantren_nama ?? "-"}</TableCell>
                  <TableCell className="text-sm">{u.unit_kerja_nama ?? "-"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(u.created_at).toLocaleDateString("id-ID", { dateStyle: "medium" })}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
