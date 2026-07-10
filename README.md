# The Wedding Cam 💍

A disposable camera web app for Desiree & Jude Michael's wedding.

## Setup

### 1. Supabase

1. Create a free project at [supabase.com](https://supabase.com)
2. Run the SQL in **SQL Editor** (see `supabase-setup.sql`)
3. Create storage bucket `wedding-shots` (public)
4. Add storage RLS policies (see SQL file)
5. Copy your **Project URL** and **anon key** from Settings → API

### 2. Local dev

```bash
cp .env.example .env
# Fill in your Supabase URL and anon key
npm install
npm run dev
```

### 3. Deploy to Vercel

1. Push to GitHub
2. Import repo in Vercel (free Hobby plan)
3. Add environment variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Deploy → get your URL → generate QR code

### 4. Admin access

- Create a user in Supabase Dashboard → Authentication → Users
- Visit `https://your-url.vercel.app/admin`

## Routes

- `/` — Guest camera app
- `/admin` — Admin photo gallery (login required)
