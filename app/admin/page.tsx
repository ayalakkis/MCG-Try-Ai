import Image from "next/image";
import { redirect } from "next/navigation";
import {
  getLeads,
  getOverview,
  getSessions,
  isRange,
  kuwaitTime,
  RANGES,
  type DayCounts,
  type Lead,
  type Overview,
  type Range,
  type Ranked,
  type Session,
} from "@/lib/server/admin";
import { isAdmin } from "@/lib/server/adminAuth";
import type { Brief } from "@/lib/services/types";
import s from "./admin.module.css";

export const dynamic = "force-dynamic";

type Tab = "overview" | "sessions" | "leads";
const TABS: Tab[] = ["overview", "sessions", "leads"];

const pct = (part: number, whole: number) => (whole ? `${Math.round((part / whole) * 100)}%` : "–");

/** "just now", "12 min ago", "3 h ago", else "19 Oct, 21:04". */
function when(iso: string): string {
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (min < 1) return "just now";
  if (min < 60) return `${min} min ago`;
  if (min < 12 * 60) return `${Math.round(min / 60)} h ago`;
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Kuwait" }).format(new Date(iso));
}

const href = (tab: Tab, range: Range, q = "") => {
  const p = new URLSearchParams();
  if (tab !== "overview") p.set("tab", tab);
  if (range !== "7d") p.set("range", range);
  if (q) p.set("q", q);
  const str = p.toString();
  return `/admin${str ? `?${str}` : ""}`;
};

/** "Bloom Coffee · Specialty café" or just the business type. */
function business(b: Brief) {
  return (
    <>
      {b.brandName && <strong>{b.brandName}</strong>}
      {b.brandName && b.business?.en ? " · " : ""}
      {b.business?.en ?? (b.brandName ? "" : "–")}
    </>
  );
}

/**
 * /admin: the booth dashboard. Overview (numbers + charts), Sessions (everyone who got a plan)
 * and Leads (people who asked MCG to contact them), over a chosen date range.
 */
export default async function AdminPage({ searchParams }: { searchParams: Promise<{ tab?: string; range?: string; q?: string }> }) {
  if (!(await isAdmin())) redirect("/admin/login");
  const sp = await searchParams;
  const tab: Tab = TABS.includes(sp.tab as Tab) ? (sp.tab as Tab) : "overview";
  const range: Range = isRange(sp.range) ? sp.range : "7d";
  const q = (sp.q ?? "").slice(0, 100);

  const [overview, sessions, leads] = await Promise.all([
    getOverview(range),
    getSessions(range, tab === "sessions" ? q : ""),
    getLeads(range, tab === "leads" ? q : ""),
  ]);
  const updated = kuwaitTime(new Date().toISOString()).slice(11);

  return (
    <div className={s.shell}>
      <header className={s.bar}>
        <div className={s.barInner}>
          <Image src="/brand/mcg-mark-color.png" alt="MCG" width={900} height={345} className={s.logo} priority />
          <span className={s.divider} aria-hidden="true" />
          <span className={s.product}>Try AI · booth dashboard</span>
          <span className={s.spacer} />
          <span className={s.updated}>Updated {updated} Kuwait time</span>
          <a className={s.textLink} href={href(tab, range, q)}>
            Refresh
          </a>
          <form method="post" action="/api/admin/logout">
            <button className={s.textLink} type="submit">
              Sign out
            </button>
          </form>
        </div>
      </header>

      <main className={s.main}>
        {!overview || !sessions || !leads ? (
          <p className={s.notice}>There&apos;s no database connected yet. Set DATABASE_URL and run npm run db:migrate.</p>
        ) : (
          <>
            <div className={s.head}>
              <div>
                <h1 className={s.title}>Booth dashboard</h1>
                <p className={s.lede}>What happened at the MCG Try AI booth, {RANGES[range].toLowerCase()}.</p>
              </div>
              <nav className={s.ranges} aria-label="Date range">
                {(Object.keys(RANGES) as Range[]).map((r) => (
                  <a key={r} href={href(tab, r, q)} className={r === range ? s.rangeOn : s.range} aria-current={r === range ? "true" : undefined}>
                    {RANGES[r]}
                  </a>
                ))}
              </nav>
            </div>

            <nav className={s.tabs} aria-label="Sections">
              <a href={href("overview", range)} className={tab === "overview" ? s.tabOn : s.tab}>
                Overview
              </a>
              <a href={href("sessions", range)} className={tab === "sessions" ? s.tabOn : s.tab}>
                Sessions <span className={s.count}>{overview.sessions}</span>
              </a>
              <a href={href("leads", range)} className={tab === "leads" ? s.tabOn : s.tab}>
                Leads <span className={s.count}>{overview.leads}</span>
              </a>
            </nav>

            {tab === "overview" && <OverviewTab o={overview} range={range} />}
            {tab === "sessions" && <SessionsTab sessions={sessions} range={range} q={q} />}
            {tab === "leads" && <LeadsTab leads={leads} range={range} q={q} />}
          </>
        )}
      </main>
    </div>
  );
}

/* ---------------- Overview ---------------- */

function OverviewTab({ o, range }: { o: Overview; range: Range }) {
  const visitors = o.totals.session_started;
  const completed = o.totals.brief_completed;
  const emailed = o.totals.email_sent;
  const kpis = [
    { n: visitors, label: "Visitors", explain: "Started talking to the AI", rate: null },
    { n: completed, label: "Completed", explain: "Answered all four questions and got a plan", rate: `${pct(completed, visitors)} of visitors` },
    { n: emailed, label: "Emailed", explain: "Asked for the full plan by email", rate: `${pct(emailed, completed)} of completed` },
    { n: o.leads, label: "Leads", explain: "Said MCG can contact them", rate: `${pct(o.leads, emailed)} of emailed`, hot: true },
  ];

  return (
    <>
      <section className={s.kpis}>
        {kpis.map((k) => (
          <div key={k.label} className={s.kpi}>
            <span className={s.kpiLabel}>{k.label}</span>
            <span className={k.hot ? `${s.kpiNum} ${s.kpiHot}` : s.kpiNum}>{k.n}</span>
            <span className={s.kpiExplain}>{k.explain}</span>
            {k.rate && <span className={s.kpiRate}>{k.rate}</span>}
          </div>
        ))}
      </section>

      <section className={s.twoCol}>
        <div className={s.panel}>
          <div className={s.panelHead}>
            <h2 className={s.h2}>Visitors per day</h2>
            <p className={s.sub}>{range === "today" ? "Last 14 days, for context" : "Each column is one day; colours show how far people got"}</p>
          </div>
          <DayChart days={o.days} />
        </div>
        <div className={s.panel}>
          <div className={s.panelHead}>
            <h2 className={s.h2}>Language</h2>
            <p className={s.sub}>Which language visitors used on screen</p>
          </div>
          <LangSplit en={o.byLang.en} ar={o.byLang.ar} />
          <Rhythm days={o.days} />
        </div>
      </section>

      <section className={s.panel}>
        <div className={s.panelHead}>
          <h2 className={s.h2}>Who came to the booth</h2>
          <p className={s.sub}>From the answers of everyone who got a plan ({o.sessions})</p>
        </div>
        <div className={s.lists}>
          <TopList title="Business" items={o.topBusinesses} />
          <TopList title="Area" items={o.topAreas} />
          <TopList title="Goal" items={o.topGoals} />
          <TopList title="Audience" items={o.topAudiences} />
        </div>
      </section>
    </>
  );
}

const dayName = (day: string) =>
  new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", timeZone: "UTC" }).format(new Date(`${day}T00:00:00Z`));

/** Stacked columns per day: emailed / completed only / started only. */
function DayChart({ days }: { days: DayCounts[] }) {
  if (!days.length) return <p className={s.empty}>No visitors in this period.</p>;
  const max = Math.max(1, ...days.map((d) => d.counts.session_started));
  return (
    <>
      <div className={s.chart} role="img" aria-label="Visitors per day">
        {days.map((d) => {
          const started = d.counts.session_started;
          const done = Math.min(started, d.counts.brief_completed);
          const mailed = Math.min(done, d.counts.email_sent);
          const h = (n: number) => `${(n / max) * 100}%`;
          return (
            <div key={d.day} className={s.col} title={`${d.day}: ${started} visitors, ${done} completed, ${mailed} emailed`}>
              <span className={s.colNum}>{started}</span>
              <div className={s.colBar}>
                <span className={s.segStarted} style={{ height: h(started - done) }} />
                <span className={s.segDone} style={{ height: h(done - mailed) }} />
                <span className={s.segMailed} style={{ height: h(mailed) }} />
              </div>
              <span className={s.colDay}>{dayName(d.day)}</span>
            </div>
          );
        })}
      </div>
      <p className={s.legend}>
        <span className={`${s.key} ${s.segMailed}`} /> emailed the plan
        <span className={`${s.key} ${s.segDone}`} /> completed, no email
        <span className={`${s.key} ${s.segStarted}`} /> left before the end
      </p>
    </>
  );
}

function LangSplit({ en, ar }: { en: number; ar: number }) {
  const total = en + ar;
  if (!total) return <p className={s.empty}>No visitors in this period.</p>;
  return (
    <div className={s.lang}>
      <div className={s.langBar} aria-hidden="true">
        <span className={s.langEn} style={{ width: `${(en / total) * 100}%` }} />
        <span className={s.langAr} style={{ width: `${(ar / total) * 100}%` }} />
      </div>
      <div className={s.langRows}>
        <div>
          <span className={`${s.key} ${s.langEn}`} />
          <span className={s.langName}>English</span>
          <span className={s.langNum}>{en}</span>
          <span className={s.langPct}>{pct(en, total)}</span>
        </div>
        <div>
          <span className={`${s.key} ${s.langAr}`} />
          <span className={s.langName}>Arabic · عربي</span>
          <span className={s.langNum}>{ar}</span>
          <span className={s.langPct}>{pct(ar, total)}</span>
        </div>
      </div>
    </div>
  );
}

/** Busiest day and the daily average, under the language split. */
function Rhythm({ days }: { days: DayCounts[] }) {
  const active = days.filter((d) => d.counts.session_started > 0);
  if (!active.length) return null;
  const busiest = active.reduce((a, b) => (b.counts.session_started > a.counts.session_started ? b : a));
  const avg = Math.round(active.reduce((n, d) => n + d.counts.session_started, 0) / active.length);
  const long = new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${busiest.day}T00:00:00Z`));
  return (
    <dl className={s.facts}>
      <div>
        <dt>Busiest day</dt>
        <dd>
          {long} · {busiest.counts.session_started} visitors
        </dd>
      </div>
      <div>
        <dt>Average per open day</dt>
        <dd>{avg} visitors</dd>
      </div>
    </dl>
  );
}

function TopList({ title, items }: { title: string; items: Ranked[] }) {
  const max = Math.max(1, ...items.map((i) => i.count));
  return (
    <div className={s.list}>
      <h3 className={s.h3}>{title}</h3>
      {items.length ? (
        <ol className={s.rank}>
          {items.map((i) => (
            <li key={i.label}>
              <span className={s.rankLabel}>{i.label}</span>
              <span className={s.rankNum}>{i.count}</span>
              <span className={s.rankBar} style={{ width: `${(i.count / max) * 100}%` }} aria-hidden="true" />
            </li>
          ))}
        </ol>
      ) : (
        <p className={s.muted}>No data yet</p>
      )}
    </div>
  );
}

/* ---------------- Sessions ---------------- */

function Search({ tab, range, q, placeholder }: { tab: Tab; range: Range; q: string; placeholder: string }) {
  return (
    <form className={s.search} method="get" action="/admin" role="search">
      <input type="hidden" name="tab" value={tab} />
      {range !== "7d" && <input type="hidden" name="range" value={range} />}
      <svg className={s.searchIcon} viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="11" cy="11" r="6.5" />
        <path d="M16 16l4 4" />
      </svg>
      <input className={s.searchInput} type="search" name="q" defaultValue={q} placeholder={placeholder} aria-label="Search" />
      {q && (
        <a className={s.clear} href={href(tab, range)}>
          Clear
        </a>
      )}
    </form>
  );
}

function Outcome({ emailed, lead }: { emailed: boolean; lead: boolean }) {
  if (lead) return <span className={`${s.badge} ${s.badgeLead}`}>Lead</span>;
  if (emailed) return <span className={`${s.badge} ${s.badgeMail}`}>Emailed</span>;
  return <span className={`${s.badge} ${s.badgeNone}`}>No email</span>;
}

function SessionsTab({ sessions, range, q }: { sessions: Session[]; range: Range; q: string }) {
  return (
    <section className={s.block}>
      <div className={s.blockHead}>
        <div>
          <h2 className={s.h2}>Sessions</h2>
          <p className={s.sub}>
            Everyone who got a plan, with or without an email. {q ? `${sessions.length} matching “${q}”.` : `${sessions.length} shown, newest first.`}
          </p>
        </div>
        <Search tab="sessions" range={range} q={q} placeholder="Business, area, strategy…" />
      </div>
      {sessions.length ? (
        <div className={s.tableWrap}>
          <table className={s.table}>
            <thead>
              <tr>
                <th>When</th>
                <th>Business</th>
                <th>Area</th>
                <th>Wants</th>
                <th>Strategy</th>
                <th>Outcome</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((x) => (
                <tr key={x.id}>
                  <td className={s.nowrap}>
                    <div>{when(x.createdAt)}</div>
                    <div className={s.muted}>{x.lang === "ar" ? "Arabic" : "English"}</div>
                  </td>
                  <td>{business(x.brief)}</td>
                  <td className={s.nowrap}>{x.brief.location?.en ?? "–"}</td>
                  <td>
                    <div>{x.brief.goal?.en ?? "–"}</div>
                    <div className={s.muted}>{x.brief.audience?.en}</div>
                  </td>
                  <td>
                    <div className={s.campaign}>{x.strategyName.en}</div>
                    <div className={s.campaignAr} dir="rtl" lang="ar">
                      {x.strategyName.ar}
                    </div>
                  </td>
                  <td>
                    <Outcome emailed={x.emailed} lead={x.lead} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className={s.empty}>{q ? "Nothing matches that search." : "No sessions in this period."}</p>
      )}
    </section>
  );
}

/* ---------------- Leads ---------------- */

function LeadsTab({ leads, range, q }: { leads: Lead[]; range: Range; q: string }) {
  const csv = `/api/admin/leads.csv?${new URLSearchParams({ range, ...(q ? { q } : {}) })}`;
  return (
    <section className={s.block}>
      <div className={s.blockHead}>
        <div>
          <h2 className={s.h2}>Leads</h2>
          <p className={s.sub}>
            People who emailed themselves the plan and ticked “MCG can contact me”.{" "}
            {q ? `${leads.length} matching “${q}”.` : `${leads.length}${leads.length === 500 ? "+" : ""} in this period.`}
          </p>
        </div>
        <div className={s.tools}>
          <Search tab="leads" range={range} q={q} placeholder="Name, email, business…" />
          <a className={s.export} href={csv}>
            Export CSV
          </a>
        </div>
      </div>
      {leads.length ? (
        <div className={s.tableWrap}>
          <table className={s.table}>
            <thead>
              <tr>
                <th>Person</th>
                <th>Business</th>
                <th>Wants</th>
                <th>Strategy</th>
                <th className={s.right}>When</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((l) => (
                <tr key={l.id}>
                  <td>
                    <div className={s.person} dir="auto">
                      {l.name || <span className={s.noName}>No name given</span>}
                    </div>
                    <a className={s.email} href={`mailto:${l.email}`}>
                      {l.email}
                    </a>
                  </td>
                  <td>
                    <div>{business(l.brief)}</div>
                    <div className={s.muted}>{l.brief.location?.en}</div>
                  </td>
                  <td>
                    <div>{l.brief.goal?.en ?? "–"}</div>
                    <div className={s.muted}>{l.brief.audience?.en}</div>
                  </td>
                  <td>
                    <div className={s.campaign}>{l.strategyName.en}</div>
                    <div className={s.campaignAr} dir="rtl" lang="ar">
                      {l.strategyName.ar}
                    </div>
                  </td>
                  <td className={s.right}>
                    <div className={s.nowrap}>{when(l.createdAt)}</div>
                    <div className={s.muted}>{l.lang === "ar" ? "Arabic" : "English"}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className={s.empty}>{q ? "Nobody matches that search." : "No leads in this period."}</p>
      )}
    </section>
  );
}
