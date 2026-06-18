export type JenisKelamin = 'LAKI-LAKI' | 'PEREMPUAN'
export type StatusPegawai = 'TETAP' | 'TIDAK TETAP'
export type StatusNikah = 'MENIKAH' | 'BELUM MENIKAH'
export type StatusAktif = 'AKTIF' | 'NON AKTIF'
export type JalurMasuk = 'REKRUTMEN' | 'ALUMNI PTH' | 'LAINNYA'

export interface Pegawai {
  id: number
  nama_pegawai: string
  id_nip: string
  pendidikan_terakhir: string
  jenis_kelamin: JenisKelamin
  unit_kerja: string
  jabatan: string
  tahun_masuk: number
  tahun_keluar: number | null
  status_pegawai: StatusPegawai
  menikah: StatusNikah
  aktif: StatusAktif
  masa_aktif: string
  jalur_masuk: JalurMasuk
  email: string
  hp: string
  catatan: string | null
  created_at?: string
}

export interface PegawaiFormData {
  nama_pegawai: string
  id_nip: string
  pendidikan_terakhir: string
  jenis_kelamin: JenisKelamin
  unit_kerja: string
  jabatan: string
  tahun_masuk: number
  tahun_keluar: number | null
  status_pegawai: StatusPegawai
  menikah: StatusNikah
  aktif: StatusAktif
  masa_aktif: string
  jalur_masuk: JalurMasuk
  email: string
  hp: string
  catatan: string | null
}

export interface StatsDashboard {
  total: number
  aktif: number
  nonAktif: number
  tetap: number
  tidakTetap: number
  lakiLaki: number
  perempuan: number
}
