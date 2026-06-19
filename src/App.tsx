import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import Layout from "@/components/Layout"
import ProtectedRoute from "@/components/ProtectedRoute"
import Login from "@/pages/Login"
import Dashboard from "@/pages/Dashboard"
import DataPegawai from "@/pages/DataPegawai"
import TambahPegawai from "@/pages/TambahPegawai"
import Statistik from "@/pages/Statistik"
import Pengaturan from "@/pages/Pengaturan"
import { isAuthenticated } from "@/lib/auth"
import JurnalUmum from "./pages/JurnalUmum"
import BukuBesar from "./pages/BukuBesar"
import ArusKas from "./pages/ArusKas"
import LabaRugi from "./pages/LabaRugi"
import MasterAkun from "./pages/MasterAkun"
import Neraca from "./pages/Neraca"
import PerubahanModal from "./pages/PerubahanModal"

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Login route — redirect ke dashboard kalau sudah login */}
        <Route
          path="/login"
          element={isAuthenticated() ? <Navigate to="/" replace /> : <Login />}
        />

        {/* Protected routes */}
        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/pegawai" element={<DataPegawai />} />
            <Route path="/tambah" element={<TambahPegawai />} />
            <Route path="/statistik" element={<Statistik />} />
            <Route path="/pengaturan" element={<Pengaturan />} />
            <Route path="/master-akun" element={<MasterAkun />} />
            <Route path="/jurnal" element={<JurnalUmum />} />
            <Route path="/buku-besar" element={<BukuBesar />} />
            <Route path="/arus-kas" element={<ArusKas />} />
            <Route path="/laba-rugi" element={<LabaRugi />} />
            <Route path="/neraca" element={<Neraca />} />
            <Route path="/perubahan-modal" element={<PerubahanModal />} />
          </Route>
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
