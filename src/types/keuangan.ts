// ─── Master Akun ───────────────────────────────────────
export type KelompokAkun = 'ASET' | 'KEWAJIBAN' | 'MODAL' | 'PENDAPATAN' | 'BEBAN'
export type TipeNormal = 'DEBIT' | 'KREDIT'

export interface MasterAkun {
  kode: string
  nama: string
  kelompok: KelompokAkun
  tipe_normal: TipeNormal
}

// ─── Jurnal ────────────────────────────────────────────
export interface JurnalDetail {
  id?: number
  jurnal_id?: number
  akun_kode: string        // → FK ke master_akun.kode
  debit: number
  kredit: number

  master_akun?: { nama: string; kelompok: string }
}

export interface JurnalUmum {
  id: number
  tanggal: string
  no_jurnal: string
  keterangan: string
  created_at?: string
  jurnal_detail?: JurnalDetail[]
}

export interface JurnalFormData {
  tanggal: string
  no_jurnal: string
  keterangan: string
  detail: JurnalDetail[]
}

// ─── Arus Kas ──────────────────────────────────────────
export type AktivitasArusKas = 'OPERASIONAL' | 'INVESTASI' | 'PENDANAAN'
export type TipeKas = 'MASUK' | 'KELUAR'

export interface ArusKasKategori {
  id?: number
  akun_kode: string        // → FK ke master_akun.kode
  aktivitas: AktivitasArusKas
  tipe_kas: TipeKas
  // join:
  master_akun?: MasterAkun
}

export interface ArusKasRow {
  akun_kode: string
  akun_nama: string
  aktivitas: AktivitasArusKas
  tipe_kas: TipeKas
  total: number
}

// ─── Laba Rugi ─────────────────────────────────────────
// Tidak perlu tabel/interface sendiri!
// Cukup filter master_akun WHERE kelompok IN ('PENDAPATAN','BEBAN')

export interface LabaRugiRow {
  akun_kode: string
  akun_nama: string
  kelompok: 'PENDAPATAN' | 'BEBAN'
  total: number
}

// ─── Neraca ────────────────────────────────────────────
export interface NeracaRow {
  akun_kode: string
  akun_nama: string
  kelompok: 'ASET' | 'KEWAJIBAN' | 'MODAL'
  total: number
}

// ─── Perubahan Modal ───────────────────────────────────
export interface PerubahanModalRow {
  keterangan: string
  jumlah: number
  tipe: 'TAMBAH' | 'KURANG'
}
