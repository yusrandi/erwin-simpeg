export type Role =
  | 'SUPERADMIN_PLATFORM'
  | 'SUPERADMIN_PESANTREN'
  | 'ADMIN_UNIT'

export interface Profile {
  id: string
  pesantren_id: string | null
  unit_kerja_id: string | null
  nama: string
  role: Role
}

export interface Pesantren {
  id: string
  nama: string
  kode: string
  alamat: string | null
  telepon: string | null
  email: string | null
  logo_url: string | null
  status: 'PENDING' | 'AKTIF' | 'NONAKTIF'
  created_at: string
}

export interface UnitKerja {
  id: string
  pesantren_id: string
  nama: string
  jenis: string
  status: 'AKTIF' | 'NONAKTIF'
  created_at: string
}
