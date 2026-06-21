import { useAuth } from "@/hooks/useAuth"

export function useUnit() {
  const { profile, pesantren, unitKerja } = useAuth()

  // SUPERADMIN_PESANTREN tidak punya unit_kerja_id sendiri
  // — mereka bisa lihat semua unit di pesantrennya
  // ADMIN_UNIT punya unit_kerja_id spesifik

  return {
    pesantren_id: pesantren?.id ?? profile?.pesantren_id ?? null,
    unit_kerja_id: unitKerja?.id ?? profile?.unit_kerja_id ?? null,
    role: profile?.role ?? null,
    isSuperadminPesantren: profile?.role === "SUPERADMIN_PESANTREN",
    isAdminUnit: profile?.role === "ADMIN_UNIT",
    unitKerja: unitKerja,
  }
}
