import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import * as XLSX from "xlsx"

// ── Tipe ──────────────────────────────────────────────────
export interface KolomLaporan {
  header: string
  key: string
  width?: number
  align?: "left" | "right" | "center"
  format?: (val: any) => string
}

export interface OpsiLaporan {
  judul: string
  subjudul?: string
  namaFile: string
  kolom: KolomLaporan[]
  data: Record<string, any>[]
  footer?: string
}

// ── Format angka ──────────────────────────────────────────


// ── Export PDF ────────────────────────────────────────────
export function exportPDF(opsi: OpsiLaporan) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" })

  // Header
  doc.setFontSize(16)
  doc.setFont("helvetica", "bold")
  doc.text(opsi.judul, 14, 18)

  if (opsi.subjudul) {
    doc.setFontSize(10)
    doc.setFont("helvetica", "normal")
    doc.setTextColor(100)
    doc.text(opsi.subjudul, 14, 25)
  }

  // Tanggal cetak
  doc.setFontSize(9)
  doc.setTextColor(150)
  doc.text(
    `Dicetak: ${new Date().toLocaleDateString("id-ID", { dateStyle: "long" })}`,
    doc.internal.pageSize.width - 14,
    18,
    { align: "right" }
  )

  // Tabel
  const headers = opsi.kolom.map(k => k.header)
  const rows = opsi.data.map(row =>
    opsi.kolom.map(k => {
      const val = row[k.key]
      return k.format ? k.format(val) : (val ?? "-")
    })
  )

  autoTable(doc, {
    head: [headers],
    body: rows,
    startY: opsi.subjudul ? 30 : 24,
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [15, 23, 42], textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: opsi.kolom.reduce((acc, k, i) => {
      acc[i] = { halign: k.align ?? "left" }
      return acc
    }, {} as Record<number, any>),
    didDrawPage: (data) => {
      // Footer per halaman
      const pageCount = (doc.internal as any).getNumberOfPages()
      doc.setFontSize(8)
      doc.setTextColor(150)
      doc.text(
        `Halaman ${data.pageNumber} dari ${pageCount}`,
        doc.internal.pageSize.width / 2,
        doc.internal.pageSize.height - 8,
        { align: "center" }
      )
      if (opsi.footer) {
        doc.text(opsi.footer, 14, doc.internal.pageSize.height - 8)
      }
    },
  })

  doc.save(`${opsi.namaFile}.pdf`)
}

// ── Export Excel ──────────────────────────────────────────
export function exportExcel(opsi: OpsiLaporan) {
  const wsData = [
    // Judul
    [opsi.judul],
    opsi.subjudul ? [opsi.subjudul] : [],
    [`Dicetak: ${new Date().toLocaleDateString("id-ID", { dateStyle: "long" })}`],
    [], // baris kosong
    // Header kolom
    opsi.kolom.map(k => k.header),
    // Data
    ...opsi.data.map(row =>
      opsi.kolom.map(k => {
        const val = row[k.key]
        return k.format ? k.format(val) : (val ?? "-")
      })
    ),
  ].filter(row => row.length > 0)

  const ws = XLSX.utils.aoa_to_sheet(wsData)

  // Style header kolom (baris ke-5 setelah judul+gap)
//   const headerRowIdx = opsi.subjudul ? 4 : 3

  // Lebar kolom otomatis
  ws["!cols"] = opsi.kolom.map(k => ({ wch: k.width ?? 20 }))

  // Merge judul
  ws["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: opsi.kolom.length - 1 } }]

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, "Laporan")
  XLSX.writeFile(wb, `${opsi.namaFile}.xlsx`)
}
