import { Navigate, Outlet } from "react-router-dom"
import { useAuth } from "@/hooks/useAuth"

interface Props {
  allowedRoles?: string[]
}

export default function ProtectedRoute({ allowedRoles }: Props) {
  const { user, profile, pesantren, loading } = useAuth()

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground" />
    </div>
  )

  if (!user || !profile) return <Navigate to="/login" replace />

  if (allowedRoles && !allowedRoles.includes(profile.role)) {
    return <Navigate to="/unauthorized" replace />
  }

  // Kalau superadmin pesantren & status PENDING
  if (
    profile.role === "SUPERADMIN_PESANTREN" &&
    pesantren?.status === "PENDING"
  ) {
    return <Navigate to="/pending" replace />
  }

  return <Outlet />
}
