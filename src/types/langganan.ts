export type StatusLangganan =
  | 'TRIAL'
  | 'AKTIF'
  | 'MENUNGGU_VERIFIKASI'
  | 'EXPIRED'
  | 'DIBATALKAN'

export type StatusPembayaran = 'MENUNGGU' | 'DIVERIFIKASI' | 'DITOLAK'

export interface PaketLangganan {
  id: number
  kode: string
  nama: string
  harga: number
  max_unit: number
  deskripsi: string | null
  aktif: boolean
  urutan: number
}

export interface Langganan {
  id: number
  pesantren_id: string
  paket_id: number
  status: StatusLangganan
  tanggal_mulai: string
  tanggal_selesai: string | null
  trial_selesai: string | null
  created_at?: string
  paket_langganan?: PaketLangganan
}

export interface PembayaranLangganan {
  id: number
  pesantren_id: string
  paket_id: number
  langganan_id: number | null
  jumlah: number
  periode_bulan: number
  bukti_transfer: string | null
  bank_tujuan: string | null
  no_rekening: string | null
  nama_pengirim: string | null
  catatan: string | null
  status: StatusPembayaran
  verified_by: string | null
  verified_at: string | null
  catatan_verifikasi: string | null
  created_at?: string
  paket_langganan?: PaketLangganan
  pesantren?: { nama: string; kode: string }
}
