# JOEbod — Fitness & Health

Mobile-first gym + health companion for Joe Dix. **JOE***bod*** — one word. Data stays on-device (`localStorage`). Built with Next.js for **Vercel**.

## Local development

```bash
cd eclipse
npm install
npm run dev
```

App runs at **http://localhost:3001** (port pinned so candidIQ can keep 3000).

## Phone use (iPhone + Android)

1. Deploy to Vercel (below) or use your phone on the same Wi‑Fi: `http://YOUR-PC-IP:3001`
2. **iPhone (Safari):** Share → **Add to Home Screen**
3. **Android (Chrome):** Menu → **Install app** / **Add to Home screen**

Opens fullscreen like a native app. Light/Dark toggle is top-right on every screen.

## Deploy / backup on Vercel

### What to upload

Upload the **`eclipse`** folder (this Next.js app), not the parent “Fitness and Health App” prototype HTML.

**Path on your PC:**  
`C:\Github\Fitness and Health App\eclipse`

### Option A — GitHub + Vercel (recommended backup)

1. Create a new GitHub repo (e.g. `joebod`).
2. From this folder:

```bash
cd "C:\Github\Fitness and Health App\eclipse"
git add .
git commit -m "JOEbod mobile fitness and health app"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/joebod.git
git push -u origin main
```

3. Go to [vercel.com/new](https://vercel.com/new) → **Import** that GitHub repo.
4. Vercel settings:

| Setting | Value |
|--------|--------|
| Framework Preset | Next.js |
| Root Directory | `.` (repo root = eclipse) |
| Build Command | `npm run build` |
| Output | (leave default — Next.js) |
| Install Command | `npm install` |
| Node.js | 20.x (default) |
| Environment Variables | See **Claude Coach** + Google Health below |

5. Click **Deploy**. You’ll get a URL like `https://joebod.vercel.app`.

### Option B — Vercel CLI (no GitHub yet)

```bash
cd "C:\Github\Fitness and Health App\eclipse"
npm i -g vercel
vercel login
vercel
```

Accept defaults (Next.js). For production: `vercel --prod`.

### After deploy

- Open the Vercel URL on your phone → **Add to Home Screen** (iPhone Safari / Android Chrome)  
- Re-deploy happens automatically on every `git push` (Option A)  
- Set `ANTHROPIC_API_KEY` on Vercel so Coach works on your phone  

### Notes

- App data is **per browser / per device** (not synced to Vercel).  
- Clearing site data on the phone erases logs.  
- This is a backup of the **code**, not a cloud database of your health logs.

## Claude Coach

On-demand workouts via Anthropic (Coach tab). Weekly Push / Pull / Legs templates stay unchanged until you tap **Load into Log**.

| Env var | Purpose |
|---------|---------|
| `ANTHROPIC_API_KEY` | Server-only API key from [console.anthropic.com](https://console.anthropic.com/) |
| `ANTHROPIC_MODEL` | Optional model override (default set in code) |

**Local:** put the key in `.env.local`, restart `npm run dev`.  
**Phone / Vercel:** Project → Settings → Environment Variables → add `ANTHROPIC_API_KEY` for Production (and Preview if you use it) → Redeploy.

## Google Health / Fitbit

See **[docs/GOOGLE_HEALTH_BRYAN_HANDOFF.md](docs/GOOGLE_HEALTH_BRYAN_HANDOFF.md)** for the full Joe + Bryan walkthrough (Google Cloud, OAuth, Vercel env vars).

Quick env template: `.env.example`

| Env var | Purpose |
|---------|---------|
| `GOOGLE_HEALTH_CLIENT_ID` | OAuth client ID |
| `GOOGLE_HEALTH_CLIENT_SECRET` | OAuth client secret |
| `GOOGLE_HEALTH_REDIRECT_URI` | Exact callback URL |
| `JOEBOD_TOKEN_SECRET` | Encrypts refresh-token cookie |

## Modes

| Mode | Tabs |
|------|------|
| **Fitness** | Home, Log, Coach, History, Settings |
| **Health** | Dashboard, Labs, Genetics, Conditions, Meds, Sleep, Nutrition, Account |
