import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/hooks/useAuth"
import type { Langganan, PaketLangganan } from "@/types/langganan"

export function useLangganan() {
  const { pesantren } = useAuth()
  const [langganan, setLangganan] = useState<Langganan | null>(null)
  const [paket, setPaket] = useState<PaketLangganan | null>(null)
  const [loading, setLoading] = useState(true)
  const [jumlahUnit, setJumlahUnit] = useState(0)

  useEffect(() => {
    if (!pesantren?.id) {
      setLoading(false) // <-- penting: jika tidak ada pesantren, stop loading
      return
    }
    fetchLangganan()
  }, [pesantren?.id])

  async function fetchLangganan() {
    setLoading(true)
    try {
      const { data } = await supabase
        .from("langganan")
        .select("*, paket_langganan(*)")
        .eq("pesantren_id", pesantren!.id)
        .in("status", ["TRIAL", "AKTIF"])
        .order("created_at", { ascending: false })
        .limit(1)
        .single()

      if (data) {
        setLangganan(data)
        setPaket(data.paket_langganan)
      } else {
        // tidak ada data langganan, set null
        setLangganan(null)
        setPaket(null)
      }

      // Hitung jumlah unit aktif
    const { count } = await supabase
      .from("unit_kerja")
      .select("id", { count: "exact", head: true })
      .eq("pesantren_id", pesantren!.id)
      .eq("status", "AKTIF")

    setJumlahUnit(count ?? 0)
    setLoading(false)
    } catch (error) {
      console.error("Gagal fetch langganan:", error)
      setLangganan(null)
      setPaket(null)
    } finally {
      setLoading(false)
    }
  }

  // Cek apakah trial sudah habis
  const isTrialExpired = langganan?.status === "TRIAL" &&
    langganan.trial_selesai !== null &&
    new Date(langganan.trial_selesai) < new Date()

  // Cek apakah langganan aktif
  const isAktif = langganan?.status === "AKTIF" ||
    (langganan?.status === "TRIAL" && !isTrialExpired)

  // Sisa hari trial
  const sisaHariTrial = langganan?.trial_selesai
    ? Math.max(0, Math.ceil(
        (new Date(langganan.trial_selesai).getTime() - new Date().getTime())
        / (1000 * 60 * 60 * 24)
      ))
    : 0

  // Max unit dari paket
  const maxUnit = paket?.max_unit ?? 1

  const isUnlimited = maxUnit === -1
  const sisaUnit = isUnlimited ? 999 : Math.max(0, maxUnit - jumlahUnit)
  const bisaTambahUnit = isUnlimited || jumlahUnit < maxUnit

  return {
    langganan,
    paket,
    jumlahUnit,
    maxUnit,
    sisaUnit,
    isUnlimited,
    bisaTambahUnit,
    loading,
    isTrialExpired,
    isAktif,
    sisaHariTrial,
    refetch: fetchLangganan,
  }
}
