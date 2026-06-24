import { useLangganan } from "@/hooks/useLangganan"
import { Outlet, useNavigate } from "react-router-dom"
import { Clock, AlertCircle } from "lucide-react"
import { Sidebar } from "./Sidebar"
import { Toaster } from "./ui/toaster"

export default function Layout() {
  const { sisaHariTrial, isTrialExpired, langganan } = useLangganan()
  const navigate = useNavigate()

  const showBanner = langganan?.status === "TRIAL"

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 ml-64">
        {/* Banner trial */}
        {showBanner && (
          <div className={`px-8 py-2.5 flex items-center justify-between text-sm ${
            isTrialExpired || sisaHariTrial <= 3
              ? "bg-destructive text-destructive-foreground"
              : "bg-yellow-500 text-white"
          }`}>
            <div className="flex items-center gap-2">
              {isTrialExpired
                ? <AlertCircle className="w-4 h-4 shrink-0" />
                : <Clock className="w-4 h-4 shrink-0" />}
              <span>
                {isTrialExpired
                  ? "Trial Anda telah berakhir. Silakan pilih paket untuk melanjutkan."
                  : `Trial berakhir dalam ${sisaHariTrial} hari. Segera pilih paket.`}
              </span>
            </div>
            <button
              onClick={() => navigate("/upgrade")}
              className="font-semibold underline underline-offset-2 hover:no-underline shrink-0 ml-4"
            >
              Upgrade Sekarang →
            </button>
          </div>
        )}
        <div className="p-8">
          <Outlet />
        </div>
      </main>
      <Toaster />
    </div>
  )
}
