import { getAll } from "@/lib/data";
import { fmtIndex } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function InfoPage() {
  const { players } = await getAll();
  const sortedPlayers = [...players].sort(
    (a, b) => a.starting_index - b.starting_index,
  );

  return (
    <div className="container-narrow pt-8 pb-12 space-y-8">
      <header>
        <h1 className="h-display text-2xl sm:text-3xl text-brand-cream font-bold">
          Rules & Info
        </h1>
        <p className="text-sm text-brand-cream/70 mt-1">
          Everything you need to know &mdash; the digital master document.
        </p>
      </header>

      <Section title="The Field">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {sortedPlayers.map((p) => (
            <div
              key={p.id}
              className="flex items-center justify-between px-3 py-2 rounded-md bg-brand-dark/30 border border-brand-gold/10"
            >
              <div className="font-medium">{p.name}</div>
              <div className="text-sm text-brand-cream/70 tabular-nums">
                {fmtIndex(p.current_index)}
                {p.current_index !== p.starting_index && (
                  <span className="text-xs text-brand-cream/40 ml-1">
                    (was {fmtIndex(p.starting_index)})
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Schedule">
        <ScheduleDay
          day="Wednesday, May 27"
          title="Travel + Round 1"
          items={[
            "9:55 AM — Depart MCI (Kansas City)",
            "10:55 AM PT — Arrive LAS (Las Vegas)",
            "1:50 / 2:00 / 2:10 PM — Round 1: Wolf Creek Golf Club, Mesquite, NV",
            "Evening — Transfer to Black Desert Resort (lose 1 hr crossing into Utah)",
          ]}
        />
        <ScheduleDay
          day="Thursday, May 28"
          title="Round 2"
          items={[
            "9:21 / 9:32 / 9:43 AM — Round 2: Sand Hollow Resort, Hurricane, UT",
          ]}
        />
        <ScheduleDay
          day="Friday, May 29"
          title="Round 3"
          items={[
            "10:00 / 10:10 / 10:20 AM — Round 3: Copper Rock Golf Course, Hurricane, UT",
          ]}
        />
        <ScheduleDay
          day="Saturday, May 30"
          title="Rounds 4 & 5"
          items={[
            "10:24 / 10:34 / 10:44 AM — Round 4: Black Desert Resort (AM)",
            "4:00 / 4:10 / 4:20 PM — Round 5: Black Desert Resort (PM) — sunset ~8:35 PM",
          ]}
        />
        <ScheduleDay
          day="Sunday, May 31"
          title="Travel Home"
          items={[
            "3:10 PM — Depart LAS (gain 1 hr Utah → Vegas)",
            "8:00 PM — Arrive MCI (Kansas City)",
          ]}
        />
      </Section>

      <Section title="Betting Structure">
        <p className="mb-4 font-serif text-brand-cream/85">
          $500 buy-in &times; 12 = <span className="text-brand-gold font-bold">$6,000 total pot</span>.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Card title="King Kong Cup" amount="$4,000">
            <div className="text-sm space-y-0.5 text-brand-cream/85">
              <div>1st &mdash; $2,500</div>
              <div>2nd &mdash; $1,000</div>
              <div>3rd &mdash; $500</div>
            </div>
          </Card>
          <Card title="Daily Skins" amount="$1,500">
            <div className="text-sm text-brand-cream/85">$300 per round</div>
          </Card>
          <Card title="Bonus Awards" amount="$500">
            <div className="text-sm space-y-0.5 text-brand-cream/85">
              <div>Low Gross — $200</div>
              <div>Low Net — $200</div>
              <div>Net Birdies — $100</div>
            </div>
          </Card>
        </div>
      </Section>

      <Section title="King Kong Cup (Main Event) Rules">
        <ul className="list-disc list-outside ml-5 space-y-2 font-serif text-brand-cream/90">
          <li>Each player&rsquo;s score is the sum of their best 4 of 5 net rounds.</li>
          <li>Lowest cumulative Best-4 Net wins.</li>
          <li>
            Net score = Gross &minus; Course Handicap. Course Handicap = Index &times; (Slope / 113), rounded.
          </li>
          <li>
            <span className="text-brand-gold">Net double bogey cap:</span> the
            most a hole can count for is par + 2 + strokes received. Blow-up
            holes won&rsquo;t torpedo your round (per WHS). Your actual gross
            is still recorded on the scorecard.
          </li>
          <li>
            Marc Hoffmann is playing 4 rounds; his missed round is automatically his drop.
          </li>
        </ul>
      </Section>

      <Section title="Skins Rules">
        <ul className="list-disc list-outside ml-5 space-y-2 font-serif text-brand-cream/90">
          <li>$300 pot per round, split evenly among all skins won that round.</li>
          <li>Par or better (net) is required to win a skin.</li>
          <li>No hole-by-hole carryover within a round.</li>
          <li>
            If zero skins are won in a round, the entire $300 carries to the
            next round.
          </li>
          <li>
            Unclaimed skins after Round 5 roll into the King Kong Cup main event pot.
          </li>
        </ul>
      </Section>

      <Section title="Handicap Fairness Policy">
        <p className="font-serif text-brand-cream/90 mb-3">
          Because not all players carry active GHIN indexes, a rolling
          adjustment applies equally to everyone.
        </p>
        <p className="font-serif text-brand-cream/90 mb-3">
          <span className="text-brand-gold font-semibold">Starting Indexes.</span>{" "}
          Current GHIN index pulled May 20. Eric Gottman (no GHIN) was
          assigned an index before Round 1.
        </p>
        <p className="font-serif text-brand-cream/90 mb-3">
          <span className="text-brand-gold font-semibold">The Rule.</span> After
          each round, the trip averages each player&rsquo;s differentials. If
          that average is 5+ strokes better than their starting index, the trip
          index is reduced by the excess. Adjustments only go down, never up.
        </p>
        <div className="rounded-md border border-brand-gold/30 bg-brand-dark/40 p-4 text-sm font-serif text-brand-cream/90">
          <span className="text-brand-gold font-semibold">Example.</span>{" "}
          Player at 18.0 index averages 11.0 differential after 2 rounds (7 strokes better).
          Excess beyond 5 = 2. New trip index = <span className="text-brand-gold font-bold">16.0</span>.
        </div>
        <p className="font-serif text-brand-cream/90 mt-3">
          One hot round won&rsquo;t trigger it. You have to consistently
          outplay your number. Automatic. No committee. Just math.
        </p>
      </Section>

      <Section title="Logistics">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card title="Transportation">
            <div className="text-sm text-brand-cream/85">
              3 Suburbans (or equivalent vans).
            </div>
          </Card>
          <Card title="Accommodation">
            <div className="text-sm text-brand-cream/85 space-y-0.5">
              <div className="text-brand-gold/90 font-semibold">
                Terrace Collection at Black Desert Resort
              </div>
              <div>2 four-bedroom suites (8 guests)</div>
              <div>1 two-bedroom suite (2 guests)</div>
              <div>1 two-queen bedroom (2 guests)</div>
            </div>
          </Card>
        </div>
        <div className="mt-4 card p-4">
          <div className="h-display text-brand-gold text-xs mb-2">Key Drives</div>
          <ul className="space-y-1 text-sm text-brand-cream/85">
            <li>LAS Airport → Wolf Creek (Mesquite, NV): 80 mi, ~1 hr 20 min</li>
            <li>Wolf Creek → Black Desert Resort (Ivins, UT): 40 mi, ~45 min</li>
            <li>Black Desert → Sand Hollow (Hurricane, UT): 15 mi, ~20 min</li>
            <li>Black Desert → Copper Rock (Hurricane, UT): 15 mi, ~20 min</li>
            <li>Black Desert → LAS Airport (return): 120 mi, ~1 hr 50 min</li>
          </ul>
        </div>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="h-display text-brand-gold text-base sm:text-lg mb-3">
        {title}
      </h2>
      <div className="gold-rule mb-4" />
      {children}
    </section>
  );
}

function ScheduleDay({
  day,
  title,
  items,
}: {
  day: string;
  title: string;
  items: string[];
}) {
  return (
    <div className="card p-4 mb-3">
      <div className="flex items-baseline justify-between mb-2">
        <div className="font-semibold text-brand-cream">{day}</div>
        <div className="text-xs uppercase tracking-widest text-brand-gold">
          {title}
        </div>
      </div>
      <ul className="space-y-1 text-sm font-serif text-brand-cream/90">
        {items.map((it) => (
          <li key={it}>&middot; {it}</li>
        ))}
      </ul>
    </div>
  );
}

function Card({
  title,
  amount,
  children,
}: {
  title: string;
  amount?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="card p-4">
      <div className="flex items-baseline justify-between mb-2">
        <div className="h-display text-brand-gold text-xs">{title}</div>
        {amount && (
          <div className="font-bold text-brand-cream tabular-nums">{amount}</div>
        )}
      </div>
      {children}
    </div>
  );
}
