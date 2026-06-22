// ─── Master Akun ───────────────────────────────────────
export type KelompokAkun = 'ASET' | 'KEWAJIBAN' | 'MODAL' | 'PENDAPATAN' | 'BEBAN'
export type TipeNormal = 'DEBIT' | 'KREDIT'

export interface MasterAkun {
    id?: number
    kode: string
    nama: string
    pesantren_id: string
    unit_kerja_id: string
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

export type TipeKasTransaksi = 'SALDO_AWAL' | 'KAS_MASUK' | 'KAS_KELUAR' | 'TRANSFER'

export interface KasTransaksi {
  id: number
  unit_kerja_id: string
  pesantren_id: string
  jurnal_id: number | null
  tipe: TipeKasTransaksi
  tanggal: string
  no_transaksi: string
  akun_kas_id: string
  akun_lawan_id: string
  jumlah: number
  keterangan: string | null
  created_at?: string
}

export interface RekonsiliasiBankRow {
  id: number
  unit_kerja_id: string
  pesantren_id: string
  akun_kas_id: string
  periode: string
  saldo_sistem: number
  saldo_buku: number
  selisih: number
  catatan: string | null
  created_at?: string
}

export interface PosHutang {
  id: number
  unit_kerja_id: string
  pesantren_id: string
  nama: string
  akun_kode: string
  keterangan: string | null
  created_at?: string
}

export interface Hutang {
  id: number
  unit_kerja_id: string
  pesantren_id: string
  pos_hutang_id: number
  unit_pemberi_id: string | null
  jurnal_id: number | null
  tanggal: string
  no_hutang: string
  jumlah: number
  sisa_hutang: number
  keterangan: string | null
  status: 'BELUM_LUNAS' | 'LUNAS' | 'SEBAGIAN'
  created_at?: string
  // join
  pos_hutang?: { nama: string; akun_kode: string }
  unit_pemberi?: { nama: string }
}

export interface BayarHutang {
  id: number
  hutang_id: number
  unit_kerja_id: string
  pesantren_id: string
  jurnal_id: number | null
  tanggal: string
  jumlah_bayar: number
  akun_kas_id: string
  keterangan: string | null
  created_at?: string
}
