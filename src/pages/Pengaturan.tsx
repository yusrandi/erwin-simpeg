import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Settings, Database } from "lucide-react"

export default function Pengaturan() {
  return (
    <div className="max-w-xl space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Pengaturan</h1>
        <p className="text-sm text-muted-foreground mt-1">Konfigurasi koneksi dan aplikasi</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Database className="w-4 h-4 text-blue-500" /> Konfigurasi Supabase
          </CardTitle>
          <CardDescription>
            Atur variabel environment di file <code className="text-xs bg-slate-100 px-1 py-0.5 rounded">.env</code> di root project Anda.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>VITE_SUPABASE_URL</Label>
            <Input readOnly value="https://xxxx.supabase.co" className="font-mono text-sm bg-slate-50" />
          </div>
          <div className="space-y-2">
            <Label>VITE_SUPABASE_ANON_KEY</Label>
            <Input readOnly value="eyJxxxxxxxx..." className="font-mono text-sm bg-slate-50" />
          </div>
          <div className="p-3 bg-blue-50 rounded-lg text-sm text-blue-800 space-y-1">
            <p className="font-semibold">Cara setup:</p>
            <ol className="list-decimal list-inside space-y-1 text-xs">
              <li>Buat project di <a href="https://supabase.com" target="_blank" rel="noreferrer" className="underline">supabase.com</a></li>
              <li>Buat tabel <code className="bg-blue-100 px-1 rounded">pegawai</code> dengan SQL di bawah</li>
              <li>Copy URL & anon key dari Project Settings → API</li>
              <li>Buat file <code className="bg-blue-100 px-1 rounded">.env</code> dan isi kedua variabel tersebut</li>
            </ol>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Settings className="w-4 h-4 text-slate-500" /> SQL Schema Tabel Pegawai
          </CardTitle>
          <CardDescription>Jalankan SQL ini di Supabase SQL Editor</CardDescription>
        </CardHeader>
        <CardContent>
          <pre className="bg-slate-900 text-green-400 text-xs p-4 rounded-lg overflow-x-auto leading-relaxed">
{`CREATE TABLE pegawai (
  id BIGSERIAL PRIMARY KEY,
  nama_pegawai TEXT NOT NULL,
  id_nip TEXT NOT NULL UNIQUE,
  pendidikan_terakhir TEXT,
  jenis_kelamin TEXT CHECK (
    jenis_kelamin IN ('LAKI-LAKI','PEREMPUAN')
  ),
  unit_kerja TEXT,
  jabatan TEXT,
  tahun_masuk INT,
  tahun_keluar INT,
  status_pegawai TEXT CHECK (
    status_pegawai IN ('TETAP','TIDAK TETAP')
  ),
  menikah TEXT CHECK (
    menikah IN ('MENIKAH','BELUM MENIKAH')
  ),
  aktif TEXT CHECK (
    aktif IN ('AKTIF','NON AKTIF')
  ),
  masa_aktif TEXT,
  jalur_masuk TEXT CHECK (
    jalur_masuk IN ('REKRUTMEN','ALUMNI PTH','LAINNYA')
  ),
  email TEXT,
  hp TEXT,
  catatan TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (opsional)
ALTER TABLE pegawai ENABLE ROW LEVEL SECURITY;

-- Policy: allow all (untuk development)
CREATE POLICY "Allow all" ON pegawai
  FOR ALL USING (true) WITH CHECK (true);`}
          </pre>
          <Button variant="outline" size="sm" className="mt-3" onClick={() => {
            navigator.clipboard.writeText(`CREATE TABLE pegawai (
  id BIGSERIAL PRIMARY KEY,
  nama_pegawai TEXT NOT NULL,
  id_nip TEXT NOT NULL UNIQUE,
  pendidikan_terakhir TEXT,
  jenis_kelamin TEXT CHECK (jenis_kelamin IN ('LAKI-LAKI','PEREMPUAN')),
  unit_kerja TEXT, jabatan TEXT,
  tahun_masuk INT, tahun_keluar INT,
  status_pegawai TEXT CHECK (status_pegawai IN ('TETAP','TIDAK TETAP')),
  menikah TEXT CHECK (menikah IN ('MENIKAH','BELUM MENIKAH')),
  aktif TEXT CHECK (aktif IN ('AKTIF','NON AKTIF')),
  masa_aktif TEXT,
  jalur_masuk TEXT CHECK (jalur_masuk IN ('REKRUTMEN','ALUMNI PTH','LAINNYA')),
  email TEXT, hp TEXT, catatan TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);`)
          }}>
            Salin SQL
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
