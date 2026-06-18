import { BrowserRouter, Routes, Route } from "react-router-dom"
import Layout from "@/components/Layout"
import Dashboard from "@/pages/Dashboard"
import DataPegawai from "@/pages/DataPegawai"
import TambahPegawai from "@/pages/TambahPegawai"
import Statistik from "@/pages/Statistik"
import Pengaturan from "@/pages/Pengaturan"

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/pegawai" element={<DataPegawai />} />
          <Route path="/tambah" element={<TambahPegawai />} />
          <Route path="/statistik" element={<Statistik />} />
          <Route path="/pengaturan" element={<Pengaturan />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
