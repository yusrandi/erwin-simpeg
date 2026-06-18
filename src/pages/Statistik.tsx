import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3 } from "lucide-react";
import type { Pegawai } from "@/types/pegawai";

// --- A clean bar item with primary color (shadcn style) ---
function BarItem({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = max ? (value / max) * 100 : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm font-medium text-muted-foreground w-32 text-right shrink-0">
        {label}
      </span>
      <div className="flex-1 bg-muted rounded-full h-5 relative overflow-hidden">
        <div
          className="h-5 bg-primary rounded-full transition-all duration-500 flex items-center justify-end pr-2 text-primary-foreground text-xs font-semibold"
          style={{ width: `${pct}%` }}
        >
          {value}
        </div>
      </div>
    </div>
  );
}

export default function Statistik() {
  const [data, setData] = useState<Pegawai[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("pegawai")
      .select("*")
      .then(({ data: rows }) => {
        setData(rows ?? []);
        setLoading(false);
      });
  }, []);

  if (loading)
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );

  // --- Compute stats ---
  const jabatanMap: Record<string, number> = {};
  data.forEach((d) => {
    jabatanMap[d.jabatan] = (jabatanMap[d.jabatan] || 0) + 1;
  });
  const jabatanStats = Object.entries(jabatanMap).sort((a, b) => b[1] - a[1]);
  const maxJabatan = Math.max(...jabatanStats.map((j) => j[1]));

  const unitMap: Record<string, number> = {};
  data.forEach((d) => {
    unitMap[d.unit_kerja] = (unitMap[d.unit_kerja] || 0) + 1;
  });
  const unitStats = Object.entries(unitMap).sort((a, b) => b[1] - a[1]);
  const maxUnit = Math.max(...unitStats.map((u) => u[1]));

  const didikMap: Record<string, number> = {};
  data.forEach((d) => {
    didikMap[d.pendidikan_terakhir] = (didikMap[d.pendidikan_terakhir] || 0) + 1;
  });
  const didikStats = Object.entries(didikMap).sort((a, b) => b[1] - a[1]);
  const maxDidik = Math.max(...didikStats.map((d) => d[1]));

  const tahunMap: Record<number, number> = {};
  data.forEach((d) => {
    tahunMap[d.tahun_masuk] = (tahunMap[d.tahun_masuk] || 0) + 1;
  });
  const tahunStats = Object.entries(tahunMap)
    .sort((a, b) => Number(a[0]) - Number(b[0]));
  const maxTahun = Math.max(...tahunStats.map((t) => t[1]));

  const jalurMap: Record<string, number> = {};
  data.forEach((d) => {
    jalurMap[d.jalur_masuk] = (jalurMap[d.jalur_masuk] || 0) + 1;
  });
  const jalurStats = Object.entries(jalurMap).sort((a, b) => b[1] - a[1]);
  const maxJalur = Math.max(...jalurStats.map((j) => j[1]));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Statistik</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Analisis data kepegawaian secara visual
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Jabatan */}
        <Card className="border shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-muted-foreground" />
              Berdasarkan Jabatan
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {jabatanStats.map(([jabatan, count]) => (
              <BarItem key={jabatan} label={jabatan} value={count} max={maxJabatan} />
            ))}
          </CardContent>
        </Card>

        {/* Unit Kerja */}
        <Card className="border shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-muted-foreground" />
              Berdasarkan Unit Kerja
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {unitStats.map(([unit, count]) => (
              <BarItem key={unit} label={unit} value={count} max={maxUnit} />
            ))}
          </CardContent>
        </Card>

        {/* Pendidikan */}
        <Card className="border shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-muted-foreground" />
              Berdasarkan Pendidikan
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {didikStats.map(([didik, count]) => (
              <BarItem key={didik} label={didik} value={count} max={maxDidik} />
            ))}
          </CardContent>
        </Card>

        {/* Jalur Masuk */}
        <Card className="border shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-muted-foreground" />
              Berdasarkan Jalur Masuk
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {jalurStats.map(([jalur, count]) => (
              <BarItem key={jalur} label={jalur} value={count} max={maxJalur} />
            ))}
          </CardContent>
        </Card>

        {/* Tahun Masuk (full width) */}
        <Card className="lg:col-span-2 border shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-muted-foreground" />
              Rekrutmen per Tahun
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {tahunStats.map(([tahun, count]) => (
              <BarItem key={tahun} label={tahun} value={count} max={maxTahun} />
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Summary Cards */}
      <Card className="border shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Ringkasan Komposisi</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Total Pegawai", value: data.length },
              {
                label: "% Aktif",
                value: `${Math.round(
                  (data.filter((d) => d.aktif === "AKTIF").length / data.length) * 100
                )}%`,
              },
              {
                label: "% Tetap",
                value: `${Math.round(
                  (data.filter((d) => d.status_pegawai === "TETAP").length / data.length) * 100
                )}%`,
              },
              {
                label: "% Menikah",
                value: `${Math.round(
                  (data.filter((d) => d.menikah === "MENIKAH").length / data.length) * 100
                )}%`,
              },
            ].map((item) => (
              <div
                key={item.label}
                className="text-center p-4 bg-muted/50 rounded-lg border"
              >
                <p className="text-3xl font-bold tracking-tight">{item.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{item.label}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
