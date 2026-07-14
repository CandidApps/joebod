# JOEbod — Free hosting (no Bryan Pro / no $20)

## Recommendation

| Piece | Use | Cost | Why |
|-------|-----|------|-----|
| **App host** | **Your own Vercel Hobby account** | **$0** | Best for Next.js; keep it off Bryan’s Candid Pro team |
| **Database (optional later)** | Supabase Free | $0 | Only when you want cloud sync of logs |
| **Lovable** | Skip | — | AI builder; don’t rebuild this app there |

The $20 is almost certainly because the project was created under **Bryan’s Pro team**. A **personal Hobby** account is free for your own JOEbod.

**Supabase does not host Next.js.** It stores data/auth. You still need Vercel/Netlify/Cloudflare for the app.

**Backup of code** = GitHub (`ChloeDYO/joebod`). That stays free.

---

## Step-by-step: free Vercel Hobby (recommended)

### 1. Use a personal Vercel login
1. Open [vercel.com/signup](https://vercel.com/signup) in a **private/incognito** window.
2. Sign up with **your** GitHub (`ChloeDYO`) or a personal email.
3. If it asks to join a team, **decline** / skip — stay on **Hobby (Personal)**.
4. Dashboard should say **Hobby** under plan (not Pro).

### 2. Import JOEbod
1. [vercel.com/new](https://vercel.com/new)
2. Import **`ChloeDYO/joebod`**
3. Settings:
   - Framework: **Next.js**
   - Root Directory: `.` (repo root)
   - Build: `npm run build`
4. Deploy. You get something like `https://joebod-xxx.vercel.app` — **$0**.

### 3. Env vars (only when ready for Fitbit)
Project → Settings → Environment Variables:

```
GOOGLE_HEALTH_CLIENT_ID=
GOOGLE_HEALTH_CLIENT_SECRET=
GOOGLE_HEALTH_REDIRECT_URI=https://YOUR-VERCEL-URL/api/google-health/callback
JOEBOD_TOKEN_SECRET=long-random-string-32-chars-minimum
```

Then add that same callback URL in Google Cloud OAuth redirect URIs.

### 4. Phone
Open the Vercel URL → Add to Home Screen.

---

## If Hobby still forces Pro

That usually means GitHub is linked to Bryan’s team. Fixes:

1. Vercel → Account Settings → disconnect wrong team, or  
2. Sign up with a **different email** (personal Gmail), then connect GitHub only for import, or  
3. Use **Netlify free** instead (below).

---

## Alternative: Netlify free (also $0)

1. [app.netlify.com](https://app.netlify.com) → Sign up with GitHub  
2. Add new site → Import `ChloeDYO/joebod`  
3. Build: `npm run build`  
4. Publish directory: leave Netlify’s Next runtime default (or use `@netlify/plugin-nextjs` if prompted)  
5. Deploy  

Slightly less “native” than Vercel for Next.js, but free and commercial-OK.

---

## Supabase free — when to use it

Use **later**, not instead of hosting:

1. [supabase.com](https://supabase.com) → New project (free tier)  
2. Optional: store workouts / vitals in tables instead of only `localStorage`  
3. Keep app on Vercel Hobby; put `NEXT_PUBLIC_SUPABASE_URL` + anon key in Vercel env  

Until then, JOEbod is fine with on-device storage.

---

## What to tell Bryan

> JOEbod is on my personal GitHub (`ChloeDYO/joebod`) and my own free Vercel Hobby.  
> No need to put it on the CandidIQ Pro team.  
> I only need help with Google Health secrets if I get stuck.

Remove any JOEbod project from the Candid Pro team so you’re not billed.
