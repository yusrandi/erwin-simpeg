import { Outlet } from "react-router-dom"
import { Sidebar } from "@/components/Sidebar"
import { Toaster } from "@/components/ui/toaster"

export default function Layout() {
  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <main className="flex-1 ml-64 p-8">
        <Outlet />
      </main>
      <Toaster />
    </div>
  )
}
