# SIMPEG - Sistem Informasi Pegawai

Dashboard Admin untuk manajemen data pegawai menggunakan **React + TypeScript + Vite + shadcn/ui + Supabase**.

## Fitur

- 📊 **Dashboard** — ringkasan statistik pegawai (total, aktif, jabatan, unit kerja)
- 📋 **Data Pegawai** — tabel lengkap dengan search, filter multi-kolom, pagination, edit & hapus
- ➕ **Tambah Pegawai** — form lengkap untuk input data pegawai baru
- 📈 **Statistik** — visualisasi bar chart per jabatan, unit kerja, pendidikan, jalur masuk, tahun masuk
- ⚙️ **Pengaturan** — panduan setup Supabase & SQL schema

## Tech Stack

- **React 18** + **TypeScript**
- **Vite** (build tool)
- **shadcn/ui** (komponen UI: Button, Card, Table, Dialog, Select, Badge, Toast, dll)
- **Tailwind CSS**
- **Supabase** (database PostgreSQL)
- **React Router v6**

## Setup & Instalasi

### 1. Install dependencies

```bash
npm install
```

### 2. Setup Supabase

1. Buat project baru di [supabase.com](https://supabase.com)
2. Buka **SQL Editor** dan jalankan SQL ini:

```sql
CREATE TABLE pegawai (
  id BIGSERIAL PRIMARY KEY,
  nama_pegawai TEXT NOT NULL,
  id_nip TEXT NOT NULL UNIQUE,
  pendidikan_terakhir TEXT,
  jenis_kelamin TEXT CHECK (jenis_kelamin IN ('LAKI-LAKI','PEREMPUAN')),
  unit_kerja TEXT,
  jabatan TEXT,
  tahun_masuk INT,
  tahun_keluar INT,
  status_pegawai TEXT CHECK (status_pegawai IN ('TETAP','TIDAK TETAP')),
  menikah TEXT CHECK (menikah IN ('MENIKAH','BELUM MENIKAH')),
  aktif TEXT CHECK (aktif IN ('AKTIF','NON AKTIF')),
  masa_aktif TEXT,
  jalur_masuk TEXT CHECK (jalur_masuk IN ('REKRUTMEN','ALUMNI PTH','LAINNYA')),
  email TEXT,
  hp TEXT,
  catatan TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE pegawai ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON pegawai FOR ALL USING (true) WITH CHECK (true);
```

3. Ambil **Project URL** dan **anon key** dari **Project Settings → API**

### 3. Buat file `.env`

```bash
cp .env.example .env
```

Isi dengan credentials Supabase Anda:

```
VITE_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJxxxxxxxxxxxxxxx...
```

### 4. Jalankan development server

```bash
npm run dev
```

Buka [http://localhost:5173](http://localhost:5173)

## Build Production

```bash
npm run build
npm run preview
```

## Struktur Project

```
src/
├── components/
│   ├── ui/          # shadcn/ui components
│   ├── Layout.tsx   # sidebar + outlet
│   ├── Sidebar.tsx  # navigasi
│   ├── StatCard.tsx # kartu statistik
│   └── PegawaiForm.tsx # form add/edit
├── pages/
│   ├── Dashboard.tsx
│   ├── DataPegawai.tsx
│   ├── TambahPegawai.tsx
│   ├── Statistik.tsx
│   └── Pengaturan.tsx
├── lib/
│   ├── supabase.ts
│   └── utils.ts
├── types/
│   └── pegawai.ts
└── hooks/
    └── use-toast.ts
```
