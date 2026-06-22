import { NavLink, useNavigate } from "react-router-dom"
import {
  LayoutDashboard, Users, UserPlus, BarChart3, Database,
  BookOpen, BookMarked, Wallet, TrendingDown, Scale,
  ArrowLeftRight, Building2, Building, Sun, Moon,
  LogOut, ChevronDown,
  CreditCard,
  Landmark,
  HandCoins
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Separator } from "@/components/ui/separator"
import { useAuth } from "@/hooks/useAuth"
import { useState, useEffect } from "react"

export function Sidebar() {
  const navigate = useNavigate()
  const { profile, pesantren, unitKerja, signOut } = useAuth()

  const [theme, setTheme] = useState<"light" | "dark">(
    () => (localStorage.getItem("theme") as "light" | "dark") || "light"
  )
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({
    Kepegawaian: false,
    Akuntansi: false,
  })

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark")
    localStorage.setItem("theme", theme)
  }, [theme])

  async function handleLogout() {
    await signOut()
    navigate("/login", { replace: true })
  }

  const isSuperadminPesantren = profile?.role === "SUPERADMIN_PESANTREN"

  const navGroups = [
    {
      label: "Kepegawaian",
      items: [
        { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
        ...(isSuperadminPesantren
          ? [{ to: "/unit-kerja", icon: Building, label: "Unit Kerja" }]
          : []),
        { to: "/pegawai", icon: Users, label: "Data Pegawai" },
        { to: "/tambah", icon: UserPlus, label: "Tambah Pegawai" },
        { to: "/statistik", icon: BarChart3, label: "Statistik" },
      ],
    },
    {
        label: "Keuangan",          // ← group baru
        items: [
        { to: "/setting-pembayaran", icon: CreditCard, label: "Setting Pembayaran" },
        { to: "/kas-bank", icon: Landmark, label: "Kas & Bank" },
        { to: "/hutang", icon: HandCoins, label: "Hutang" },
        ],
    },
    {
      label: "Akuntansi",
      items: [
        { to: "/master-akun", icon: Database, label: "Master Akun" },
        { to: "/jurnal", icon: BookOpen, label: "Jurnal Umum" },
        { to: "/buku-besar", icon: BookMarked, label: "Buku Besar" },
        { to: "/arus-kas", icon: Wallet, label: "Arus Kas" },
        { to: "/laba-rugi", icon: TrendingDown, label: "Laba Rugi" },
        { to: "/perubahan-modal", icon: ArrowLeftRight, label: "Perubahan Modal" },
        { to: "/neraca", icon: Scale, label: "Neraca" },
      ],
    },
  ]

  return (
    <aside className="w-64 min-h-screen bg-background border-r border-border flex flex-col fixed left-0 top-0 z-40">
      {/* Logo */}
      <div className="p-6">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-foreground rounded-lg flex items-center justify-center">
            <Building2 className="w-5 h-5 text-background" />
          </div>
          <div>
            <p className="font-bold text-sm leading-tight text-foreground">SIMPEG</p>
            <p className="text-xs text-muted-foreground leading-tight truncate max-w-[140px]">
              {pesantren?.nama ?? "Sistem Informasi Pesantren"}
            </p>
          </div>
        </div>
      </div>

      <Separator />

      {/* Nav */}
      <nav className="flex-1 p-4 space-y-4 overflow-y-auto">
        {navGroups.map(group => (
          <div key={group.label}>
            <button
              onClick={() => setCollapsed(p => ({ ...p, [group.label]: !p[group.label] }))}
              className="w-full flex items-center justify-between px-3 pb-1.5 group"
            >
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider group-hover:text-foreground transition-colors">
                {group.label}
              </span>
              <ChevronDown className={cn(
                "w-3.5 h-3.5 text-muted-foreground transition-transform duration-200",
                collapsed[group.label] && "-rotate-90"
              )} />
            </button>

            {!collapsed[group.label] && (
              <div className="space-y-0.5">
                {group.items.map(({ to, icon: Icon, label }) => (
                  <NavLink
                    key={to}
                    to={to}
                    end={to === "/"}
                    className={({ isActive }) => cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all duration-150",
                      isActive
                        ? "bg-foreground text-background"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    {label}
                  </NavLink>
                ))}
              </div>
            )}
          </div>
        ))}
      </nav>

      <Separator />

      <div className="p-4 space-y-1">
        <NavLink
          to="/pengaturan"
          className={({ isActive }) => cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all",
            isActive ? "bg-foreground text-background" : "text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
        >
          <Building2 className="w-4 h-4" />
          Pengaturan
        </NavLink>

        <button
          onClick={() => setTheme(t => t === "light" ? "dark" : "light")}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
        >
          {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          {theme === "dark" ? "Light Mode" : "Dark Mode"}
        </button>

        <Separator className="my-2" />

        {/* User info */}
        <div className="px-3 py-2">
          <p className="text-xs text-muted-foreground">Login sebagai</p>
          <p className="text-sm font-semibold text-foreground">{profile?.nama ?? ""}</p>
          <p className="text-xs text-muted-foreground">
            {profile?.role === "SUPERADMIN_PESANTREN"
              ? "Admin Pesantren"
              : profile?.role === "ADMIN_UNIT"
              ? `Admin Unit · ${unitKerja?.nama ?? ""}`
              : profile?.role ?? ""}
          </p>
        </div>

        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium text-destructive hover:bg-destructive/10 transition-all"
        >
          <LogOut className="w-4 h-4" /> Keluar
        </button>

        <p className="text-xs text-muted-foreground mt-2 px-3">v1.0.0 · 2026</p>
      </div>
    </aside>
  )
}
