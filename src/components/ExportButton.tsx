import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { FileText, Sheet, Download } from "lucide-react"
import { exportPDF, exportExcel } from "@/lib/laporanHelper"
import type { OpsiLaporan } from "@/lib/laporanHelper"

interface Props {
  opsi: OpsiLaporan
  disabled?: boolean
}

export function ExportButton({ opsi, disabled }: Props) {
  const [open, setOpen] = useState(false)

  function handlePDF() {
    exportPDF(opsi)
    setOpen(false)
  }

  function handleExcel() {
    exportExcel(opsi)
    setOpen(false)
  }

  return (
    <>
      <Button
        variant="outline" size="sm"
        onClick={() => setOpen(true)}
        disabled={disabled || opsi.data.length === 0}
      >
        <Download className="w-4 h-4 mr-2" /> Export
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle>Export Laporan</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              onClick={handlePDF}
              className="flex flex-col items-center gap-3 p-5 rounded-xl border-2 border-slate-200 dark:border-slate-700 hover:border-red-400 dark:hover:border-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-all group"
            >
              <FileText className="w-8 h-8 text-red-500 group-hover:scale-110 transition-transform" />
              <span className="text-sm font-semibold text-foreground">PDF</span>
              <span className="text-xs text-muted-foreground text-center">Siap cetak, format A4</span>
            </button>
            <button
              onClick={handleExcel}
              className="flex flex-col items-center gap-3 p-5 rounded-xl border-2 border-slate-200 dark:border-slate-700 hover:border-green-400 dark:hover:border-green-500 hover:bg-green-50 dark:hover:bg-green-950/20 transition-all group"
            >
              <Sheet className="w-8 h-8 text-green-600 group-hover:scale-110 transition-transform" />
              <span className="text-sm font-semibold text-foreground">Excel</span>
              <span className="text-xs text-muted-foreground text-center">Format .xlsx, bisa diedit</span>
            </button>
          </div>
          <p className="text-xs text-muted-foreground text-center pt-1">
            {opsi.data.length} baris data akan diekspor
          </p>
        </DialogContent>
      </Dialog>
    </>
  )
}
