-- ============================================
-- 1. PESANTREN
-- ============================================
CREATE TABLE pesantren (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nama        TEXT NOT NULL,
  kode        TEXT UNIQUE NOT NULL,
  alamat      TEXT,
  telepon     TEXT,
  email       TEXT,
  logo_url    TEXT,
  status      TEXT DEFAULT 'PENDING'
              CHECK (status IN ('PENDING','AKTIF','NONAKTIF')),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 2. UNIT KERJA
-- ============================================
CREATE TABLE unit_kerja (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pesantren_id  UUID NOT NULL REFERENCES pesantren(id) ON DELETE CASCADE,
  nama          TEXT NOT NULL,
  jenis         TEXT NOT NULL,
  status        TEXT DEFAULT 'AKTIF'
                CHECK (status IN ('AKTIF','NONAKTIF')),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 3. PROFILES
-- ============================================
CREATE TABLE profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  pesantren_id  UUID REFERENCES pesantren(id) ON DELETE CASCADE,
  unit_kerja_id UUID REFERENCES unit_kerja(id) ON DELETE SET NULL,
  nama          TEXT NOT NULL,
  role          TEXT NOT NULL CHECK (role IN (
                  'SUPERADMIN_PLATFORM',
                  'SUPERADMIN_PESANTREN',
                  'ADMIN_UNIT'
                )),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 4. MASTER AKUN
-- ============================================
CREATE TABLE master_akun (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pesantren_id  UUID NOT NULL REFERENCES pesantren(id) ON DELETE CASCADE,
  unit_kerja_id UUID NOT NULL REFERENCES unit_kerja(id) ON DELETE CASCADE,
  kode          TEXT NOT NULL,
  nama          TEXT NOT NULL,
  kelompok      TEXT NOT NULL CHECK (kelompok IN (
                  'ASET','KEWAJIBAN','MODAL','PENDAPATAN','BEBAN'
                )),
  tipe_normal   TEXT NOT NULL CHECK (tipe_normal IN ('DEBIT','KREDIT')),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_kode_per_unit UNIQUE (kode, unit_kerja_id)
);

-- ============================================
-- 5. PEGAWAI
-- ============================================
CREATE TABLE pegawai (
  id                  BIGSERIAL PRIMARY KEY,
  pesantren_id        UUID NOT NULL REFERENCES pesantren(id) ON DELETE CASCADE,
  unit_kerja_id       UUID NOT NULL REFERENCES unit_kerja(id) ON DELETE CASCADE,
  nama_pegawai        TEXT NOT NULL,
  id_nip              TEXT NOT NULL,
  pendidikan_terakhir TEXT,
  jenis_kelamin       TEXT CHECK (jenis_kelamin IN ('LAKI-LAKI','PEREMPUAN')),
  jabatan             TEXT,
  tahun_masuk         INT,
  tahun_keluar        INT,
  status_pegawai      TEXT CHECK (status_pegawai IN ('TETAP','TIDAK TETAP')),
  menikah             TEXT CHECK (menikah IN ('MENIKAH','BELUM MENIKAH')),
  aktif               TEXT CHECK (aktif IN ('AKTIF','NON AKTIF')),
  masa_aktif          TEXT,
  jalur_masuk         TEXT CHECK (jalur_masuk IN ('REKRUTMEN','ALUMNI PTH','LAINNYA')),
  email               TEXT,
  hp                  TEXT,
  catatan             TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_nip_per_unit UNIQUE (id_nip, unit_kerja_id)
);

-- ============================================
-- 6. JURNAL UMUM
-- ============================================
CREATE TABLE jurnal_umum (
  id            BIGSERIAL PRIMARY KEY,
  pesantren_id  UUID NOT NULL REFERENCES pesantren(id) ON DELETE CASCADE,
  unit_kerja_id UUID NOT NULL REFERENCES unit_kerja(id) ON DELETE CASCADE,
  tanggal       DATE NOT NULL,
  no_jurnal     TEXT NOT NULL,
  keterangan    TEXT NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_no_jurnal_per_unit UNIQUE (no_jurnal, unit_kerja_id)
);

-- ============================================
-- 7. JURNAL DETAIL
-- ============================================
CREATE TABLE jurnal_detail (
  id          BIGSERIAL PRIMARY KEY,
  jurnal_id   BIGINT NOT NULL REFERENCES jurnal_umum(id) ON DELETE CASCADE,
  akun_kode   TEXT NOT NULL,
  debit       NUMERIC(15,2) DEFAULT 0,
  kredit      NUMERIC(15,2) DEFAULT 0
);

-- ============================================
-- 8. ARUS KAS KATEGORI
-- ============================================
CREATE TABLE arus_kas_kategori (
  id            BIGSERIAL PRIMARY KEY,
  unit_kerja_id UUID NOT NULL REFERENCES unit_kerja(id) ON DELETE CASCADE,
  akun_kode     TEXT NOT NULL,
  aktivitas     TEXT NOT NULL CHECK (aktivitas IN ('OPERASIONAL','INVESTASI','PENDANAAN')),
  tipe_kas      TEXT NOT NULL CHECK (tipe_kas IN ('MASUK','KELUAR')),
  CONSTRAINT unique_akun_per_unit UNIQUE (akun_kode, unit_kerja_id)
);

-- ============================================
-- 9. HELPER FUNCTIONS
-- ============================================
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS TEXT AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION get_my_pesantren_id()
RETURNS UUID AS $$
  SELECT pesantren_id FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION get_my_unit_kerja_id()
RETURNS UUID AS $$
  SELECT unit_kerja_id FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================
-- 10. ENABLE RLS
-- ============================================
ALTER TABLE pesantren          ENABLE ROW LEVEL SECURITY;
ALTER TABLE unit_kerja         ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles           ENABLE ROW LEVEL SECURITY;
ALTER TABLE master_akun        ENABLE ROW LEVEL SECURITY;
ALTER TABLE pegawai            ENABLE ROW LEVEL SECURITY;
ALTER TABLE jurnal_umum        ENABLE ROW LEVEL SECURITY;
ALTER TABLE jurnal_detail      ENABLE ROW LEVEL SECURITY;
ALTER TABLE arus_kas_kategori  ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 11. RLS POLICIES — PESANTREN
-- ============================================
CREATE POLICY "platform_all" ON pesantren FOR ALL
  TO authenticated
  USING (get_my_role() = 'SUPERADMIN_PLATFORM')
  WITH CHECK (get_my_role() = 'SUPERADMIN_PLATFORM');

CREATE POLICY "pesantren_read_own" ON pesantren FOR SELECT
  TO authenticated
  USING (id = get_my_pesantren_id());

-- ============================================
-- 12. RLS POLICIES — UNIT KERJA
-- ============================================
CREATE POLICY "platform_all" ON unit_kerja FOR ALL
  TO authenticated
  USING (get_my_role() = 'SUPERADMIN_PLATFORM')
  WITH CHECK (get_my_role() = 'SUPERADMIN_PLATFORM');

CREATE POLICY "superadmin_pesantren_all" ON unit_kerja FOR ALL
  TO authenticated
  USING (
    pesantren_id = get_my_pesantren_id()
    AND get_my_role() = 'SUPERADMIN_PESANTREN'
  )
  WITH CHECK (
    pesantren_id = get_my_pesantren_id()
    AND get_my_role() = 'SUPERADMIN_PESANTREN'
  );

CREATE POLICY "admin_unit_read" ON unit_kerja FOR SELECT
  TO authenticated
  USING (id = get_my_unit_kerja_id());

-- ============================================
-- 13. RLS POLICIES — PROFILES
-- ============================================
CREATE POLICY "own_profile" ON profiles FOR ALL
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "platform_all" ON profiles FOR ALL
  TO authenticated
  USING (get_my_role() = 'SUPERADMIN_PLATFORM')
  WITH CHECK (get_my_role() = 'SUPERADMIN_PLATFORM');

CREATE POLICY "superadmin_pesantren_manage" ON profiles FOR ALL
  TO authenticated
  USING (
    pesantren_id = get_my_pesantren_id()
    AND get_my_role() = 'SUPERADMIN_PESANTREN'
  )
  WITH CHECK (
    pesantren_id = get_my_pesantren_id()
    AND get_my_role() = 'SUPERADMIN_PESANTREN'
  );

-- ============================================
-- 14. RLS POLICIES — MASTER AKUN
-- ============================================
CREATE POLICY "platform_all" ON master_akun FOR ALL
  TO authenticated
  USING (get_my_role() = 'SUPERADMIN_PLATFORM')
  WITH CHECK (get_my_role() = 'SUPERADMIN_PLATFORM');

CREATE POLICY "superadmin_pesantren_all" ON master_akun FOR ALL
  TO authenticated
  USING (
    pesantren_id = get_my_pesantren_id()
    AND get_my_role() = 'SUPERADMIN_PESANTREN'
  )
  WITH CHECK (
    pesantren_id = get_my_pesantren_id()
    AND get_my_role() = 'SUPERADMIN_PESANTREN'
  );

CREATE POLICY "admin_unit_own" ON master_akun FOR ALL
  TO authenticated
  USING (
    unit_kerja_id = get_my_unit_kerja_id()
    AND get_my_role() = 'ADMIN_UNIT'
  )
  WITH CHECK (
    unit_kerja_id = get_my_unit_kerja_id()
    AND get_my_role() = 'ADMIN_UNIT'
  );

-- ============================================
-- 15. RLS POLICIES — PEGAWAI
-- ============================================
CREATE POLICY "platform_all" ON pegawai FOR ALL
  TO authenticated
  USING (get_my_role() = 'SUPERADMIN_PLATFORM')
  WITH CHECK (get_my_role() = 'SUPERADMIN_PLATFORM');

CREATE POLICY "superadmin_pesantren_all" ON pegawai FOR ALL
  TO authenticated
  USING (
    pesantren_id = get_my_pesantren_id()
    AND get_my_role() = 'SUPERADMIN_PESANTREN'
  )
  WITH CHECK (
    pesantren_id = get_my_pesantren_id()
    AND get_my_role() = 'SUPERADMIN_PESANTREN'
  );

CREATE POLICY "admin_unit_own" ON pegawai FOR ALL
  TO authenticated
  USING (
    unit_kerja_id = get_my_unit_kerja_id()
    AND get_my_role() = 'ADMIN_UNIT'
  )
  WITH CHECK (
    unit_kerja_id = get_my_unit_kerja_id()
    AND get_my_role() = 'ADMIN_UNIT'
  );

-- ============================================
-- 16. RLS POLICIES — JURNAL UMUM
-- ============================================
CREATE POLICY "platform_all" ON jurnal_umum FOR ALL
  TO authenticated
  USING (get_my_role() = 'SUPERADMIN_PLATFORM')
  WITH CHECK (get_my_role() = 'SUPERADMIN_PLATFORM');

CREATE POLICY "superadmin_pesantren_all" ON jurnal_umum FOR ALL
  TO authenticated
  USING (
    pesantren_id = get_my_pesantren_id()
    AND get_my_role() = 'SUPERADMIN_PESANTREN'
  )
  WITH CHECK (
    pesantren_id = get_my_pesantren_id()
    AND get_my_role() = 'SUPERADMIN_PESANTREN'
  );

CREATE POLICY "admin_unit_own" ON jurnal_umum FOR ALL
  TO authenticated
  USING (
    unit_kerja_id = get_my_unit_kerja_id()
    AND get_my_role() = 'ADMIN_UNIT'
  )
  WITH CHECK (
    unit_kerja_id = get_my_unit_kerja_id()
    AND get_my_role() = 'ADMIN_UNIT'
  );

-- ============================================
-- 17. RLS POLICIES — JURNAL DETAIL
-- ============================================
CREATE POLICY "access_via_jurnal" ON jurnal_detail FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM jurnal_umum j
      WHERE j.id = jurnal_detail.jurnal_id
      AND (
        get_my_role() = 'SUPERADMIN_PLATFORM'
        OR j.pesantren_id = get_my_pesantren_id()
        OR j.unit_kerja_id = get_my_unit_kerja_id()
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM jurnal_umum j
      WHERE j.id = jurnal_detail.jurnal_id
      AND (
        get_my_role() = 'SUPERADMIN_PLATFORM'
        OR j.pesantren_id = get_my_pesantren_id()
        OR j.unit_kerja_id = get_my_unit_kerja_id()
      )
    )
  );

-- ============================================
-- 18. RLS POLICIES — ARUS KAS KATEGORI
-- ============================================
CREATE POLICY "platform_all" ON arus_kas_kategori FOR ALL
  TO authenticated
  USING (get_my_role() = 'SUPERADMIN_PLATFORM')
  WITH CHECK (get_my_role() = 'SUPERADMIN_PLATFORM');

CREATE POLICY "superadmin_pesantren_all" ON arus_kas_kategori FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM unit_kerja u
      WHERE u.id = arus_kas_kategori.unit_kerja_id
      AND u.pesantren_id = get_my_pesantren_id()
    )
    AND get_my_role() = 'SUPERADMIN_PESANTREN'
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM unit_kerja u
      WHERE u.id = arus_kas_kategori.unit_kerja_id
      AND u.pesantren_id = get_my_pesantren_id()
    )
    AND get_my_role() = 'SUPERADMIN_PESANTREN'
  );

CREATE POLICY "admin_unit_own" ON arus_kas_kategori FOR ALL
  TO authenticated
  USING (
    unit_kerja_id = get_my_unit_kerja_id()
    AND get_my_role() = 'ADMIN_UNIT'
  )
  WITH CHECK (
    unit_kerja_id = get_my_unit_kerja_id()
    AND get_my_role() = 'ADMIN_UNIT'
  );

  -- Allow insert pesantren saat registrasi (tanpa cek role)
CREATE POLICY "public_register_pesantren" ON pesantren
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Allow insert profile sendiri saat registrasi
CREATE POLICY "public_register_profile" ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

-- ============================================
-- 19. SUPERADMIN PLATFORM PERTAMA
-- Jalankan ini SETELAH register user via Supabase Auth
-- Ganti 'email@anda.com' dengan email yang sudah register
-- ============================================
-- INSERT INTO profiles (id, nama, role)
-- SELECT id, 'Super Admin', 'SUPERADMIN_PLATFORM'
-- FROM auth.users WHERE email = 'email@anda.com';

-- Pastikan ada FK dari jurnal_detail.akun_kode ke master_akun.kode
-- Tapi karena master_akun.kode bukan PK (PK-nya id UUID),
-- kita perlu unique constraint dulu

-- Cek dulu apakah sudah ada
ALTER TABLE master_akun ADD CONSTRAINT master_akun_kode_unit_unique
  UNIQUE (kode, unit_kerja_id);

-- Untuk join di Supabase, lebih mudah simpan master_akun_id di jurnal_detail
-- Tambah kolom master_akun_id (nullable untuk backward compat)
ALTER TABLE jurnal_detail
  ADD COLUMN IF NOT EXISTS master_akun_id UUID REFERENCES master_akun(id);
