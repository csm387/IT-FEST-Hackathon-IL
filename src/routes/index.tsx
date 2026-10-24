import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowRight, Activity, BatteryCharging, Bell, BrainCircuit, Check, CloudSun, Gauge, Map, PlugZap, Wallet, Wrench, Zap, Scale, Mail, ChevronDown, Sun } from "lucide-react";
import { Logo } from "@/components/solar/AppShell";
import { EnergySankey } from "@/components/solar/EnergySankey";
import { IMAGES } from "@/lib/fleet";

const OG = "https://images.unsplash.com/photo-1509391366360-2e959784a276?w=1200&h=630&fit=crop";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [
    { title: "GridPulse — Your Energy. One Intelligent View." },
    { name: "description", content: "Monitor solar production, battery storage, consumption and system health in real time. Built for Romanian prosumers and O&M teams." },
    { property: "og:title", content: "GridPulse — Your Energy. One Intelligent View." },
    { property: "og:description", content: "Smart solar monitoring, optimization and predictive maintenance." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
    { property: "og:image", content: OG },
    { name: "twitter:image", content: OG },
  ]}),
  component: Landing,
});

function Counter({ to, suffix = "", decimals = 0 }: { to: number; suffix?: string; decimals?: number }) {
  const [v, setV] = useState(0);
  useEffect(() => {
    let raf = 0; const start = performance.now();
    const tick = (t: number) => { const p = Math.min(1, (t - start) / 1600); setV(to * (1 - Math.pow(1 - p, 3))); if (p < 1) raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick); return () => cancelAnimationFrame(raf);
  }, [to]);
  return <span className="num">{v.toFixed(decimals)}{suffix}</span>;
}

const brands = ["Huawei", "SMA", "Fronius", "Victron", "Growatt", "SolarEdge", "Enphase", "GoodWe"];
const steps = [
  { icon: PlugZap, t: "Connect", d: "Link inverters, batteries and smart meters from any major brand in minutes." },
  { icon: Activity, t: "Monitor", d: "Production, consumption, storage and grid exchange — live, in one view." },
  { icon: BrainCircuit, t: "Optimize", d: "Weather and tariffs become clear, timed recommendations." },
  { icon: Wrench, t: "Maintain", d: "Catch anomalies early and dispatch technicians before losses grow." },
];
const faqs = [
  ["Which inverters are supported?", "Huawei, SMA, Fronius, Victron, Growatt, SolarEdge, Enphase and GoodWe, with more on the roadmap."],
  ["Does it understand Romanian compensation rules?", "Yes. Savings and export credits follow ANRE prosumer rules and are shown in RON, with estimates clearly labelled."],
  ["Is it only for O&M companies?", "No. Homeowners get a simple personal view; O&M teams get the fleet map, health scores and ticketing."],
  ["How accurate are the forecasts?", "Forecasts use live weather data and each site's history. Actual vs expected is tracked so you can see the gap."],
];

function Landing() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <div className="min-h-screen">
      <nav className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Logo />
          <div className="hidden gap-7 text-sm text-muted-foreground md:flex">
            <a href="#product" className="hover:text-foreground">Product</a>
            <a href="#how" className="hover:text-foreground">How it works</a>
            <a href="#teams" className="hover:text-foreground">For teams</a>
            <a href="#faq" className="hover:text-foreground">FAQ</a>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/dashboard" className="hidden rounded-lg px-3 py-2 text-sm text-muted-foreground hover:text-foreground sm:block">Sign in</Link>
            <Link to="/dashboard" className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Get started</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <header className="mx-auto max-w-6xl px-4 pt-20 text-center sm:px-6 sm:pt-28">
        <Link to="/dashboard" className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-1 py-1 pr-3 text-xs text-muted-foreground hover:text-foreground">
          <span className="rounded-full bg-solar px-2 py-0.5 font-semibold text-background">New</span>
          Live weather forecasts for every site <ArrowRight className="h-3 w-3" />
        </Link>
        <h1 className="mx-auto mt-8 max-w-4xl text-5xl font-semibold leading-[1.02] tracking-tight sm:text-7xl">
          The operating system for <span className="text-solar">solar energy.</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
          GridPulse brings production, batteries, savings and maintenance into one clear view — built for Romanian prosumers and the teams that keep their panels running.
        </p>
        <div className="mt-9 flex flex-wrap justify-center gap-3">
          <Link to="/dashboard" className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 font-semibold text-primary-foreground">Try the live demo <ArrowRight className="h-4 w-4" /></Link>
          <a href="#how" className="rounded-lg border border-border bg-card px-6 py-3 font-semibold hover:bg-accent">See how it works</a>
        </div>
        <p className="mt-4 text-xs text-muted-foreground">No account needed · Demo runs on simulated data</p>

        {/* Product frame */}
        <div id="product" className="mx-auto mt-16 max-w-5xl rounded-2xl border border-border bg-card p-2 text-left">
          <div className="flex items-center gap-1.5 border-b border-border px-3 pb-2 pt-1">
            <span className="h-2.5 w-2.5 rounded-full bg-muted" /><span className="h-2.5 w-2.5 rounded-full bg-muted" /><span className="h-2.5 w-2.5 rounded-full bg-muted" />
            <span className="ml-3 text-xs text-muted-foreground">app.solarops.ro / dashboard</span>
          </div>
          <div className="grid gap-3 p-3 md:grid-cols-[1fr_220px]">
            <div className="rounded-xl border border-border bg-background p-4">
              <div className="flex items-center justify-between text-xs text-muted-foreground"><span>Energy flow · Casa Cluj 2</span><span className="num">Today</span></div>
              <div className="pt-3"><EnergySankey data={{ solar: 31.4, gridImport: 4.1, batteryDischarge: 5.2, batteryCharge: 7.8, gridExport: 9.3, load: 23.6 }} /></div>
            </div>
            <div className="grid gap-3">
              {[["Produced", "31.4 kWh", "text-solar"], ["Saved", "38 RON", ""], ["Battery", "72%", "text-battery"], ["Health", "98 / 100", ""]].map(([l, v, c]) => (
                <div key={l} className="rounded-xl border border-border bg-background p-3"><p className="text-xs text-muted-foreground">{l}</p><p className={`num mt-1 text-xl font-semibold ${c}`}>{v}</p></div>
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* Brands */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <p className="text-center text-xs uppercase tracking-widest text-muted-foreground">Works with the inverters you already have</p>
        <div className="mt-6 grid grid-cols-4 gap-y-4 text-center font-display text-lg font-semibold text-muted-foreground md:grid-cols-8">
          {brands.map((b) => <span key={b}>{b}</span>)}
        </div>
      </section>

      {/* Stats */}
      <section className="border-y border-border">
        <div className="mx-auto grid max-w-6xl grid-cols-2 divide-x divide-border md:grid-cols-4">
          {[[<Counter key="a" to={42} />, "Sites in demo fleet"], [<Counter key="b" to={18.4} decimals={1} suffix=" MWh" />, "Produced today"], [<Counter key="c" to={78} suffix="%" />, "Avg. self-consumption"], [<Counter key="d" to={24} suffix="/7" />, "Fault detection"]].map(([v, l], i) => (
            <div key={i} className="px-6 py-10"><p className="text-3xl font-semibold sm:text-4xl">{v}</p><p className="mt-1 text-sm text-muted-foreground">{l}</p></div>
          ))}
        </div>
      </section>

      {/* Bento */}
      <section className="mx-auto max-w-6xl px-4 py-24 sm:px-6">
        <p className="text-sm font-semibold text-solar">Features</p>
        <h2 className="mt-2 max-w-2xl text-4xl font-semibold tracking-tight">Everything your solar system knows, finally in one place.</h2>
        <div className="mt-12 grid gap-4 md:grid-cols-6">
          <div className="rounded-2xl border border-border bg-card p-6 md:col-span-4">
            <CloudSun className="h-6 w-6 text-solar" />
            <h3 className="mt-4 text-xl font-semibold">Know the best hour to use your sun</h3>
            <p className="mt-2 max-w-md text-sm text-muted-foreground">Forecasts, battery level and your tariff decide when to run each appliance.</p>
            <div className="mt-6 flex items-end gap-1">
              {Array.from({ length: 24 }).map((_, h) => { const s = Math.max(0, Math.sin(((h - 6) / 13) * Math.PI)); return <div key={h} className={`flex-1 rounded-sm ${h >= 10 && h <= 15 ? "bg-solar" : "bg-muted"}`} style={{ height: `${12 + s * 72}px` }} />; })}
            </div>
            <div className="mt-2 flex justify-between text-[10px] text-muted-foreground"><span>00</span><span>Best: 10–15</span><span>23</span></div>
          </div>
          <div className="rounded-2xl border border-border bg-card p-6 md:col-span-2">
            <BatteryCharging className="h-6 w-6 text-battery" />
            <h3 className="mt-4 text-xl font-semibold">Battery intelligence</h3>
            <p className="mt-2 text-sm text-muted-foreground">Time-to-full, health and cycles.</p>
            <div className="mt-6 flex gap-1">{Array.from({ length: 10 }).map((_, i) => <div key={i} className={`h-12 flex-1 rounded-sm ${i < 7 ? "bg-battery" : "bg-muted"}`} />)}</div>
            <p className="num mt-2 text-sm">72% · full in 1h 40m</p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-6 md:col-span-2">
            <Wallet className="h-6 w-6 text-solar" />
            <h3 className="mt-4 text-xl font-semibold">Savings in RON</h3>
            <p className="mt-2 text-sm text-muted-foreground">Self-consumption value, export credits and payback.</p>
            <p className="num mt-6 text-4xl font-semibold">1 146 <span className="text-base text-muted-foreground">RON / month</span></p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-6 md:col-span-2">
            <Bell className="h-6 w-6 text-destructive" />
            <h3 className="mt-4 text-xl font-semibold">Alerts that matter</h3>
            <div className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between rounded-lg bg-background px-3 py-2"><span>String offline · Arad</span><span className="text-destructive">High</span></div>
              <div className="flex justify-between rounded-lg bg-background px-3 py-2"><span>Soiling · Iași</span><span className="text-warning">Med</span></div>
            </div>
          </div>
          <div className="rounded-2xl border border-border bg-card p-6 md:col-span-2">
            <Scale className="h-6 w-6 text-battery" />
            <h3 className="mt-4 text-xl font-semibold">Romanian rules, explained</h3>
            <p className="mt-2 text-sm text-muted-foreground">ANRE compensation and prosumer limits in plain language.</p>
          </div>
        </div>
      </section>

      {/* How */}
      <section id="how" className="border-t border-border bg-card/40">
        <div className="mx-auto max-w-6xl px-4 py-24 sm:px-6">
          <p className="text-sm font-semibold text-solar">How it works</p>
          <h2 className="mt-2 text-4xl font-semibold tracking-tight">Live in four steps.</h2>
          <div className="mt-12 grid gap-8 md:grid-cols-4">
            {steps.map((s, i) => (
              <div key={s.t} className="border-l border-border pl-5">
                <span className="num text-xs text-muted-foreground">0{i + 1}</span>
                <s.icon className="mt-3 h-6 w-6 text-solar" />
                <h3 className="mt-3 font-semibold">{s.t}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Audiences */}
      <section id="teams" className="mx-auto grid max-w-6xl gap-4 px-4 py-24 sm:px-6 md:grid-cols-2">
        {[
          { img: IMAGES.house, tag: "For homeowners", t: "Know when to use your own sun.", items: ["Live energy flow", "Savings and payback in RON", "Battery health and forecasts"], icon: Zap },
          { img: IMAGES.farm, tag: "For O&M teams", t: "Hundreds of sites. One control room.", items: ["Fleet map across Romania", "Weather-adjusted health scores", "Tickets and technician scheduling"], icon: Map },
        ].map((a) => (
          <div key={a.tag} className="overflow-hidden rounded-2xl border border-border bg-card">
            <img src={a.img} alt={a.tag} className="h-56 w-full object-cover" loading="lazy" />
            <div className="p-7">
              <p className="flex items-center gap-2 text-sm text-solar"><a.icon className="h-4 w-4" />{a.tag}</p>
              <h3 className="mt-2 text-2xl font-semibold">{a.t}</h3>
              <ul className="mt-5 space-y-2 text-sm">{a.items.map((it) => <li key={it} className="flex items-center gap-2"><Check className="h-4 w-4 text-battery" />{it}</li>)}</ul>
            </div>
          </div>
        ))}
      </section>

      {/* FAQ */}
      <section id="faq" className="mx-auto max-w-3xl px-4 pb-24 sm:px-6">
        <h2 className="text-center text-4xl font-semibold tracking-tight">Questions</h2>
        <div className="mt-10 divide-y divide-border border-y border-border">
          {faqs.map(([q, a], i) => (
            <div key={q}>
              <button onClick={() => setOpen(open === i ? null : i)} className="flex w-full items-center justify-between py-5 text-left font-semibold">
                {q}<ChevronDown className={`h-4 w-4 shrink-0 transition-transform ${open === i ? "rotate-180" : ""}`} />
              </button>
              {open === i && <p className="pb-5 text-sm text-muted-foreground">{a}</p>}
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-4 pb-24 sm:px-6">
        <div className="rounded-2xl bg-solar px-8 py-14 text-center text-background sm:px-16">
          <Sun className="mx-auto h-8 w-8" />
          <h2 className="mx-auto mt-4 max-w-2xl text-4xl font-semibold tracking-tight">Every watt matters. Start seeing them.</h2>
          <p className="mx-auto mt-3 max-w-lg opacity-80">Open the demo and explore a full fleet of Romanian installations.</p>
          <Link to="/dashboard" className="mt-8 inline-flex items-center gap-2 rounded-lg bg-background px-6 py-3 font-semibold text-foreground">Open the dashboard <ArrowRight className="h-4 w-4" /></Link>
        </div>
      </section>

      <footer className="border-t border-border">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-4">
          <div><Logo /><p className="mt-3 text-sm text-muted-foreground">Every Watt Matters.</p></div>
          <div className="text-sm"><p className="font-semibold">Product</p><div className="mt-3 flex flex-col gap-2 text-muted-foreground"><Link to="/dashboard">Dashboard</Link><Link to="/map">Fleet map</Link><Link to="/operations">O&M center</Link></div></div>
          <div className="text-sm"><p className="font-semibold">Resources</p><div className="mt-3 flex flex-col gap-2 text-muted-foreground"><Link to="/regulations">Regulations</Link><Link to="/forecast">Forecast</Link><a href="https://unsplash.com" target="_blank" rel="noreferrer">Photos: Unsplash</a></div></div>
          <div className="text-sm"><p className="font-semibold">Contact</p><div className="mt-3 flex flex-col gap-2 text-muted-foreground"><span className="flex items-center gap-2"><Mail className="h-4 w-4" />hello@solarops.ro</span><span className="flex items-center gap-2"><Gauge className="h-4 w-4" />Cluj-Napoca, România</span></div></div>
        </div>
      </footer>
    </div>
  );
}
