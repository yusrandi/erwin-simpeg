import { useNavigate } from "react-router-dom"
import {
  Building2, Users, BookOpen, CreditCard, BarChart3,
  Shield, CheckCircle, ArrowRight, Menu, X,
  GraduationCap, Wallet, ChevronRight, LogOut,
  Sun,
  Moon
} from "lucide-react"
import { useState, useEffect } from "react"
import { useAuth } from "@/hooks/useAuth"

// ── Data ──────────────────────────────────────────────────
const FITUR = [
  {
    icon: Users,
    title: "Manajemen Pegawai",
    desc: "Kelola data seluruh pegawai per unit kerja — TK, SD, SMP, SMA, hingga STAI dalam satu sistem terintegrasi.",
  },
  {
    icon: BookOpen,
    title: "Akuntansi Lengkap",
    desc: "Jurnal Umum, Buku Besar, Arus Kas, Laba Rugi, Perubahan Modal, hingga Neraca otomatis dan akurat.",
  },
  {
    icon: CreditCard,
    title: "Manajemen Pembayaran",
    desc: "Setting SPP, paket pembayaran per jenjang, jenis bayar, dan laporan pembayaran santri real-time.",
  },
  {
    icon: Wallet,
    title: "Kas & Bank",
    desc: "Catat kas masuk, kas keluar, transfer antar rekening, dan rekonsiliasi bank dengan mudah.",
  },
  {
    icon: BarChart3,
    title: "Laporan & Statistik",
    desc: "Dashboard visual dengan grafik dan statistik kepegawaian serta keuangan per unit kerja.",
  },
  {
    icon: Shield,
    title: "Multi-Tenant & Aman",
    desc: "Setiap pesantren punya data terisolasi. Akses berbasis role — superadmin, admin pesantren, admin unit.",
  },
]

const PAKET = [
  {
    nama: "Starter",
    harga: "Gratis",
    periode: "Selamanya",
    highlight: false,
    fitur: [
      "1 Unit Kerja",
      "Manajemen Pegawai",
      "Jurnal Umum & Buku Besar",
      "Laporan Dasar",
      "Support Email",
    ],
  },
  {
    nama: "Pesantren",
    harga: "Rp 299.000",
    periode: "per bulan",
    highlight: true,
    fitur: [
      "Unlimited Unit Kerja",
      "Semua Fitur Akuntansi",
      "Manajemen SPP & Pembayaran",
      "Kas & Bank + Rekonsiliasi",
      "Multi-User & Role Access",
      "Laporan PDF & Excel",
      "Priority Support",
    ],
  },
  {
    nama: "Enterprise",
    harga: "Custom",
    periode: "hubungi kami",
    highlight: false,
    fitur: [
      "Semua Fitur Pesantren",
      "Custom Domain",
      "Integrasi API",
      "Dedicated Server",
      "Training & Onboarding",
      "SLA 99.9% Uptime",
      "Account Manager",
    ],
  },
]

const TESTIMONI = [
  {
    nama: "Ust. Ahmad Fauzi",
    jabatan: "Bendahara Pesantren Al-Hikmah",
    isi: "Sebelum pakai SIMPEG, laporan keuangan kami masih manual di Excel. Sekarang semua otomatis, neraca langsung balance, dan audit jadi jauh lebih mudah.",
  },
  {
    nama: "Hj. Siti Rahmawati",
    jabatan: "Kepala Tata Usaha PP Darul Ulum",
    isi: "Data pegawai dari 7 unit bisa dikelola dari satu dashboard. SPP santri juga sudah terintegrasi. Luar biasa membantu pekerjaan kami sehari-hari.",
  },
  {
    nama: "Ust. Ridwan Hakim",
    jabatan: "Direktur Keuangan Yayasan Al-Falah",
    isi: "Fitur multi-unit dan pemisahan data per pesantren sangat sesuai kebutuhan kami. Tim support juga responsif dan sigap membantu.",
  },
]

const STATS = [
  { value: "500+", label: "Pesantren Terdaftar" },
  { value: "50.000+", label: "Pegawai Terkelola" },
  { value: "Rp 2M+", label: "Transaksi Diproses" },
  { value: "99.9%", label: "Uptime System" },
]

// ── Komponen ──────────────────────────────────────────────
export default function Landing() {
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)

  const { user, signOut } = useAuth()
    const isAuthenticated = !!user

    const [isDark, setIsDark] = useState(
  () => localStorage.getItem("theme") === "dark"
)

useEffect(() => {
  document.documentElement.classList.toggle("dark", isDark)
  localStorage.setItem("theme", isDark ? "dark" : "light")
}, [isDark])


    const handleLogout = async () => {
    await signOut()
    navigate("/")
    }

  // Fungsi untuk navigasi ke dashboard (jika sudah login)
  const goToDashboard = () => navigate("/dashboard")

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans transition-colors">

      {/* ── Navbar ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 dark:bg-slate-950/95 backdrop-blur border-b border-slate-200 dark:border-slate-800 transition-colors">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-slate-900 dark:bg-white rounded-lg flex items-center justify-center">
              <Building2 className="w-4 h-4 text-white dark:text-slate-900" />
            </div>
            <span className="font-bold text-lg text-slate-900 dark:text-white">SIMPEG</span>
          </div>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-8">
            {["Fitur", "Paket", "Testimoni", "Kontak"].map((item) => (
              <a
                key={item}
                href={`#${item.toLowerCase()}`}
                className="text-sm text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors font-medium"
              >
                {item}
              </a>
            ))}
          </div>



          {/* CTA - berubah jika sudah login */}
          <div className="hidden md:flex items-center gap-3">
            <button
            onClick={() => setIsDark(d => !d)}
            className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
            {isAuthenticated ? (
              <>
                <button
                  onClick={goToDashboard}
                  className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
                >
                  Dashboard
                </button>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1.5 bg-red-50 text-red-600 text-sm font-medium px-4 py-2 rounded-lg hover:bg-red-100 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Keluar
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => navigate("/login")}
                  className="text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors"
                >
                  Masuk
                </button>
                <button
                  onClick={() => navigate("/register")}
                  className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-sm font-medium px-4 py-2 rounded-lg hover:bg-slate-700 dark:hover:bg-slate-100 transition-colors"
                >
                  Daftar Gratis
                </button>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <button className="md:hidden" onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-6 py-4 space-y-3">

            {["Fitur", "Paket", "Testimoni", "Kontak"].map((item) => (
              <a
                key={item}
                href={`#${item.toLowerCase()}`}
                onClick={() => setMenuOpen(false)}
                className="block text-sm font-medium text-slate-600 hover:text-slate-900"
              >
                {item}
              </a>
            ))}
            <div className="pt-3 border-t border-slate-100 flex flex-col gap-2">
              {isAuthenticated ? (
                <>
                  <button
                    onClick={() => { setMenuOpen(false); goToDashboard(); }}
                    className="text-sm font-medium text-slate-600 text-left"
                  >
                    Dashboard
                  </button>
                  <button
                    onClick={() => { setMenuOpen(false); handleLogout(); }}
                    className="flex items-center gap-1.5 text-sm font-medium text-red-600 text-left"
                  >
                    <LogOut className="w-4 h-4" />
                    Keluar
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => navigate("/login")}
                    className="text-sm font-medium text-slate-600 text-left"
                  >
                    Masuk
                  </button>
                  <button
                    onClick={() => navigate("/register")}
                    className="bg-slate-900 text-white text-sm font-medium px-4 py-2 rounded-lg text-center"
                  >
                    Daftar Gratis
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </nav>

      {/* ── Hero ── */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold px-3 py-1.5 rounded-full">
            <GraduationCap className="w-3.5 h-3.5" />
            Sistem Informasi Pesantren Terpadu
          </div>

          <h1 className="text-4xl md:text-6xl font-bold text-slate-900 dark:text-white leading-tight tracking-tight">
            Kelola Pesantren Anda<br />
            <span className="text-slate-400 dark:text-slate-500">Lebih Cerdas & Efisien</span>
          </h1>

          <p className="text-lg text-slate-500  dark:text-slate-400 max-w-2xl mx-auto leading-relaxed">
            SIMPEG adalah platform manajemen pesantren modern yang mengintegrasikan
            data pegawai, akuntansi, dan pembayaran SPP dalam satu sistem yang mudah
            digunakan oleh seluruh unit kerja.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            {isAuthenticated ? (
              <button
                onClick={goToDashboard}
                className="flex items-center gap-2 bg-slate-900 text-white font-semibold px-6 py-3 rounded-xl hover:bg-slate-700 transition-colors w-full sm:w-auto justify-center"
              >
                Dashboard
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={() => navigate("/register")}
                className="flex items-center gap-2 bg-slate-900 text-white font-semibold px-6 py-3 rounded-xl hover:bg-slate-700 transition-colors w-full sm:w-auto justify-center"
              >
                Mulai Gratis Sekarang
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={() => navigate(isAuthenticated ? "/dashboard" : "/login")}
              className="flex items-center gap-2 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-semibold px-6 py-3 rounded-xl transition-colors w-full sm:w-auto justify-center"
            >
              {isAuthenticated ? "Dashboard" : "Lihat Demo"}
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <p className="text-xs text-slate-400 dark:text-slate-500">
            Gratis selamanya untuk 1 unit kerja. Tanpa kartu kredit.
          </p>
        </div>

        {/* Hero visual (tetap sama) */}
        <div className="max-w-5xl mx-auto mt-16">
          <div className="bg-slate-900 rounded-2xl p-1 shadow-2xl">
            <div className="bg-slate-800 rounded-xl p-4">
              <div className="flex items-center gap-1.5 mb-4">
                <div className="w-3 h-3 rounded-full bg-red-500/70" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/70" />
                <div className="w-3 h-3 rounded-full bg-green-500/70" />
                <div className="flex-1 bg-slate-700 rounded h-5 ml-2 flex items-center px-3">
                  <span className="text-slate-400 text-xs">app.simpeg.id/dashboard</span>
                </div>
              </div>
              <div className="bg-white rounded-lg overflow-hidden">
                <div className="flex">
                  <div className="w-44 bg-slate-50 border-r border-slate-100 p-3 space-y-1 hidden sm:block">
                    <div className="flex items-center gap-2 p-2 mb-3">
                      <div className="w-5 h-5 bg-slate-900 rounded" />
                      <span className="text-xs font-bold text-slate-900">SIMPEG</span>
                    </div>
                    {["Dashboard", "Data Pegawai", "Jurnal Umum", "Laporan", "Pembayaran"].map((item, i) => (
                      <div key={item} className={`flex items-center gap-2 px-2 py-1.5 rounded text-xs ${i === 0 ? "bg-slate-900 text-white" : "text-slate-500"}`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${i === 0 ? "bg-white" : "bg-slate-300"}`} />
                        {item}
                      </div>
                    ))}
                  </div>
                  <div className="flex-1 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="h-3 w-24 bg-slate-900 rounded mb-1" />
                        <div className="h-2 w-36 bg-slate-200 rounded" />
                      </div>
                      <div className="h-6 w-20 bg-slate-900 rounded-lg" />
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      {[
                        { label: "Total Pegawai", val: "247" },
                        { label: "Aktif", val: "231" },
                        { label: "Non Aktif", val: "16" },
                        { label: "Unit Kerja", val: "7" },
                      ].map(s => (
                        <div key={s.label} className="bg-slate-50 rounded-lg p-2 border border-slate-100">
                          <div className="text-xs text-slate-400">{s.label}</div>
                          <div className="text-sm font-bold text-slate-900 mt-0.5">{s.val}</div>
                        </div>
                      ))}
                    </div>
                    <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                      <div className="h-2 w-28 bg-slate-200 rounded mb-3" />
                      <div className="flex items-end gap-1 h-16">
                        {[40, 65, 45, 80, 55, 90, 70, 85, 60, 95, 75, 88].map((h, i) => (
                          <div key={i} className="flex-1 bg-slate-900 rounded-t opacity-80" style={{ height: `${h}%` }} />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats ── */}
      <section className="py-16 bg-slate-900">
        <div className="max-w-5xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {STATS.map(s => (
              <div key={s.label} className="text-center">
                <p className="text-3xl font-bold text-white">{s.value}</p>
                <p className="text-sm text-slate-400 mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Fitur ── */}
      <section id="fitur" className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12 space-y-3">
            <div className="inline-flex items-center gap-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300  text-xs font-semibold px-3 py-1.5 rounded-full">
              Fitur Lengkap
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white">
              Semua yang Pesantren Anda Butuhkan
            </h2>
            <p className="text-slate-500 dark:text-slate-400 max-w-xl mx-auto">
              Dirancang khusus untuk kebutuhan pesantren modern — dari yang kecil
              hingga yang memiliki puluhan unit.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FITUR.map(f => (
              <div
                key={f.title}
                className="group p-6 rounded-2xl border border-slate-100 hover:border-slate-900 hover:shadow-lg transition-all duration-200 bg-white"
              >
                <div className="w-10 h-10 bg-slate-100 group-hover:bg-slate-900 rounded-xl flex items-center justify-center mb-4 transition-colors">
                  <f.icon className="w-5 h-5 text-slate-900 group-hover:text-white transition-colors" />
                </div>
                <h3 className="font-bold text-slate-900 mb-2">{f.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Cara Kerja ── */}
      <section className="py-20 px-6 bg-slate-50 dark:bg-slate-900">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12 space-y-3">
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white">Mulai dalam 3 Langkah</h2>
            <p className="text-slate-500 dark:text-slate-400">Setup cepat, langsung bisa digunakan.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                no: "01",
                title: "Daftar Pesantren",
                desc: "Isi data pesantren dan akun admin. Pendaftaran diverifikasi dalam 1x24 jam.",
              },
              {
                no: "02",
                title: "Setup Unit & Tim",
                desc: "Buat unit kerja (TK, SD, SMP, dll) dan tambahkan admin per unit.",
              },
              {
                no: "03",
                title: "Mulai Kelola",
                desc: "Input data pegawai, atur master akun keuangan, dan mulai catat transaksi.",
              },
            ].map(step => (
              <div key={step.no} className="relative">
                <div className="text-6xl font-bold text-slate-100 dark:text-slate-800 mb-3">{step.no}</div>
                <h3 className="font-bold text-slate-900 text-lg dark:text-white mb-2">{step.title}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Paket ── */}
      <section id="paket" className="py-20 px-6 dark:bg-slate-950">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12 space-y-3">
            <div className="inline-flex items-center gap-2 bg-slate-100 text-slate-600 text-xs font-semibold px-3 py-1.5 rounded-full">
              Harga Transparan
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900">Pilih Paket yang Sesuai</h2>
            <p className="text-slate-500">Mulai gratis, upgrade kapan saja sesuai kebutuhan.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {PAKET.map(p => {
              // Tentukan aksi tombol berdasarkan paket dan status login
              let buttonText, buttonAction
              if (p.nama === "Enterprise") {
                buttonText = "Hubungi Kami"
                buttonAction = () => document.getElementById("kontak")?.scrollIntoView({ behavior: "smooth" })
              } else if (p.nama === "Starter") {
                if (isAuthenticated) {
                  buttonText = "Dashboard"
                  buttonAction = goToDashboard
                } else {
                  buttonText = "Mulai Gratis"
                  buttonAction = () => navigate("/register")
                }
              } else { // Pesantren
                if (isAuthenticated) {
                  buttonText = "Dashboard"
                  buttonAction = goToDashboard
                } else {
                  buttonText = "Coba 14 Hari Gratis"
                  buttonAction = () => navigate("/register")
                }
              }

              return (
                <div
                  key={p.nama}
                  className={`rounded-2xl p-6 border-2 flex flex-col ${
                    p.highlight
                      ? "border-slate-900 bg-slate-900 text-white shadow-2xl scale-105"
                      : "border-slate-100 dark:border-slate-800 dark:bg-slate-900 text-slate-900 dark:text-white"
                  }`}
                >
                  {p.highlight && (
                    <div className="inline-flex self-start bg-white text-slate-900 text-xs font-bold px-3 py-1 rounded-full mb-4">
                      Paling Populer
                    </div>
                  )}
                  <p className={`text-sm font-semibold mb-1 ${p.highlight ? "text-slate-300" : "text-slate-500 dark:text-slate-400"}`}>
                    {p.nama}
                  </p>
                  <p className={`text-3xl font-bold ${p.highlight ? "text-white" : "text-slate-900"}`}>
                    {p.harga}
                  </p>
                  <p className={`text-xs mt-1 mb-6 ${p.highlight ? "text-slate-400" : "text-slate-400"}`}>
                    {p.periode}
                  </p>

                  <ul className="space-y-3 flex-1 mb-6">
                    {p.fitur.map(f => (
                      <li key={f} className="flex items-start gap-2.5 text-sm">
                        <CheckCircle className={`w-4 h-4 mt-0.5 shrink-0 ${p.highlight ? "text-green-400" : "text-green-500"}`} />
                        <span className={p.highlight ? "text-slate-200" : "text-slate-600 dark:text-slate-300"}>{f}</span>
                      </li>
                    ))}
                  </ul>

                  <button
                    onClick={buttonAction}
                    className={`w-full py-3 rounded-xl font-semibold text-sm transition-colors ${
                      p.highlight
                        ? "bg-white text-slate-900 hover:bg-slate-100"
                        : "bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-700 dark:hover:bg-slate-100"
                    }`}
                  >
                    {buttonText}
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── Testimoni ── */}
      <section id="testimoni" className="py-20 px-6 bg-slate-50 dark:bg-slate-900">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12 space-y-3">
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white">Dipercaya Pesantren Se-Indonesia</h2>
            <p className="text-slate-500">Apa kata mereka yang sudah menggunakan SIMPEG.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TESTIMONI.map(t => (
              <div key={t.nama} className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-100 dark:border-slate-700 shadow-sm">
                <div className="flex gap-0.5 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <svg key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-5">"{t.isi}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-slate-900 rounded-full flex items-center justify-center text-white text-sm font-bold">
                    {t.nama[0]}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">{t.nama}</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500">{t.jabatan}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-20 px-6 bg-slate-900">
        <div className="max-w-3xl mx-auto text-center space-y-6">
          <h2 className="text-3xl md:text-4xl font-bold text-white leading-tight">
            Siap Digitalkan Pesantren Anda?
          </h2>
          <p className="text-slate-400 text-lg">
            Bergabung dengan ratusan pesantren yang sudah lebih efisien bersama SIMPEG.
            Daftar gratis, tidak perlu kartu kredit.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            {isAuthenticated ? (
              <button
                onClick={goToDashboard}
                className="flex items-center justify-center gap-2 bg-white text-slate-900 font-semibold px-8 py-3.5 rounded-xl hover:bg-slate-100 transition-colors"
              >
                Dashboard
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={() => navigate("/register")}
                className="flex items-center justify-center gap-2 bg-white text-slate-900 font-semibold px-8 py-3.5 rounded-xl hover:bg-slate-100 transition-colors"
              >
                Daftar Gratis Sekarang
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
            {isAuthenticated ? (
              <button
                onClick={handleLogout}
                className="flex items-center justify-center gap-2 border border-slate-700 text-white font-semibold px-8 py-3.5 rounded-xl hover:bg-slate-800 transition-colors"
              >
                Keluar
              </button>
            ) : (
              <button
                onClick={() => navigate("/login")}
                className="flex items-center justify-center gap-2 border border-slate-700 text-white font-semibold px-8 py-3.5 rounded-xl hover:bg-slate-800 transition-colors"
              >
                Masuk ke Akun
              </button>
            )}
          </div>
        </div>
      </section>

      {/* ── Kontak ── */}
      <section id="kontak" className="py-16 px-6 bg-slate-50 dark:bg-slate-900">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Ada Pertanyaan?</h2>
              <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">
                Tim kami siap membantu Anda memulai dan menjawab pertanyaan seputar SIMPEG.
              </p>
              <div className="space-y-3 text-sm">
                {[
                  { label: "Email", val: "support@simpeg.id" },
                  { label: "WhatsApp", val: "+62 812 3456 7890" },
                  { label: "Jam Operasional", val: "Senin–Jumat, 08.00–17.00 WIB" },
                ].map(c => (
                  <div key={c.label} className="flex gap-3">
                    <span className="text-slate-400 dark:text-slate-500 w-32 shrink-0">{c.label}</span>
                    <span className="font-medium text-slate-900 dark:text-white">{c.val}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Contact form */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-6 space-y-4">
              <p className="font-semibold text-slate-900 dark:text-white">Kirim Pesan</p>
              <input
                type="text"
                placeholder="Nama lengkap"
                className="w-full border border-slate-200 dark:border-slate-600 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 dark:bg-slate-700 dark:text-white dark:focus:ring-slate-400"
              />
              <input
                type="email"
                placeholder="Email"
                className="w-full border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 dark:text-white placeholder:text-slate-400 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-400"
              />
              <textarea
                placeholder="Pesan Anda..."
                rows={3}
                className="w-full border border-slate-200 dark:border-slate-600 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 resize-none dark:bg-slate-700 dark:text-white dark:focus:ring-slate-400"
              />
              <button className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-semibold py-2.5 rounded-lg text-sm hover:bg-slate-700 dark:hover:bg-slate-100 transition-colors">
                Kirim Pesan
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="bg-slate-900 dark:bg-black text-slate-400 py-10 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-white dark:bg-slate-800 rounded-lg flex items-center justify-center">
                <Building2 className="w-4 h-4 text-slate-900 dark:text-white" />
              </div>
              <span className="font-bold text-white">SIMPEG</span>
              <span className="text-xs ml-2">Sistem Informasi Pesantren</span>
            </div>
            <div className="flex gap-6 text-xs">
              {["Fitur", "Paket", "Privasi", "Syarat & Ketentuan"].map(item => (
                <a key={item} href="#" className="hover:text-white transition-colors">
                  {item}
                </a>
              ))}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-600">© 2026 SIMPEG. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
