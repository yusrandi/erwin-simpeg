-- ============================================
-- TABEL UTAMA
-- ============================================
CREATE TABLE pos_bayar (
  id              BIGSERIAL PRIMARY KEY,
  unit_kerja_id   UUID NOT NULL REFERENCES unit_kerja(id) ON DELETE CASCADE,
  pesantren_id    UUID NOT NULL REFERENCES pesantren(id) ON DELETE CASCADE,
  nama            TEXT NOT NULL,
  akun_kode       TEXT NOT NULL,
  keterangan      TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE jenis_bayar (
  id              BIGSERIAL PRIMARY KEY,
  unit_kerja_id   UUID NOT NULL REFERENCES unit_kerja(id) ON DELETE CASCADE,
  pesantren_id    UUID NOT NULL REFERENCES pesantren(id) ON DELETE CASCADE,
  nama            TEXT NOT NULL,
  akun_kode       TEXT NOT NULL,
  keterangan      TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE paket_pembayaran (
  id              BIGSERIAL PRIMARY KEY,
  unit_kerja_id   UUID NOT NULL REFERENCES unit_kerja(id) ON DELETE CASCADE,
  pesantren_id    UUID NOT NULL REFERENCES pesantren(id) ON DELETE CASCADE,
  nama            TEXT NOT NULL,
  keterangan      TEXT,
  aktif           BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE paket_detail (
  id              BIGSERIAL PRIMARY KEY,
  paket_id        BIGINT NOT NULL REFERENCES paket_pembayaran(id) ON DELETE CASCADE,
  pos_bayar_id    BIGINT NOT NULL REFERENCES pos_bayar(id),
  jumlah          NUMERIC(15,2) NOT NULL,
  periode         TEXT NOT NULL CHECK (periode IN ('BULANAN','TAHUNAN','SEKALI'))
);

CREATE TABLE pajak (
  id              BIGSERIAL PRIMARY KEY,
  unit_kerja_id   UUID NOT NULL REFERENCES unit_kerja(id) ON DELETE CASCADE,
  pesantren_id    UUID NOT NULL REFERENCES pesantren(id) ON DELETE CASCADE,
  nama            TEXT NOT NULL,
  persentase      NUMERIC(5,2) NOT NULL,
  akun_kode       TEXT NOT NULL,
  aktif           BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE unit_pos (
  id              BIGSERIAL PRIMARY KEY,
  unit_kerja_id   UUID NOT NULL REFERENCES unit_kerja(id) ON DELETE CASCADE,
  pesantren_id    UUID NOT NULL REFERENCES pesantren(id) ON DELETE CASCADE,
  nama            TEXT NOT NULL,
  kasir_id        UUID REFERENCES profiles(id),
  aktif           BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE kas_transaksi (
  id              BIGSERIAL PRIMARY KEY,
  unit_kerja_id   UUID NOT NULL REFERENCES unit_kerja(id) ON DELETE CASCADE,
  pesantren_id    UUID NOT NULL REFERENCES pesantren(id) ON DELETE CASCADE,
  jurnal_id       BIGINT REFERENCES jurnal_umum(id),
  tipe            TEXT NOT NULL CHECK (tipe IN (
                    'SALDO_AWAL','KAS_MASUK','KAS_KELUAR','TRANSFER'
                  )),
  tanggal         DATE NOT NULL,
  no_transaksi    TEXT NOT NULL,
  akun_kas_id     TEXT NOT NULL,
  akun_lawan_id   TEXT NOT NULL,
  jumlah          NUMERIC(15,2) NOT NULL,
  keterangan      TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE rekonsiliasi_bank (
  id              BIGSERIAL PRIMARY KEY,
  unit_kerja_id   UUID NOT NULL REFERENCES unit_kerja(id) ON DELETE CASCADE,
  pesantren_id    UUID NOT NULL REFERENCES pesantren(id) ON DELETE CASCADE,
  akun_kas_id     TEXT NOT NULL,
  periode         DATE NOT NULL,
  saldo_sistem    NUMERIC(15,2) NOT NULL,
  saldo_buku      NUMERIC(15,2) NOT NULL,
  selisih         NUMERIC(15,2) GENERATED ALWAYS AS (saldo_buku - saldo_sistem) STORED,
  catatan         TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE pos_hutang (
  id              BIGSERIAL PRIMARY KEY,
  unit_kerja_id   UUID NOT NULL REFERENCES unit_kerja(id) ON DELETE CASCADE,
  pesantren_id    UUID NOT NULL REFERENCES pesantren(id) ON DELETE CASCADE,
  nama            TEXT NOT NULL,
  akun_kode       TEXT NOT NULL,
  keterangan      TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE hutang (
  id              BIGSERIAL PRIMARY KEY,
  unit_kerja_id   UUID NOT NULL REFERENCES unit_kerja(id) ON DELETE CASCADE,
  pesantren_id    UUID NOT NULL REFERENCES pesantren(id) ON DELETE CASCADE,
  pos_hutang_id   BIGINT NOT NULL REFERENCES pos_hutang(id),
  unit_pemberi_id UUID REFERENCES unit_kerja(id),
  jurnal_id       BIGINT REFERENCES jurnal_umum(id),
  tanggal         DATE NOT NULL,
  no_hutang       TEXT NOT NULL,
  jumlah          NUMERIC(15,2) NOT NULL,
  sisa_hutang     NUMERIC(15,2) NOT NULL,
  keterangan      TEXT,
  status          TEXT DEFAULT 'BELUM_LUNAS'
                  CHECK (status IN ('BELUM_LUNAS','LUNAS','SEBAGIAN')),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE bayar_hutang (
  id              BIGSERIAL PRIMARY KEY,
  hutang_id       BIGINT NOT NULL REFERENCES hutang(id) ON DELETE CASCADE,
  unit_kerja_id   UUID NOT NULL REFERENCES unit_kerja(id) ON DELETE CASCADE,
  pesantren_id    UUID NOT NULL REFERENCES pesantren(id) ON DELETE CASCADE,
  jurnal_id       BIGINT REFERENCES jurnal_umum(id),
  tanggal         DATE NOT NULL,
  jumlah_bayar    NUMERIC(15,2) NOT NULL,
  akun_kas_id     TEXT NOT NULL,
  keterangan      TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- RLS
-- ============================================
ALTER TABLE pos_bayar            ENABLE ROW LEVEL SECURITY;
ALTER TABLE jenis_bayar          ENABLE ROW LEVEL SECURITY;
ALTER TABLE paket_pembayaran     ENABLE ROW LEVEL SECURITY;
ALTER TABLE paket_detail         ENABLE ROW LEVEL SECURITY;
ALTER TABLE pajak                ENABLE ROW LEVEL SECURITY;
ALTER TABLE unit_pos             ENABLE ROW LEVEL SECURITY;
ALTER TABLE kas_transaksi        ENABLE ROW LEVEL SECURITY;
ALTER TABLE rekonsiliasi_bank    ENABLE ROW LEVEL SECURITY;
ALTER TABLE pos_hutang           ENABLE ROW LEVEL SECURITY;
ALTER TABLE hutang               ENABLE ROW LEVEL SECURITY;
ALTER TABLE bayar_hutang         ENABLE ROW LEVEL SECURITY;

-- Tabel dengan pesantren_id & unit_kerja_id langsung
DO $$
DECLARE tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'pos_bayar','jenis_bayar','paket_pembayaran','pajak','unit_pos',
    'kas_transaksi','rekonsiliasi_bank','pos_hutang','hutang','bayar_hutang'
  ]
  LOOP
    EXECUTE format('CREATE POLICY "platform_all" ON %I FOR ALL TO authenticated
      USING (get_my_role() = ''SUPERADMIN_PLATFORM'')
      WITH CHECK (get_my_role() = ''SUPERADMIN_PLATFORM'');', tbl);

    EXECUTE format('CREATE POLICY "superadmin_pesantren_all" ON %I FOR ALL TO authenticated
      USING (pesantren_id = get_my_pesantren_id() AND get_my_role() = ''SUPERADMIN_PESANTREN'')
      WITH CHECK (pesantren_id = get_my_pesantren_id() AND get_my_role() = ''SUPERADMIN_PESANTREN'');', tbl);

    EXECUTE format('CREATE POLICY "admin_unit_own" ON %I FOR ALL TO authenticated
      USING (unit_kerja_id = get_my_unit_kerja_id() AND get_my_role() = ''ADMIN_UNIT'')
      WITH CHECK (unit_kerja_id = get_my_unit_kerja_id() AND get_my_role() = ''ADMIN_UNIT'');', tbl);
  END LOOP;
END $$;

-- paket_detail — tidak ada pesantren_id/unit_kerja_id langsung, akses via paket_pembayaran
CREATE POLICY "access_via_paket" ON paket_detail FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM paket_pembayaran p
      WHERE p.id = paket_detail.paket_id
      AND (
        get_my_role() = 'SUPERADMIN_PLATFORM'
        OR p.pesantren_id = get_my_pesantren_id()
        OR p.unit_kerja_id = get_my_unit_kerja_id()
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM paket_pembayaran p
      WHERE p.id = paket_detail.paket_id
      AND (
        get_my_role() = 'SUPERADMIN_PLATFORM'
        OR p.pesantren_id = get_my_pesantren_id()
        OR p.unit_kerja_id = get_my_unit_kerja_id()
      )
    )
  );
