-- Hapus tabel lama
DROP TABLE IF EXISTS arus_kas_kategori;
DROP TABLE IF EXISTS laba_rugi_kategori;

-- Master akun (sumber utama)
CREATE TABLE master_akun (
  kode TEXT PRIMARY KEY,
  nama TEXT NOT NULL,
  kelompok TEXT NOT NULL CHECK (kelompok IN (
    'ASET','KEWAJIBAN','MODAL','PENDAPATAN','BEBAN'
  )),
  tipe_normal TEXT NOT NULL CHECK (tipe_normal IN ('DEBIT','KREDIT'))
);

-- Arus kas: hanya tambah kolom aktivitas & tipe_kas
CREATE TABLE arus_kas_kategori (
  id BIGSERIAL PRIMARY KEY,
  akun_kode TEXT NOT NULL UNIQUE REFERENCES master_akun(kode),
  aktivitas TEXT NOT NULL CHECK (aktivitas IN ('OPERASIONAL','INVESTASI','PENDANAAN')),
  tipe_kas TEXT NOT NULL CHECK (tipe_kas IN ('MASUK','KELUAR'))
);

-- RLS
ALTER TABLE master_akun ENABLE ROW LEVEL SECURITY;
ALTER TABLE arus_kas_kategori ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON master_akun FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON arus_kas_kategori FOR ALL USING (true) WITH CHECK (true);
