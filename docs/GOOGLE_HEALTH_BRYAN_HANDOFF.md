# JOEbod × Google Health (Fitbit) — Setup & Bryan handoff

Joe’s Fitbit data reaches JOEbod through the **Google Health API** (not Android Health Connect). Fitbit accounts signed in with Google use this API. The legacy Fitbit Web API is being retired (~Sept 30, 2026).

**Who does what**
| Person | Role |
|--------|------|
| **Joe** | Creates Google Cloud project, OAuth client, adds himself as test user, consents with Fitbit/Google account |
| **Bryan Willis** | Deploys `eclipse` app to Vercel, sets env vars, adds production redirect URI |

Official docs: [Setup](https://developers.google.com/health/setup) · [Scopes](https://developers.google.com/health/scopes) · [First API call](https://developers.google.com/health/codelabs/make-your-first-api-call)

---

## Part A — Joe: Google Cloud (do this first)

### A1. Create the project
1. Open [Google Cloud Console](https://console.cloud.google.com/) signed in with the **same Google account you use for Fitbit**.
2. Project picker (top) → **New Project**.
3. Name: `JOEbod Health` (or similar) → **Create**.
4. Select that project.

### A2. Enable Google Health API
1. Menu → **APIs & Services** → **Library**.
2. Search **Google Health API** → open it → **Enable**.

### A3. Configure OAuth consent screen
1. **APIs & Services** → **Google Auth Platform** / **OAuth consent screen** (or “Get started”).
2. App name: `JOEbod`
3. User support email: your Gmail
4. Audience: **External**
5. Contact email: your Gmail
6. Agree to policy → Create  
7. Leave **Publishing status = Testing** for now (fine for personal use; refresh tokens last **7 days** in Testing — re-connect weekly, or later publish for longer-lived tokens).

### A4. Add yourself as a test user (required while Testing)
1. OAuth → **Audience**
2. **Test users** → **+ Add users**
3. Add your Google/Fitbit email → Save  

If you skip this, Google will block consent.

### A5. Add Health scopes (Data Access)
1. OAuth → **Data Access** → **Add or remove scopes**
2. Search **Google Health API** and enable at least:

```
https://www.googleapis.com/auth/googlehealth.activity_and_fitness.readonly
https://www.googleapis.com/auth/googlehealth.health_metrics_and_measurements.readonly
https://www.googleapis.com/auth/googlehealth.sleep.readonly
https://www.googleapis.com/auth/googlehealth.profile.readonly
```

3. **Update** → **Save**

(Heart rate / SpO₂ live under health metrics; steps/activity under activity_and_fitness; sleep under sleep.)

### A6. Create OAuth Web Client
1. **APIs & Services** → **Credentials** → **+ Create Credentials** → **OAuth client ID**
2. Application type: **Web application**
3. Name: `JOEbod Web`
4. **Authorized JavaScript origins** (add both):
   - `http://localhost:3001`
   - `https://YOUR-VERCEL-DOMAIN` (Bryan fills after deploy, e.g. `https://joebod.vercel.app`)
5. **Authorized redirect URIs** (add both):
   - `http://localhost:3001/api/google-health/callback`
   - `https://YOUR-VERCEL-DOMAIN/api/google-health/callback`
6. **Create** → copy **Client ID** and **Client Secret** (download JSON and store safely — secret is shown once).

### A7. Fitbit app readiness
1. On your phone, Fitbit app → signed in with that **same Google account**.
2. Wear the tracker / sync so HR and steps exist in the cloud.
3. Optional: manually log a short walk in Fitbit if the account is brand new (helps verify API reads).

---

## Part B — Bryan: Vercel deploy + secrets

### B1. What to deploy
Folder / repo root = **`eclipse`** (Next.js app):

`Fitness and Health App/eclipse`

Not the parent HTML prototype.

### B2. Import to Vercel
1. Push `eclipse` to GitHub (repo name e.g. `joebod`).
2. [vercel.com/new](https://vercel.com/new) → Import repo.
3. Framework: **Next.js**, Root: `.`, Build: `npm run build`.

### B3. Environment variables (Project → Settings → Environment Variables)

| Name | Value | Notes |
|------|--------|--------|
| `GOOGLE_HEALTH_CLIENT_ID` | from Google Cloud | OAuth client ID |
| `GOOGLE_HEALTH_CLIENT_SECRET` | from Google Cloud | Keep secret |
| `GOOGLE_HEALTH_REDIRECT_URI` | `https://<prod-domain>/api/google-health/callback` | Must match Cloud Console exactly |
| `JOEBOD_TOKEN_SECRET` | long random string (32+ chars) | Encrypts refresh token cookie |

Apply to **Production** (and Preview if you want preview OAuth).

### B4. After first deploy
1. Tell Joe the production URL.
2. Joe adds that URL + callback to Google Cloud (A6) if not already.
3. Redeploy not required after URI change in Google — only after env var changes (Redeploy once).

### B5. Smoke test
1. Open production site → **Settings** → **Connect Google Health / Fitbit**.
2. Sign in as the **test user** Google account → Allow scopes.
3. Land back on JOEbod → Home should show live vitals after **Sync**.

---

## Part C — Local test (optional, Joe)

Create `eclipse/.env.local` (never commit):

```env
GOOGLE_HEALTH_CLIENT_ID=...
GOOGLE_HEALTH_CLIENT_SECRET=...
GOOGLE_HEALTH_REDIRECT_URI=http://localhost:3001/api/google-health/callback
JOEBOD_TOKEN_SECRET=dev-only-change-me-to-a-long-random-string
```

```bash
cd eclipse
npm install
npm run dev
```

Open http://localhost:3001 → Settings → Connect.

---

## Part D — How the code works (already in repo)

| Route | Purpose |
|-------|---------|
| `GET /api/google-health/auth` | Starts Google OAuth |
| `GET /api/google-health/callback` | Exchanges code, stores encrypted refresh cookie |
| `GET /api/google-health/status` | Connected? |
| `POST /api/google-health/sync` | Pulls HR / steps / SpO₂ / sleep into a snapshot for the UI |
| `POST /api/google-health/disconnect` | Clears cookie |

UI: Settings → Connect / Sync / Disconnect. Fitness Home pulse card reads the synced snapshot from `localStorage`.

---

## Approval / verification notes

- **Personal / Testing (≤100 test users):** No security assessment required. Add Joe (and Bryan if needed) as test users.
- **Public / >100 users:** Google requires OAuth verification + often a third-party security assessment (CASA). Not needed for Joe-only use.
- **Testing mode refresh tokens expire in 7 days** — Joe re-taps Connect weekly, or later set publishing to Production (still can stay limited audience).

---

## Checklist for Bryan package

- [ ] GitHub repo with latest `eclipse` code
- [ ] Joe sends Client ID + Client Secret (secure channel, not Slack public)
- [ ] Joe sends intended production domain once known
- [ ] Bryan sets 4 env vars on Vercel
- [ ] Bryan confirms redirect URI matches Google Console
- [ ] Joe connects Fitbit Google account once on production URL

---

## Links Joe should keep open

1. https://console.cloud.google.com/  
2. https://developers.google.com/health/setup  
3. https://developers.google.com/health/scopes  
4. Fitbit app on phone (same Google login)
