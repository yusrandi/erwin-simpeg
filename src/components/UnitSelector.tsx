import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { useUnit } from "@/hooks/useUnit"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { Building } from "lucide-react"
import type { UnitKerja } from "@/types/auth"

interface Props {
  children: (unitKerjaId: string, pesantrenId: string) => React.ReactNode
}

export function UnitSelector({ children }: Props) {
  const { pesantren_id, unit_kerja_id, isSuperadminPesantren } = useUnit()
  const [unitList, setUnitList] = useState<UnitKerja[]>([])
  const [selectedUnit, setSelectedUnit] = useState<string>("")
  const [loadingUnits, setLoadingUnits] = useState(false)

  // Kalau admin unit — langsung pakai unit_kerja_id dari auth
  if (!isSuperadminPesantren) {
    if (!unit_kerja_id || !pesantren_id) return (
      <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">
        Unit kerja tidak ditemukan. Hubungi administrator.
      </div>
    )
    return <>{children(unit_kerja_id, pesantren_id)}</>
  }

  // Kalau superadmin pesantren — fetch daftar unit
  useEffect(() => {
    if (!pesantren_id) return
    setLoadingUnits(true)
    supabase
      .from("unit_kerja")
      .select("*")
      .eq("pesantren_id", pesantren_id)
      .eq("status", "AKTIF")
      .order("nama")
      .then(({ data }) => {
        setUnitList(data ?? [])
        // Auto pilih kalau hanya 1 unit
        if (data?.length === 1) setSelectedUnit(data[0].id)
        setLoadingUnits(false)
      })
  }, [pesantren_id])

  if (loadingUnits) return (
    <div className="flex items-center justify-center h-40">
      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-foreground" />
    </div>
  )

  // Belum pilih unit — tampilkan selector
  if (!selectedUnit) return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Pilih Unit Kerja</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Pilih unit kerja untuk menampilkan data
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {unitList.map(u => (
          <Card
            key={u.id}
            className="cursor-pointer hover:ring-2 hover:ring-foreground transition-all"
            onClick={() => setSelectedUnit(u.id)}
          >
            <CardContent className="p-5 flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                <Building className="w-5 h-5 text-foreground" />
              </div>
              <div>
                <p className="font-semibold text-sm text-foreground">{u.nama}</p>
                <p className="text-xs text-muted-foreground">{u.jenis}</p>
              </div>
            </CardContent>
          </Card>
        ))}
        {unitList.length === 0 && (
          <p className="text-sm text-muted-foreground col-span-3 text-center py-8">
            Belum ada unit kerja aktif.
          </p>
        )}
      </div>
    </div>
  )

  // Sudah pilih unit — render children + tombol ganti unit
  const activeUnit = unitList.find(u => u.id === selectedUnit)

  return (
    <div className="space-y-5">
      {/* Unit switcher */}
      <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30">
        <Building className="w-4 h-4 text-muted-foreground shrink-0" />
        <div className="flex-1 flex items-center gap-3">
          <span className="text-sm text-muted-foreground">Unit aktif:</span>
          <Select value={selectedUnit} onValueChange={setSelectedUnit}>
            <SelectTrigger className="w-56 h-8 text-sm border-0 bg-transparent p-0 font-medium">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {unitList.map(u => (
                <SelectItem key={u.id} value={u.id}>
                  {u.nama} <span className="text-muted-foreground text-xs ml-1">({u.jenis})</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
          {activeUnit?.jenis}
        </span>
      </div>

      {/* Content */}
      {children(selectedUnit, pesantren_id!)}
    </div>
  )
}
