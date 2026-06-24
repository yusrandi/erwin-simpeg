import { Outlet, NavLink, useNavigate } from "react-router-dom"
import { useAuth } from "@/hooks/useAuth"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import { LayoutDashboard, Building2, Users, LogOut, Sun, Moon, CreditCard } from "lucide-react"
import { useState, useEffect } from "react"
import { Toaster } from "@/components/ui/toaster"

const navItems = [
  { to: "/platform", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/platform/pesantren", icon: Building2, label: "Pesantren" },
  { to: "/platform/users", icon: Users, label: "Users" },
  { to: "/platform/pembayaran", icon: CreditCard, label: "Verifikasi Pembayaran" },
]

export default function PlatformLayout() {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()
  const [theme, setTheme] = useState<"light" | "dark">(
    () => (localStorage.getItem("theme") as "light" | "dark") || "light"
  )

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark")
    localStorage.setItem("theme", theme)
  }, [theme])

  async function handleLogout() {
    await signOut()
    navigate("/login", { replace: true })
  }

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="w-64 min-h-screen bg-background border-r border-border flex flex-col fixed left-0 top-0 z-40">
        <div className="p-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-foreground rounded-lg flex items-center justify-center">
              <Building2 className="w-5 h-5 text-background" />
            </div>
            <div>
              <p className="font-bold text-sm text-foreground">SIMPEG</p>
              <p className="text-xs text-muted-foreground">Platform Admin</p>
            </div>
          </div>
        </div>

        <Separator />

        <nav className="flex-1 p-4 space-y-1">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 pb-2">
            Menu
          </p>
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/platform"}
              className={({ isActive }) => cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all",
                isActive
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>

        <Separator />

        <div className="p-4 space-y-1">
          <button
            onClick={() => setTheme(t => t === "light" ? "dark" : "light")}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
          >
            {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            {theme === "dark" ? "Light Mode" : "Dark Mode"}
          </button>

          <Separator className="my-2" />

          <div className="px-3 py-2">
            <p className="text-xs text-muted-foreground">Login sebagai</p>
            <p className="text-sm font-semibold text-foreground">{profile?.nama}</p>
            <p className="text-xs text-muted-foreground">Superadmin Platform</p>
          </div>

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium text-destructive hover:bg-destructive/10 transition-all"
          >
            <LogOut className="w-4 h-4" /> Keluar
          </button>
        </div>
      </aside>

      <main className="flex-1 ml-64 p-8">
        <Outlet />
      </main>
      <Toaster />
    </div>
  )
}
