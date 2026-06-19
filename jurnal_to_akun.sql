-- Hapus kolom akun_nama karena sudah ada di master_akun
ALTER TABLE jurnal_detail DROP COLUMN IF EXISTS akun_nama;

-- Tambah FK ke master_akun
ALTER TABLE jurnal_detail
  ADD CONSTRAINT fk_akun_kode
  FOREIGN KEY (akun_kode) REFERENCES master_akun(kode);
