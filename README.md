# The King Kong Cup

A branded golf-tournament scoring app built for Tae Kong's 50th birthday
trip — St. George, Utah, May 27–31, 2026. 12 men, 5 rounds, best-4-net,
daily skins, bonus awards.

## For the user

**You don't need to know any code to use this.** See **[SETUP.md](./SETUP.md)**
for step-by-step instructions to put the site online with GitHub +
Supabase + Vercel. Allow about 45 minutes the first time.

After setup, the live site has:

- **Landing page** — hero, tagline, top-3 leaderboard preview
- **Leaderboard** — full standings, best-4-net, drop indicators, movement arrows
- **Daily Results** — round-by-round breakdown with skins earnings per player
- **Skins** — round-by-round skin holes + running totals + carry tracking
- **Bonus Awards** — Lowest Gross / Lowest Net / Most Net Birdies (auto-computed)
- **Rules & Info** — schedule, betting structure, handicap policy, field
- **Admin** — password-protected score entry (gross totals + hole-by-hole skins)

## For developers

Standard Next.js 14 App Router + TypeScript + Tailwind + Supabase.

```bash
npm install
npm run dev
```

Required env vars (see `.env.example`):
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ADMIN_PASSWORD`
- `SESSION_SECRET`

Database schema in `supabase/schema.sql`; seed data in `supabase/seed.sql`.

### Scoring logic

- Course Handicap = round(Index × Slope / 113)
- Net = Gross − CH
- Differential = (Gross − Rating) × 113 / Slope
- King Kong Cup standings = best 4 of 5 net scores (missing rounds are automatic drops)
- Skin = sole lowest net-to-par on a hole AND ≤ 0
- $300 pot per round, divided by skins won; carries forward if zero
- Handicap adjustment after each round: if avg differential is 5+ strokes
  better than starting index, current index drops by the excess. One-way
  (down only).

### Project structure

```
src/
  app/
    page.tsx                       Landing
    leaderboard/page.tsx
    daily/page.tsx
    skins/page.tsx
    bonus/page.tsx
    info/page.tsx
    admin/
      page.tsx                     Admin dashboard
      login/                       Password login
      rounds/[round]/              Per-round score entry
      actions.ts                   Server actions
  components/
    Nav.tsx Footer.tsx Logo.tsx LeaderboardTable.tsx
  lib/
    supabase.ts auth.ts types.ts data.ts format.ts
    scoring.ts skins.ts handicap.ts
supabase/
  schema.sql seed.sql
```
