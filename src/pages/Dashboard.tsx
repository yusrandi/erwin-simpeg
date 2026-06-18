import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  UserCheck,
  UserX,
  Award,
  GraduationCap,
  Heart,
  TrendingUp,
  Building,
} from "lucide-react";
import type { Pegawai, StatsDashboard } from "@/types/pegawai";

// --- A clean, minimal stat card following shadcn/ui patterns ---
interface StatCardProps {
  title: string;
  value: number;
  icon: React.ElementType;
  subtitle?: string;
}

function StatCard({ title, value, icon: Icon, subtitle }: StatCardProps) {
  return (
    <Card className="border shadow-sm">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold tracking-tight">{value.toLocaleString()}</p>
            {subtitle && (
              <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
            )}
          </div>
          <div className="p-2 bg-muted rounded-md">
            <Icon className="w-5 h-5 text-muted-foreground" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState<StatsDashboard | null>(null);
  const [recent, setRecent] = useState<Pegawai[]>([]);
  const [unitStats, setUnitStats] = useState<{ unit: string; count: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from("pegawai").select("*");
      if (!data) return;

      const s: StatsDashboard = {
        total: data.length,
        aktif: data.filter((d) => d.aktif === "AKTIF").length,
        nonAktif: data.filter((d) => d.aktif === "NON AKTIF").length,
        tetap: data.filter((d) => d.status_pegawai === "TETAP").length,
        tidakTetap: data.filter((d) => d.status_pegawai === "TIDAK TETAP").length,
        lakiLaki: data.filter((d) => d.jenis_kelamin === "LAKI-LAKI").length,
        perempuan: data.filter((d) => d.jenis_kelamin === "PEREMPUAN").length,
      };
      setStats(s);
      setRecent(data.slice(-5).reverse());

      const unitMap: Record<string, number> = {};
      data.forEach((d) => {
        unitMap[d.unit_kerja] = (unitMap[d.unit_kerja] || 0) + 1;
      });
      setUnitStats(
        Object.entries(unitMap)
          .map(([unit, count]) => ({ unit, count }))
          .sort((a, b) => b.count - a.count)
      );
      setLoading(false);
    }
    load();
  }, []);

  if (loading)
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Ringkasan data kepegawaian
        </p>
      </div>

      {/* Stats Grid - First Row */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard title="Total Pegawai" value={stats?.total ?? 0} icon={Users} subtitle="Seluruh data" />
        <StatCard title="Pegawai Aktif" value={stats?.aktif ?? 0} icon={UserCheck} subtitle="Saat ini aktif" />
        <StatCard title="Non Aktif" value={stats?.nonAktif ?? 0} icon={UserX} subtitle="Tidak aktif" />
        <StatCard title="Status Tetap" value={stats?.tetap ?? 0} icon={Award} subtitle="Pegawai tetap" />
      </div>

      {/* Stats Grid - Second Row */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard title="Tidak Tetap" value={stats?.tidakTetap ?? 0} icon={TrendingUp} subtitle="Kontrak" />
        <StatCard title="Laki-laki" value={stats?.lakiLaki ?? 0} icon={Users} subtitle="Pria" />
        <StatCard title="Perempuan" value={stats?.perempuan ?? 0} icon={Heart} subtitle="Wanita" />
        <StatCard title="Unit Kerja" value={unitStats.length} icon={Building} subtitle="Jumlah unit" />
      </div>

      {/* Charts & Recent */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Unit Kerja */}
        <Card className="border shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Building className="w-4 h-4 text-muted-foreground" />
              Pegawai per Unit Kerja
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {unitStats.map(({ unit, count }) => {
              const pct = (count / (stats?.total || 1)) * 100;
              return (
                <div key={unit} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{unit}</span>
                    <span className="text-muted-foreground">{count}</span>
                  </div>
                  <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
            {unitStats.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                Belum ada data unit
              </p>
            )}
          </CardContent>
        </Card>

        {/* Pegawai Terbaru */}
        <Card className="border shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-muted-foreground" />
              Pegawai Terbaru
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {recent.map((p) => (
              <div key={p.id} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{p.nama_pegawai}</p>
                  <p className="text-xs text-muted-foreground">
                    {p.jabatan} · {p.unit_kerja}
                  </p>
                </div>
                <Badge variant={p.aktif === "AKTIF" ? "default" : "secondary"}>
                  {p.aktif}
                </Badge>
              </div>
            ))}
            {recent.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-6">
                Belum ada data pegawai
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
