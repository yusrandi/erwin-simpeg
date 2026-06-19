CREATE TABLE laba_rugi_kategori (
  id BIGSERIAL PRIMARY KEY,
  akun_kode TEXT NOT NULL UNIQUE,
  akun_nama TEXT NOT NULL,
  tipe TEXT NOT NULL CHECK (tipe IN ('PENDAPATAN','BEBAN'))
);

ALTER TABLE laba_rugi_kategori ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON laba_rugi_kategori FOR ALL USING (true) WITH CHECK (true);
