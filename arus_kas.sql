CREATE TABLE arus_kas_kategori (
  id BIGSERIAL PRIMARY KEY,
  akun_kode TEXT NOT NULL UNIQUE,
  akun_nama TEXT NOT NULL,
  aktivitas TEXT NOT NULL CHECK (aktivitas IN ('OPERASIONAL','INVESTASI','PENDANAAN')),
  tipe TEXT NOT NULL CHECK (tipe IN ('MASUK','KELUAR'))
);

ALTER TABLE arus_kas_kategori ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON arus_kas_kategori FOR ALL USING (true) WITH CHECK (true);
