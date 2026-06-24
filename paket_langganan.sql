-- ============================================
-- PAKET DEFINISI (master, diisi manual)
-- ============================================
CREATE TABLE paket_langganan (
  id           BIGSERIAL PRIMARY KEY,
  kode         TEXT UNIQUE NOT NULL, -- TRIAL, STARTER, BASIC, PRO, ENTERPRISE
  nama         TEXT NOT NULL,
  harga        NUMERIC(15,2) NOT NULL DEFAULT 0,
  max_unit     INT NOT NULL DEFAULT 1, -- -1 = unlimited
  deskripsi    TEXT,
  aktif        BOOLEAN DEFAULT TRUE,
  urutan       INT DEFAULT 0,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Insert paket default
INSERT INTO paket_langganan (kode, nama, harga, max_unit, urutan) VALUES
  ('TRIAL',      'Trial',       0,        3,  0),
  ('STARTER',    'Starter',     99000,    1,  1),
  ('BASIC',      'Basic',       199000,   3,  2),
  ('PRO',        'Pro',         399000,   10, 3),
  ('ENTERPRISE', 'Enterprise',  0,        -1, 4);

-- ============================================
-- LANGGANAN PESANTREN
-- ============================================
CREATE TABLE langganan (
  id               BIGSERIAL PRIMARY KEY,
  pesantren_id     UUID NOT NULL REFERENCES pesantren(id) ON DELETE CASCADE,
  paket_id         BIGINT NOT NULL REFERENCES paket_langganan(id),
  status           TEXT NOT NULL DEFAULT 'TRIAL'
                   CHECK (status IN (
                     'TRIAL','AKTIF','MENUNGGU_VERIFIKASI',
                     'EXPIRED','DIBATALKAN'
                   )),
  tanggal_mulai    DATE NOT NULL,
  tanggal_selesai  DATE,
  trial_selesai    DATE, -- tanggal habis trial
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- PEMBAYARAN LANGGANAN
-- ============================================
CREATE TABLE pembayaran_langganan (
  id               BIGSERIAL PRIMARY KEY,
  pesantren_id     UUID NOT NULL REFERENCES pesantren(id) ON DELETE CASCADE,
  paket_id         BIGINT NOT NULL REFERENCES paket_langganan(id),
  langganan_id     BIGINT REFERENCES langganan(id),
  jumlah           NUMERIC(15,2) NOT NULL,
  periode_bulan    INT NOT NULL DEFAULT 1, -- berapa bulan dibayar
  bukti_transfer   TEXT, -- URL file bukti transfer
  bank_tujuan      TEXT,
  no_rekening      TEXT,
  nama_pengirim    TEXT,
  catatan          TEXT,
  status           TEXT NOT NULL DEFAULT 'MENUNGGU'
                   CHECK (status IN (
                     'MENUNGGU','DIVERIFIKASI','DITOLAK'
                   )),
  verified_by      UUID REFERENCES profiles(id),
  verified_at      TIMESTAMPTZ,
  catatan_verifikasi TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- RLS
-- ============================================
ALTER TABLE paket_langganan      ENABLE ROW LEVEL SECURITY;
ALTER TABLE langganan            ENABLE ROW LEVEL SECURITY;
ALTER TABLE pembayaran_langganan ENABLE ROW LEVEL SECURITY;

-- Paket — semua bisa baca
CREATE POLICY "public_read" ON paket_langganan FOR SELECT USING (true);
CREATE POLICY "platform_manage" ON paket_langganan FOR ALL TO authenticated
  USING (get_my_role() = 'SUPERADMIN_PLATFORM')
  WITH CHECK (get_my_role() = 'SUPERADMIN_PLATFORM');

-- Langganan
CREATE POLICY "platform_all" ON langganan FOR ALL TO authenticated
  USING (get_my_role() = 'SUPERADMIN_PLATFORM')
  WITH CHECK (get_my_role() = 'SUPERADMIN_PLATFORM');

CREATE POLICY "pesantren_read_own" ON langganan FOR SELECT TO authenticated
  USING (pesantren_id = get_my_pesantren_id());

-- Pembayaran
CREATE POLICY "platform_all" ON pembayaran_langganan FOR ALL TO authenticated
  USING (get_my_role() = 'SUPERADMIN_PLATFORM')
  WITH CHECK (get_my_role() = 'SUPERADMIN_PLATFORM');

CREATE POLICY "pesantren_own" ON pembayaran_langganan FOR ALL TO authenticated
  USING (pesantren_id = get_my_pesantren_id())
  WITH CHECK (pesantren_id = get_my_pesantren_id());

-- ============================================
-- AUTO TRIAL saat pesantren disetujui
-- Jalankan function ini saat approve pesantren
-- ============================================
CREATE OR REPLACE FUNCTION create_trial_langganan(p_pesantren_id UUID)
RETURNS void AS $$
DECLARE
  v_paket_id BIGINT;
BEGIN
  SELECT id INTO v_paket_id FROM paket_langganan WHERE kode = 'TRIAL';

  INSERT INTO langganan (
    pesantren_id, paket_id, status,
    tanggal_mulai, tanggal_selesai, trial_selesai
  ) VALUES (
    p_pesantren_id, v_paket_id, 'TRIAL',
    CURRENT_DATE,
    CURRENT_DATE + INTERVAL '14 days',
    CURRENT_DATE + INTERVAL '14 days'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
