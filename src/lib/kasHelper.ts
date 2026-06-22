import { supabase } from "@/lib/supabase"

interface AutoJurnalParams {
  unitKerjaId: string
  pesantrenId: string
  tanggal: string
  noTransaksi: string
  keterangan: string
  akunDebit: string   // akun_kode yang didebit
  akunKredit: string  // akun_kode yang dikredit
  jumlah: number
}

// Auto generate no jurnal
export async function generateNoJurnal(unitKerjaId: string, prefix: string): Promise<string> {
  const year = new Date().getFullYear()
  const month = String(new Date().getMonth() + 1).padStart(2, "0")

  const { count } = await supabase
    .from("jurnal_umum")
    .select("id", { count: "exact", head: true })
    .eq("unit_kerja_id", unitKerjaId)
    .like("no_jurnal", `${prefix}-${year}${month}-%`)

  const seq = String((count ?? 0) + 1).padStart(3, "0")
  return `${prefix}-${year}${month}-${seq}`
}

// Auto buat jurnal + detail dari transaksi kas
export async function createJurnalOtomatis(params: AutoJurnalParams): Promise<number | null> {
  const {
    unitKerjaId, pesantrenId, tanggal,
    noTransaksi, keterangan, akunDebit, akunKredit, jumlah
  } = params

  // Insert jurnal_umum
  const { data: jurnal, error: jError } = await supabase
    .from("jurnal_umum")
    .insert({
      unit_kerja_id: unitKerjaId,
      pesantren_id: pesantrenId,
      tanggal,
      no_jurnal: noTransaksi,
      keterangan,
    })
    .select()
    .single()

  if (jError || !jurnal) return null

  // Insert jurnal_detail — debit & kredit
  const { error: dError } = await supabase
    .from("jurnal_detail")
    .insert([
      { jurnal_id: jurnal.id, akun_kode: akunDebit,  debit: jumlah, kredit: 0 },
      { jurnal_id: jurnal.id, akun_kode: akunKredit, debit: 0,      kredit: jumlah },
    ])

  if (dError) {
    // Rollback jurnal kalau detail gagal
    await supabase.from("jurnal_umum").delete().eq("id", jurnal.id)
    return null
  }

  return jurnal.id
}

// Hitung saldo akun dari jurnal_detail
export async function getSaldoAkun(
  akunKode: string,
  tipeNormal: string,
  unitKerjaId: string,
  sampaiTanggal?: string
): Promise<number> {
  let query = supabase
    .from("jurnal_detail")
    .select("debit, kredit, jurnal_umum!inner(tanggal, unit_kerja_id)")
    .eq("akun_kode", akunKode)
    .eq("jurnal_umum.unit_kerja_id", unitKerjaId)

  if (sampaiTanggal) {
    query = query.lte("jurnal_umum.tanggal", sampaiTanggal)
  }

  const { data } = await query
  if (!data) return 0

  return (data as any[]).reduce((s, d) => {
    return s + (tipeNormal === "DEBIT"
      ? Number(d.debit) - Number(d.kredit)
      : Number(d.kredit) - Number(d.debit))
  }, 0)
}
