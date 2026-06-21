import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { useAuth } from "@/hooks/useAuth"
import Layout from "@/components/Layout"
import ProtectedRoute from "@/components/ProtectedRoute"

// Auth pages
import Login from "@/pages/Login"
import Register from "@/pages/Register"       // next step

// Platform pages
import PlatformLayout from "@/pages/platform/Layout"   // next step
import PlatformDashboard from "@/pages/platform/Dashboard" // next step

// App pages
import Dashboard from "@/pages/Dashboard"
import DataPegawai from "@/pages/DataPegawai"
import TambahPegawai from "@/pages/TambahPegawai"
import Statistik from "@/pages/Statistik"
import MasterAkun from "@/pages/MasterAkun"
import JurnalUmum from "@/pages/JurnalUmum"
import BukuBesar from "@/pages/BukuBesar"
import ArusKas from "@/pages/ArusKas"
import LabaRugi from "@/pages/LabaRugi"
import PerubahanModal from "@/pages/PerubahanModal"
import Neraca from "@/pages/Neraca"
import Pengaturan from "@/pages/Pengaturan"
import PlatformPesantren from "./pages/platform/Pesantren"
import Pending from "./pages/Pending"
import Onboarding from "./pages/Onboarding"
import PlatformUsers from "./pages/platform/Users"
import UnitKerja from "./pages/UnitKerja"
import SettingPembayaran from "./pages/SettingPembayaran"
import Landing from "./pages/Landing"

export default function App() {
  const { user, profile, loading } = useAuth()

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground" />
    </div>
  )

  return (
    <BrowserRouter>
      <Routes>

        {/* Public */}
        <Route path="/" element={<Landing />} />

        <Route path="/login"
          element={!user ? <Login /> : (
            profile?.role === "SUPERADMIN_PLATFORM"
              ? <Navigate to="/platform" replace />
              : <Navigate to="/dashboard" replace />
          )}
        />
        <Route path="/register"    element={<Register />} />
        <Route path="/pending"     element={<Pending />} />
        <Route path="/onboarding"  element={<Onboarding />} />
        <Route path="/unauthorized" element={
          <div className="min-h-screen flex items-center justify-center">
            <p className="text-muted-foreground">Akses ditolak.</p>
          </div>
        } />

        {/* Superadmin Platform — route terpisah */}
        <Route element={<ProtectedRoute allowedRoles={["SUPERADMIN_PLATFORM"]} />}>
          <Route path="/platform" element={<PlatformLayout />}>
            <Route index element={<PlatformDashboard />} />
            <Route path="pesantren" element={<PlatformPesantren />} />
            <Route path="users" element={<PlatformUsers />} />
          </Route>
        </Route>

        {/* Superadmin Pesantren + Admin Unit */}
        <Route element={<ProtectedRoute allowedRoles={["SUPERADMIN_PESANTREN", "ADMIN_UNIT"]} />}>
          <Route element={<Layout />}>
            <Route path="/dashboard"         element={<Dashboard />} />
            <Route path="/unit-kerja" element={<UnitKerja />} />
            <Route path="/pegawai"         element={<DataPegawai />} />
            <Route path="/tambah"          element={<TambahPegawai />} />
            <Route path="/statistik"       element={<Statistik />} />
            <Route path="/master-akun"     element={<MasterAkun />} />
            <Route path="/jurnal"          element={<JurnalUmum />} />
            <Route path="/buku-besar"      element={<BukuBesar />} />
            <Route path="/arus-kas"        element={<ArusKas />} />
            <Route path="/laba-rugi"       element={<LabaRugi />} />
            <Route path="/perubahan-modal" element={<PerubahanModal />} />
            <Route path="/neraca"          element={<Neraca />} />
            <Route path="/pengaturan"      element={<Pengaturan />} />
            <Route path="/setting-pembayaran" element={<SettingPembayaran />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
