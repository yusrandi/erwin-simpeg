import { NavLink } from "react-router-dom"
import { LayoutDashboard, Users, UserPlus, BarChart3, Settings, Building2, Sun, Moon } from "lucide-react"
import { cn } from "@/lib/utils"
import { Separator } from "@/components/ui/separator"
import { useState, useEffect } from "react"

const navItems = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/pegawai", icon: Users, label: "Data Pegawai" },
  { to: "/tambah", icon: UserPlus, label: "Tambah Pegawai" },
  { to: "/statistik", icon: BarChart3, label: "Statistik" },
]

export function Sidebar() {
  const [theme, setTheme] = useState<"light" | "dark">(
    () => (localStorage.getItem("theme") as "light" | "dark") || "light"
  )

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark")
    localStorage.setItem("theme", theme)
  }, [theme])

  const toggle = () => setTheme(t => t === "light" ? "dark" : "light")

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
            <p className="text-xs text-muted-foreground leading-tight">Sistem Informasi Pegawai</p>
          </div>
        </div>
      </div>

      <Separator />

      {/* Nav */}
      <nav className="flex-1 p-4 space-y-1">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 pb-2">
          Menu Utama
        </p>
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all duration-150",
                isActive
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )
            }
          >
            <Icon className="w-4 h-4 shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>

      <Separator />

      <div className="p-4 space-y-1">
        <NavLink
          to="/pengaturan"
          className={({ isActive }) =>
            cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all",
              isActive
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )
          }
        >
          <Settings className="w-4 h-4" />
          Pengaturan
        </NavLink>

        {/* Dark mode toggle */}
        <button
          onClick={toggle}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
        >
          {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          {theme === "dark" ? "Light Mode" : "Dark Mode"}
        </button>

        <p className="text-xs text-muted-foreground mt-2 px-3">v1.0.0 · 2026</p>
      </div>
    </aside>
  )
}
