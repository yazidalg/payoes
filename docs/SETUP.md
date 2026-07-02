# Payoes Setup Guide

Ikuti langkah berikut sebelum menjalankan aplikasi.

## 1. Install dependencies

```bash
npm install
```

## 2. Salin environment variables

```bash
cp .env.example .env.local
```

Isi semua nilai di `.env.local`.

---

## 3. Google OAuth (WAJIB)

### Buat project di Google Cloud Console

1. Buka [Google Cloud Console](https://console.cloud.google.com/)
2. Buat project baru (atau pilih yang sudah ada)
3. Buka **APIs & Services → OAuth consent screen**
   - User type: **External** (untuk development)
   - Isi app name: `Payoes`
   - Tambahkan email Anda sebagai test user
4. Buka **APIs & Services → Credentials**
5. Klik **Create Credentials → OAuth client ID**
   - Application type: **Web application**
   - Name: `Payoes Local`
   - **Authorized JavaScript origins** — tambahkan:
     ```
     http://localhost:3000
     ```
   - **Authorized redirect URIs** — tambahkan **persis** (copy-paste, jangan ubah):
     ```
     http://localhost:3000/api/auth/callback/google
     ```
     > ⚠️ Bukan `http://localhost:3000` saja. Harus ada path `/api/auth/callback/google`
     > ⚠️ Pakai `http` bukan `https` untuk local dev
     > ⚠️ Tanpa trailing slash di akhir

6. Salin **Client ID** dan **Client Secret** ke `.env.local`:

```env
AUTH_GOOGLE_ID=your-client-id.apps.googleusercontent.com
AUTH_GOOGLE_SECRET=your-client-secret
```

### Generate AUTH_SECRET

```bash
openssl rand -base64 32
```

Salin hasilnya ke:

```env
AUTH_SECRET=hasil-dari-openssl
AUTH_URL=http://localhost:3000
```

---

## 4. Turnkey MPC (WAJIB)

Turnkey menyimpan private key Stellar di secure enclave — tidak pernah ada di browser.

### Buat akun Turnkey

1. Daftar di [Turnkey](https://www.turnkey.com/)
2. Buat **Organization** baru
3. Buka **Settings → API Keys**
4. Klik **Create API Key**
   - Simpan **Public Key** dan **Private Key** (private key hanya ditampilkan sekali!)
5. Salin **Organization ID** dari dashboard

### Isi `.env.local`

```env
TURNKEY_API_PUBLIC_KEY=your-turnkey-api-public-key
TURNKEY_API_PRIVATE_KEY=your-turnkey-api-private-key
TURNKEY_ORGANIZATION_ID=your-organization-id
```

> **Penting:** Jangan commit file `.env.local` ke git.

---

## 5. Setup database

```bash
npm run db:push
```

Ini membuat file SQLite `payoes.db` dengan tabel user, session, dan wallet.

---

## 6. Jalankan aplikasi

```bash
npm run dev
```

Buka http://localhost:3000

### Flow yang terjadi

1. Login dengan Google (OAuth asli)
2. Server membuat wallet Stellar via Turnkey MPC (`ED25519` / Stellar)
3. Akun testnet di-fund otomatis via [Friendbot](https://laboratory.stellar.org/#account-creator?network=test)
4. Saldo XLM asli ditampilkan dari Horizon testnet

---

## Troubleshooting

### `redirect_uri_mismatch`
Pastikan di Google Console → Credentials → OAuth client (tipe **Web application**):

1. **Authorized redirect URIs** berisi **tepat**:
   ```
   http://localhost:3000/api/auth/callback/google
   ```
2. **Authorized JavaScript origins** berisi:
   ```
   http://localhost:3000
   ```
3. Setelah mengubah, tunggu ~1 menit lalu coba lagi
4. Restart dev server: `Ctrl+C` lalu `npm run dev`

### `Turnkey is not configured`
Pastikan ketiga env Turnkey sudah diisi dan server di-restart.

### Wallet provisioning gagal
- Cek API key Turnkey masih valid
- Pastikan organization ID benar
- Lihat log di terminal `npm run dev`

### Saldo 0 XLM
Friendbot kadang gagal sementara. Coba logout → login lagi, atau fund manual:
```
https://friendbot.stellar.org?addr=YOUR_PUBLIC_KEY
```

---

## Variabel environment lengkap

| Variable | Required | Deskripsi |
|----------|----------|-----------|
| `AUTH_SECRET` | ✅ | Secret untuk encrypt session JWT |
| `AUTH_URL` | ✅ | Base URL app (`http://localhost:3000`) |
| `AUTH_GOOGLE_ID` | ✅ | Google OAuth Client ID |
| `AUTH_GOOGLE_SECRET` | ✅ | Google OAuth Client Secret |
| `TURNKEY_API_PUBLIC_KEY` | ✅ | Turnkey API public key |
| `TURNKEY_API_PRIVATE_KEY` | ✅ | Turnkey API private key |
| `TURNKEY_ORGANIZATION_ID` | ✅ | Turnkey organization ID |
| `DATABASE_URL` | ⬜ | Path SQLite (default: `./payoes.db`) |
