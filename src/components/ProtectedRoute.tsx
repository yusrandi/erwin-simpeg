import { Navigate, Outlet } from "react-router-dom"
import { useAuth } from "@/hooks/useAuth"
import { useLangganan } from "@/hooks/useLangganan"

interface Props {
  allowedRoles?: string[]
}

export default function ProtectedRoute({ allowedRoles }: Props) {
  const { user, profile,  loading } = useAuth()
  const { isTrialExpired, loading: loadingLangganan } = useLangganan()

  if (loading ||  loadingLangganan) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground" />
    </div>
  )

  if (!user || !profile) return <Navigate to="/login" replace />

  if (allowedRoles && !allowedRoles.includes(profile.role)) {
    if (profile.role === "SUPERADMIN_PLATFORM") return <Navigate to="/platform" replace />
    return <Navigate to="/unauthorized" replace />
  }

  if (profile.role === "SUPERADMIN_PESANTREN") {
    // if (pesantren?.status === "PENDING") return <Navigate to="/pending" replace />
    // if (!hasUnits) return <Navigate to="/onboarding" replace />
    // Trial habis → halaman upgrade
    if (isTrialExpired) return <Navigate to="/upgrade" replace />
  }

  return <Outlet />
}
