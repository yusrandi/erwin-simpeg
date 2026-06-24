import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/hooks/useAuth"
import type { Langganan, PaketLangganan } from "@/types/langganan"

export function useLangganan() {
  const { pesantren } = useAuth()
  const [langganan, setLangganan] = useState<Langganan | null>(null)
  const [paket, setPaket] = useState<PaketLangganan | null>(null)
  const [loading, setLoading] = useState(true)

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

  // Cek apakah bisa tambah unit
  function bisaTambahUnit(jumlahUnitSaatIni: number) {
    if (maxUnit === -1) return true // unlimited
    return jumlahUnitSaatIni < maxUnit
  }

  return {
    langganan,
    paket,
    loading,
    isTrialExpired,
    isAktif,
    sisaHariTrial,
    maxUnit,
    bisaTambahUnit,
    refetch: fetchLangganan,
  }
}
