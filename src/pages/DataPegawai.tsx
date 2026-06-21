import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"
import { useUnit } from "@/hooks/useUnit"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { PegawaiForm } from "@/components/PegawaiForm"
import { Search, Pencil, Trash2, ChevronLeft, ChevronRight, RefreshCw } from "lucide-react"
import type { Pegawai, PegawaiFormData } from "@/types/pegawai"
import type { UnitKerja } from "@/types/auth"

const PAGE_SIZE = 10

export default function DataPegawai() {
  const { toast } = useToast()
  const { pesantren_id, unit_kerja_id, isSuperadminPesantren } = useUnit()

  const [data, setData] = useState<Pegawai[]>([])
  const [filtered, setFiltered] = useState<Pegawai[]>([])
  const [unitList, setUnitList] = useState<UnitKerja[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [filterAktif, setFilterAktif] = useState("SEMUA")
  const [filterStatus, setFilterStatus] = useState("SEMUA")
  const [filterUnit, setFilterUnit] = useState("SEMUA")
  const [page, setPage] = useState(1)
  const [editTarget, setEditTarget] = useState<Pegawai | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Pegawai | null>(null)
  const [saving, setSaving] = useState(false)

  // Fetch unit list untuk filter dropdown
  async function fetchUnitList() {
    if (!pesantren_id) return
    const { data: units } = await supabase
      .from("unit_kerja")
      .select("*")
      .eq("pesantren_id", pesantren_id)
      .order("nama")
    setUnitList(units ?? [])
  }

  async function fetchData() {
    setLoading(true)
    let query = supabase
      .from("pegawai")
      .select(`
        *,
        unit_kerja ( id, nama, jenis )
      `)
      .order("id")

    if (isSuperadminPesantren) {
      query = query.eq("pesantren_id", pesantren_id!)
    } else {
      query = query.eq("unit_kerja_id", unit_kerja_id!)
    }

    const { data: rows, error } = await query
    if (error) { toast({ title: "Gagal memuat data", variant: "destructive" }) }
    setData(rows ?? [])
    setLoading(false)
  }

  useEffect(() => {
    fetchUnitList()
    fetchData()
  }, [pesantren_id, unit_kerja_id])

  // Filter logic
  useEffect(() => {
    let result = [...data]

    if (search) result = result.filter(d =>
      d.nama_pegawai.toLowerCase().includes(search.toLowerCase()) ||
      d.id_nip.includes(search) ||
      d.jabatan.toLowerCase().includes(search.toLowerCase()) ||
      (d.unit_kerja?.nama ?? "").toLowerCase().includes(search.toLowerCase())
    )

    if (filterAktif !== "SEMUA") result = result.filter(d => d.aktif === filterAktif)
    if (filterStatus !== "SEMUA") result = result.filter(d => d.status_pegawai === filterStatus)
    if (filterUnit !== "SEMUA") result = result.filter(d => d.unit_kerja_id === filterUnit)

    setFiltered(result)
    setPage(1)
  }, [search, filterAktif, filterStatus, filterUnit, data])

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const pageData = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  async function handleEdit(formData: PegawaiFormData) {

    if (!editTarget) return

    const { ...cleanData } = formData
    const payload = {
        nama_pegawai: cleanData.nama_pegawai,
        id_nip: cleanData.id_nip,
        pendidikan_terakhir: cleanData.pendidikan_terakhir,
        jenis_kelamin: cleanData.jenis_kelamin,
        unit_kerja_id: cleanData.unit_kerja_id,
        jabatan: cleanData.jabatan,
        tahun_masuk: cleanData.tahun_masuk,
        tahun_keluar: cleanData.tahun_keluar,
        status_pegawai: cleanData.status_pegawai,
        menikah: cleanData.menikah,
        aktif: cleanData.aktif,
        masa_aktif: cleanData.masa_aktif,
        jalur_masuk: cleanData.jalur_masuk,
        email: cleanData.email,
        hp: cleanData.hp,
        catatan: cleanData.catatan,
    }
    setSaving(true)
    const { error } = await supabase
      .from("pegawai")
      .update(payload)
      .eq("id", editTarget.id)
    setSaving(false)
    if (error) {
        console.log({error});

      toast({ title: "Gagal menyimpan", description: error.message, variant: "destructive" })
      return
    }
    toast({ title: "Berhasil disimpan" })
    setEditTarget(null)
    fetchData()
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setSaving(true)
    const { error } = await supabase
      .from("pegawai")
      .delete()
      .eq("id", deleteTarget.id)
    setSaving(false)
    if (error) {
      toast({ title: "Gagal menghapus", description: error.message, variant: "destructive" })
      return
    }
    toast({ title: "Data dihapus" })
    setDeleteTarget(null)
    fetchData()
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Data Pegawai</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {filtered.length} dari {data.length} pegawai ditampilkan
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 lg:flex-row">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Cari nama, NIP, jabatan..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <Select value={filterAktif} onValueChange={setFilterAktif}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Status Aktif" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="SEMUA">Semua Status</SelectItem>
            <SelectItem value="AKTIF">Aktif</SelectItem>
            <SelectItem value="NON AKTIF">Non Aktif</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Kepegawaian" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="SEMUA">Semua</SelectItem>
            <SelectItem value="TETAP">Tetap</SelectItem>
            <SelectItem value="TIDAK TETAP">Tidak Tetap</SelectItem>
          </SelectContent>
        </Select>
        {/* Filter unit hanya untuk superadmin pesantren */}
        {isSuperadminPesantren && (
          <Select value={filterUnit} onValueChange={setFilterUnit}>
            <SelectTrigger className="w-40"><SelectValue placeholder="Unit Kerja" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="SEMUA">Semua Unit</SelectItem>
              {unitList.map(u => (
                <SelectItem key={u.id} value={u.id}>{u.nama}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Tabel */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-10">#</TableHead>
                <TableHead>Nama Pegawai</TableHead>
                <TableHead>NIP</TableHead>
                <TableHead>Pendidikan</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead>Jabatan</TableHead>
                <TableHead>Masuk</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Aktif</TableHead>
                <TableHead>Jalur</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={11} className="text-center py-12 text-muted-foreground">
                    <div className="flex items-center justify-center gap-2">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-foreground" />
                      Memuat data...
                    </div>
                  </TableCell>
                </TableRow>
              ) : pageData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={11} className="text-center py-12 text-muted-foreground">
                    Tidak ada data ditemukan
                  </TableCell>
                </TableRow>
              ) : pageData.map((p, i) => (
                <TableRow key={p.id}>
                  <TableCell className="text-muted-foreground text-xs">
                    {(page - 1) * PAGE_SIZE + i + 1}
                  </TableCell>
                  <TableCell className="font-medium text-foreground">{p.nama_pegawai}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{p.id_nip}</TableCell>
                  <TableCell className="text-xs">{p.pendidikan_terakhir}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {p.unit_kerja?.nama ?? "-"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">{p.jabatan}</TableCell>
                  <TableCell className="text-sm">{p.tahun_masuk}</TableCell>
                  <TableCell>
                    <Badge variant={p.status_pegawai === "TETAP" ? "default" : "secondary"} className="text-xs">
                      {p.status_pegawai}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={p.aktif === "AKTIF" ? "success" : "secondary"} className="text-xs">
                      {p.aktif}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{p.jalur_masuk}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-1 justify-end">
                      <Button
                        size="icon" variant="ghost" className="h-7 w-7"
                        onClick={() => setEditTarget(p)}  // ← fix: tambah onClick
                      >
                        <Pencil className="w-3.5 h-3.5 text-blue-500" />
                      </Button>
                      <Button
                        size="icon" variant="ghost" className="h-7 w-7"
                        onClick={() => setDeleteTarget(p)}  // ← fix: tambah onClick
                      >
                        <Trash2 className="w-3.5 h-3.5 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Halaman {page} dari {totalPages}</p>
          <div className="flex gap-2">
            <Button size="sm" variant="outline"
              onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
              .map((p, idx, arr) => (
                <>
                  {idx > 0 && arr[idx - 1] !== p - 1 && (
                    <span key={`dots-${p}`} className="px-2 text-muted-foreground self-center">…</span>
                  )}
                  <Button key={p} size="sm"
                    variant={p === page ? "default" : "outline"}
                    onClick={() => setPage(p)} className="w-9">
                    {p}
                  </Button>
                </>
              ))}
            <Button size="sm" variant="outline"
              onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editTarget} onOpenChange={open => !open && setEditTarget(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Data Pegawai</DialogTitle>
            <DialogDescription>
              {editTarget?.nama_pegawai} · NIP {editTarget?.id_nip}
            </DialogDescription>
          </DialogHeader>
          {editTarget && (
            <PegawaiForm
              initialData={editTarget}
              onSubmit={handleEdit}
              onCancel={() => setEditTarget(null)}
              submitLabel="Simpan Perubahan"
              isLoading={saving}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={open => !open && setDeleteTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Hapus Data Pegawai</DialogTitle>
            <DialogDescription>
              Hapus <strong>{deleteTarget?.nama_pegawai}</strong>? Tindakan ini tidak dapat dibatalkan.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 pt-2">
            <Button variant="destructive" className="flex-1"
              onClick={handleDelete} disabled={saving}>
              {saving ? "Menghapus..." : "Ya, Hapus"}
            </Button>
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={saving}>
              Batal
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
