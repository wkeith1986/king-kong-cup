# Getting The King Kong Cup live

This guide walks you through every click required to put the app on the
internet. **No coding required.** Total time: about 45 minutes the first
time. After that, entering scores takes ~5 minutes per round.

You'll be using three free services:

1. **GitHub** — stores the project files
2. **Supabase** — the database (player scores, etc.)
3. **Vercel** — hosts the live website

If you get stuck at any step, screenshot the error and send it over.

---

## Part 1 — GitHub (5 min)

GitHub is where the code lives. Vercel reads from GitHub to build your site.

1. Go to **https://github.com** and click **Sign up** (or sign in).
2. Once signed in, click the **+** icon in the top right → **New repository**.
3. Name it: `king-kong-cup`. Leave it **Public** (or Private — either works).
   Don't check any of the "Initialize this repository" boxes. Click
   **Create repository**.
4. You'll land on a page that says "Quick setup". Click the link near the
   top that says **uploading an existing file**.
5. Open Finder, navigate to the `king-kong-cup` folder I built for you.
6. Select **everything inside the folder** (Cmd+A) — make sure you grab
   the hidden files (`.env.example`, `.gitignore`). If you don't see
   them, press **Cmd+Shift+.** in Finder to reveal hidden files.
7. **Important:** Do NOT upload the `node_modules` folder if it exists.
   It's huge and Vercel will rebuild it.
8. Drag everything onto the GitHub upload box, then scroll down and click
   **Commit changes**.

You now have the code on GitHub.

---

## Part 2 — Supabase database (10 min)

Supabase is a free hosted database. The free tier is plenty for this app.

1. Go to **https://supabase.com** and click **Start your project**.
2. Sign in with GitHub (easiest).
3. Click **New project**:
   - **Name:** `king-kong-cup`
   - **Database password:** Click **Generate a password**, then **save it
     somewhere** (a note, password manager). You probably won't need it
     again, but don't lose it.
   - **Region:** Pick whatever's closest (e.g., `West US (North California)`).
   - Click **Create new project**. Wait ~2 min for it to provision.

4. Once the project loads, you'll see a left sidebar. Click the **SQL Editor**
   icon (it looks like a database/console icon).

5. Click **New query**. In the big text box, paste the contents of
   `supabase/schema.sql` from the project folder (open it in TextEdit and
   copy everything). Click **Run** (or press Cmd+Enter).
   - You should see "Success. No rows returned" or similar at the bottom.

6. Click **New query** again. Paste the contents of `supabase/seed.sql`
   the same way. Click **Run**.
   - This loads the 12 players, the courses, and the 5 rounds.

7. Now grab your connection info. In the left sidebar click the **Settings**
   gear icon → **API**. You'll see three things you need:
   - **Project URL** (looks like `https://abcd1234.supabase.co`)
   - **Project API keys → `anon` `public`** (a very long string)
   - **Project API keys → `service_role` `secret`** (another long string)

   Keep this tab open — you'll paste these into Vercel next.

> Tip: the `service_role` key is sensitive. It can read/write everything.
> Never share it publicly or commit it to GitHub. We only ever paste it
> into Vercel's environment variables panel.

---

## Part 3 — Vercel deployment (10 min)

Vercel builds and hosts the website. Free tier is plenty.

1. Go to **https://vercel.com** and click **Sign Up**. Use **Continue with
   GitHub** — this lets Vercel see your repos.
2. Once signed in, click **Add New… → Project**.
3. Find `king-kong-cup` in the list and click **Import**.
4. On the configure screen:
   - **Framework Preset:** Next.js (auto-detected — leave it).
   - **Root directory:** Leave at default.
   - Click **Environment Variables** to expand the section.
5. Add these four variables one at a time (Name on the left, Value on the right):

   | Name | Value |
   |------|-------|
   | `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase Project URL |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase `anon public` key |
   | `SUPABASE_SERVICE_ROLE_KEY` | Your Supabase `service_role secret` key |
   | `ADMIN_PASSWORD` | `kingkong2026` (or whatever you want) |
   | `SESSION_SECRET` | A long random string — make one at https://1password.com/password-generator (length 48, letters+numbers) |

6. Click **Deploy**. Wait ~2 minutes for Vercel to build.

7. When it's done, you'll see a "Congratulations" screen with a preview.
   Click **Continue to Dashboard**.

8. On the dashboard you'll see your URL (something like
   `king-kong-cup-xyz.vercel.app`). Click it — your site is live.

### Custom URL (optional)

Vercel gives you a free `.vercel.app` domain. To make it cleaner:

1. From the project dashboard, click **Settings → Domains**.
2. Type `kingkongcup` and pick `kingkongcup.vercel.app` if it's available.
   (Vercel may suggest alternatives if not.)
3. Click **Add**.

---

## Part 4 — Try it out

1. Open your Vercel URL.
2. You should see the King Kong Cup landing page — gold + brown branding,
   the field of 12 ready to go.
3. Click around: **Leaderboard**, **Daily Results**, **Skins**, **Bonus**,
   **Info**. They'll all show empty/awaiting states since no scores are in.
4. Scroll to the very bottom and click **Admin** (small link in footer).
5. Enter the password you set as `ADMIN_PASSWORD` (default `kingkong2026`).
6. You'll see the **Admin Dashboard** with all 5 rounds.

### Entering scores after a round

1. Click into the round (e.g., **Round 1**).
2. **Step 1 — Course & Tee:** pick the tee played. Wolf Creek's 4 tee
   options are pre-loaded. For Sand Hollow / Copper Rock / Black Desert,
   click **+ New tee** and enter the name, rating, and slope from the
   scorecard. The tee saves and the dropdown updates.
3. **Step 2 — Gross Scores:** type each player's gross total.
   Course Handicap & Net auto-fill as you type. Click **Save Round Scores**.
   The leaderboard updates instantly. Handicap adjustments trigger
   automatically if anyone is averaging 5+ strokes better than their
   starting index.
4. **Step 3 — Skins:** enter each player's net-to-par on each hole.
   `0` = net par, `-1` = net birdie, `+1` = net bogey, etc. A live preview
   shows which skins will be awarded. Click **Save Hole Scores**.

That's it. The public pages (leaderboard, daily, skins, bonus) refresh
automatically.

---

## Part 5 — Adding your logo (optional)

I built in a typographic "KKC" monogram as a fallback. To replace it with
your real artwork:

1. Save your logo as `logo.png` (square, ideally 512×512, transparent
   background works best).
2. Go to your GitHub repo, navigate into the `public` folder.
3. Click **Add file → Upload files**. Drag in `logo.png`. Commit.
4. Vercel will auto-redeploy in ~1 minute and the logo appears.

---

## Troubleshooting

**The Vercel build failed.**
Click on the failed deployment → **Build Logs**. Find the red error line
near the bottom. Copy it and paste it to me — I'll diagnose.

**"Supabase env vars missing" when I open the site.**
Vercel didn't pick up your environment variables. In the Vercel project,
go to **Settings → Environment Variables**, double-check the four names
match exactly (case-sensitive), then go to **Deployments**, click the
latest, and choose **Redeploy**.

**Wrong password on /admin.**
You entered an `ADMIN_PASSWORD` in Vercel — try that value. If you forget
it, change it in Vercel **Settings → Environment Variables**, then redeploy.

**A score entry mistake.**
At the bottom of each round's score entry page, there's a small red
"Reset round" link. It clears that round and recomputes everything.

**A player needs to be added / removed / re-indexed mid-trip.**
Supabase → Table Editor → `players` → click the row to edit. Save. The
app will pick it up on next page load.

---

## Day-of cheat sheet

- **After Round 1:** open /admin, click Round 1, save tee + grosses + hole scores. Done.
- **After Round 2:** same, for Round 2. Etc.
- **Between rounds:** point everyone at the Vercel URL on their phones.
  Have them favorite it.
- **Final morning:** make sure all 5 rounds are entered. The bonus page
  will compute Lowest Gross / Lowest Net / Most Birdies automatically.
- **Carryovers:** if zero skins are won in a round, the $300 rolls into
  the next round automatically. After Round 5, any unclaimed pot rolls
  into the main King Kong Cup pot (you'll see "carries forward" on the
  skins page — add that to the winner's payout manually).

Have fun. May the most worthy primate win.
