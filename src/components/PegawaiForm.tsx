import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { useUnit } from "@/hooks/useUnit"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { PegawaiFormData } from "@/types/pegawai"
import type { UnitKerja } from "@/types/auth"

interface PegawaiFormProps {
  initialData?: Partial<PegawaiFormData>
  onSubmit: (data: PegawaiFormData) => Promise<void>
  onCancel?: () => void
  submitLabel?: string
  isLoading?: boolean
}

const defaultForm = (unit_kerja_id = ""): PegawaiFormData => ({
  nama_pegawai: "",
  id_nip: "",
  pendidikan_terakhir: "",
  jenis_kelamin: "LAKI-LAKI",
  unit_kerja_id,
  jabatan: "",
  tahun_masuk: new Date().getFullYear(),
  tahun_keluar: null,
  status_pegawai: "TETAP",
  menikah: "BELUM MENIKAH",
  aktif: "AKTIF",
  masa_aktif: "",
  jalur_masuk: "REKRUTMEN",
  email: "",
  hp: "",
  catatan: null,
})

export function PegawaiForm({ initialData, onSubmit, onCancel, submitLabel = "Simpan", isLoading }: PegawaiFormProps) {
  const { pesantren_id, unit_kerja_id, isSuperadminPesantren } = useUnit()
  const [form, setForm] = useState<PegawaiFormData>({
    ...defaultForm(unit_kerja_id ?? ""),
    ...initialData,
  })
  const [unitList, setUnitList] = useState<UnitKerja[]>([])

  // Fetch unit kerja — kalau superadmin pesantren tampilkan semua unit
  // kalau admin unit langsung pakai unit_kerja_id miliknya
  useEffect(() => {
    if (!isSuperadminPesantren) {
      // Admin unit tidak perlu pilih, sudah fix ke unitnya
      return
    }
    supabase
      .from("unit_kerja")
      .select("*")
      .eq("pesantren_id", pesantren_id!)
      .eq("status", "AKTIF")
      .order("nama")
      .then(({ data }) => setUnitList(data ?? []))
  }, [pesantren_id, isSuperadminPesantren])

  const set = (key: keyof PegawaiFormData, value: unknown) =>
    setForm(prev => ({ ...prev, [key]: value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    // Kalau admin unit, pastikan unit_kerja_id terisi dari auth
    const submitData = isSuperadminPesantren
      ? form
      : { ...form, unit_kerja_id: unit_kerja_id! }
    await onSubmit(submitData)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Row 1 */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Nama Pegawai *</Label>
          <Input value={form.nama_pegawai}
            onChange={e => set("nama_pegawai", e.target.value)}
            placeholder="Nama lengkap" required />
        </div>
        <div className="space-y-2">
          <Label>ID / NIP *</Label>
          <Input value={form.id_nip}
            onChange={e => set("id_nip", e.target.value)}
            placeholder="101715" required />
        </div>
      </div>

      {/* Row 2 */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Pendidikan Terakhir *</Label>
          <Input value={form.pendidikan_terakhir}
            onChange={e => set("pendidikan_terakhir", e.target.value)}
            placeholder="S1 Pendidikan" required />
        </div>
        <div className="space-y-2">
          <Label>Jenis Kelamin *</Label>
          <Select value={form.jenis_kelamin} onValueChange={v => set("jenis_kelamin", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="LAKI-LAKI">Laki-laki</SelectItem>
              <SelectItem value="PEREMPUAN">Perempuan</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Row 3 — Unit Kerja */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          {isSuperadminPesantren ? (
            <>
              <Label>Unit Kerja *</Label>
              <Select value={form.unit_kerja_id} onValueChange={v => set("unit_kerja_id", v)} required>
                <SelectTrigger><SelectValue placeholder="-- Pilih unit --" /></SelectTrigger>
                <SelectContent>
                  {unitList.map(u => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.nama} <span className="text-muted-foreground text-xs ml-1">({u.jenis})</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </>
          ) : (
            <>
              <Label>Unit Kerja</Label>
              <Input value="Unit Anda" disabled className="bg-muted" />
            </>
          )}
        </div>
        <div className="space-y-2">
          <Label>Jabatan *</Label>
          <Input value={form.jabatan}
            onChange={e => set("jabatan", e.target.value)}
            placeholder="Kepala Sekolah / Guru" required />
        </div>
      </div>

      {/* Row 4 */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Tahun Masuk *</Label>
          <Input type="number" value={form.tahun_masuk}
            onChange={e => set("tahun_masuk", parseInt(e.target.value))}
            min={1990} max={2100} required />
        </div>
        <div className="space-y-2">
          <Label>Tahun Keluar</Label>
          <Input type="number" value={form.tahun_keluar ?? ""}
            onChange={e => set("tahun_keluar", e.target.value ? parseInt(e.target.value) : null)}
            min={1990} max={2100} placeholder="Kosongkan jika masih aktif" />
        </div>
      </div>

      {/* Row 5 */}
      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label>Status Pegawai *</Label>
          <Select value={form.status_pegawai} onValueChange={v => set("status_pegawai", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="TETAP">Tetap</SelectItem>
              <SelectItem value="TIDAK TETAP">Tidak Tetap</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Status Menikah *</Label>
          <Select value={form.menikah} onValueChange={v => set("menikah", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="MENIKAH">Menikah</SelectItem>
              <SelectItem value="BELUM MENIKAH">Belum Menikah</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Status Aktif *</Label>
          <Select value={form.aktif} onValueChange={v => set("aktif", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="AKTIF">Aktif</SelectItem>
              <SelectItem value="NON AKTIF">Non Aktif</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Row 6 */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Masa Aktif</Label>
          <Input value={form.masa_aktif}
            onChange={e => set("masa_aktif", e.target.value)}
            placeholder="25 Tahun" />
        </div>
        <div className="space-y-2">
          <Label>Jalur Masuk *</Label>
          <Select value={form.jalur_masuk} onValueChange={v => set("jalur_masuk", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="REKRUTMEN">Rekrutmen</SelectItem>
              <SelectItem value="ALUMNI PTH">Alumni PTH</SelectItem>
              <SelectItem value="LAINNYA">Lainnya</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Row 7 */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Email</Label>
          <Input type="email" value={form.email}
            onChange={e => set("email", e.target.value)}
            placeholder="pegawai@gmail.com" />
        </div>
        <div className="space-y-2">
          <Label>No. HP</Label>
          <Input value={form.hp}
            onChange={e => set("hp", e.target.value)}
            placeholder="08xxxxxxxxxx" />
        </div>
      </div>

      {/* Row 8 */}
      <div className="space-y-2">
        <Label>Catatan</Label>
        <Input value={form.catatan ?? ""}
          onChange={e => set("catatan", e.target.value || null)}
          placeholder="Kelakuan baik, dll..." />
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={isLoading} className="flex-1">
          {isLoading ? "Menyimpan..." : submitLabel}
        </Button>
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
            Batal
          </Button>
        )}
      </div>
    </form>
  )
}
