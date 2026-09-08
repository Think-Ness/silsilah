# Panduan Setup Supabase — Silsilah Keluarga

## 1. Buat Akun & Project Supabase

1. Daftar di [supabase.com](https://supabase.com)
2. Buat project baru:
   - **Name**: silsilah-keluarga (atau sesuai keinginan)
   - **Region**: Southeast Asia (Singapore)
   - **Password**: simpan baik-baik (untuk koneksi langsung DB jika diperlukan)

## 2. Ambil Credentials

Di Supabase Dashboard → **Settings** → **API**:

Salin:
- `Project URL` → ini adalah `NEXT_PUBLIC_SUPABASE_URL`
- `anon public` key → ini adalah `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Buat file `.env.local` di root project:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
```

> ⚠️ **JANGAN** commit `.env.local` ke git. File ini sudah ada di `.gitignore`.

## 3. Jalankan Migrations (SQL Schema)

Di Supabase Dashboard → **SQL Editor**:

Jalankan file-file berikut **secara berurutan** (salin isi file dan klik Run):

### Step 1: Schema
Salin seluruh isi file: `supabase/migrations/001_initial_schema.sql`

### Step 2: RLS Policies
Salin seluruh isi file: `supabase/migrations/002_rls_policies.sql`

### Step 3: Seed Data (Opsional)
Salin seluruh isi file: `supabase/migrations/003_seed_data.sql`

> ℹ️ Seed data berisi silsilah keluarga dari PRD §30 (Bohari + Amnah → Ahlan + Siti Maskah, dst.)

## 4. Buat Storage Bucket

Di Supabase Dashboard → **Storage**:

1. Klik **New bucket**
2. Nama: `media`
3. **Public**: TIDAK (private)
4. Klik **Save**

Kemudian di **SQL Editor**, jalankan:

```sql
-- Enable storage policies
CREATE POLICY "media_upload" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'media' AND auth.role() = 'authenticated');

CREATE POLICY "media_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'media' AND auth.role() = 'authenticated');

CREATE POLICY "media_delete" ON storage.objects
  FOR DELETE USING (bucket_id = 'media' AND auth.role() = 'authenticated');
```

## 5. Buat User Pertama (Super Admin)

Di Supabase Dashboard → **Authentication** → **Users**:

1. Klik **Add user** → **Create new user**
2. Email: email admin kamu
3. Password: password kuat
4. Klik **Create user**

> 💡 Untuk saat ini semua user yang bisa login dianggap admin. Role-based access akan dikembangkan di Phase 2.

## 6. Jalankan Aplikasi

```bash
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000) → Login dengan akun yang baru dibuat.

## 7. Verifikasi

Setelah login, pastikan:
- [ ] Dashboard menampilkan statistik (akan 0 jika belum ada seed data)
- [ ] Pohon Keluarga membuka halaman canvas (kosong jika belum ada data)
- [ ] Tambah Anggota form bisa diisi dan disimpan
- [ ] Search berfungsi

Jika seed data dijalankan:
- [ ] Canvas menampilkan keluarga Ahlan + Siti Maskah
- [ ] Search "Misbahul" menemukan H. Misbahul Khair
- [ ] Klik node membuka profil panel

## 8. Deploy ke Vercel (Opsional)

```bash
npx vercel --prod
```

Tambahkan environment variables di Vercel Dashboard → Settings → Environment Variables:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

---

## Troubleshooting

### Error: "relation does not exist"
→ Jalankan `001_initial_schema.sql` terlebih dahulu

### Error: "Row Level Security policy violation"
→ Pastikan user sudah login. Semua data dilindungi RLS.

### Canvas kosong padahal ada data
→ Periksa browser console. Mungkin ada error saat fetch data dari Supabase.

### Foto tidak muncul
→ Pastikan bucket `media` sudah dibuat dan storage policies sudah dijalankan.
