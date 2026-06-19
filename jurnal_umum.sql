CREATE TABLE jurnal_umum (
  id BIGSERIAL PRIMARY KEY,
  tanggal DATE NOT NULL,
  no_jurnal TEXT NOT NULL UNIQUE,
  keterangan TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE jurnal_detail (
  id BIGSERIAL PRIMARY KEY,
  jurnal_id BIGINT REFERENCES jurnal_umum(id) ON DELETE CASCADE,
  akun_kode TEXT NOT NULL,
  akun_nama TEXT NOT NULL,
  debit NUMERIC(15,2) DEFAULT 0,
  kredit NUMERIC(15,2) DEFAULT 0
);

-- RLS
ALTER TABLE jurnal_umum ENABLE ROW LEVEL SECURITY;
ALTER TABLE jurnal_detail ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON jurnal_umum FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON jurnal_detail FOR ALL USING (true) WITH CHECK (true);
