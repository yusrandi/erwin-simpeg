export interface PosBayar {
  id: number
  unit_kerja_id: string
  pesantren_id: string
  nama: string
  akun_kode: string
  keterangan: string | null
  created_at?: string
}

export interface JenisBayar {
  id: number
  unit_kerja_id: string
  pesantren_id: string
  nama: string
  akun_kode: string
  keterangan: string | null
  created_at?: string
}

export interface PaketPembayaran {
  id: number
  unit_kerja_id: string
  pesantren_id: string
  nama: string
  keterangan: string | null
  aktif: boolean
  created_at?: string
  paket_detail?: PaketDetail[]
}

export interface PaketDetail {
  id?: number
  paket_id?: number
  pos_bayar_id: number
  jumlah: number
  periode: 'BULANAN' | 'TAHUNAN' | 'SEKALI'
  // join
  pos_bayar?: { nama: string }
}

export interface Pajak {
  id: number
  unit_kerja_id: string
  pesantren_id: string
  nama: string
  persentase: number
  akun_kode: string
  aktif: boolean
  created_at?: string
}

export interface UnitPos {
  id: number
  unit_kerja_id: string
  pesantren_id: string
  nama: string
  kasir_id: string | null
  aktif: boolean
  created_at?: string
  // join
  kasir?: { nama: string } | null
}
