import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowRight, Activity, BatteryCharging, Bell, BrainCircuit, CloudSun, Gauge, LineChart, Map, PlugZap, ShieldCheck, Wallet, Wrench, Zap, Scale, Mail, Phone } from "lucide-react";
import { Logo } from "@/components/solar/AppShell";
import { EnergySankey } from "@/components/solar/EnergySankey";
import { IMAGES } from "@/lib/fleet";

const HERO = "https://images.unsplash.com/photo-1509391366360-2e959784a276?auto=format&fit=crop&w=1920&q=75";
const OG = "https://images.unsplash.com/photo-1509391366360-2e959784a276?w=1200&h=630&fit=crop";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [
    { title: "SolarOps — Your Energy. One Intelligent View." },
    { name: "description", content: "Monitor solar production, battery storage, consumption and system health in real time. Built for Romanian prosumers and O&M teams." },
    { property: "og:title", content: "SolarOps — Your Energy. One Intelligent View." },
    { property: "og:description", content: "Smart solar monitoring, optimization and predictive maintenance." },
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

const steps = [
  { icon: PlugZap, t: "Connect", d: "Link inverters, batteries and smart meters from any major brand." },
  { icon: Activity, t: "Monitor", d: "Live production, consumption, storage and grid exchange in one view." },
  { icon: BrainCircuit, t: "Optimize", d: "Weather, tariffs and forecasts turn into clear, timed recommendations." },
  { icon: Wrench, t: "Maintain", d: "Detect anomalies early and dispatch technicians before losses grow." },
];
const prosumer = [
  { icon: Zap, t: "Live energy flow", d: "See exactly where every kilowatt goes." },
  { icon: BatteryCharging, t: "Battery intelligence", d: "Time-to-full, health and usage trends." },
  { icon: Wallet, t: "Savings in RON", d: "Self-consumption value, export credits, payback." },
  { icon: Scale, t: "Romanian regulations", d: "Compensation rules explained for your contract." },
];
const om = [
  { icon: Map, t: "Fleet map", d: "Every installation across Romania, by status." },
  { icon: Gauge, t: "Health scores", d: "Expected vs actual, weather-adjusted." },
  { icon: Bell, t: "Smart alerting", d: "Severity, financial impact, no noise." },
  { icon: LineChart, t: "Ticketing", d: "Assign, schedule and resolve in one place." },
];
const brands = ["Huawei", "SMA", "Fronius", "Victron", "Growatt", "SolarEdge", "Enphase", "GoodWe"];

function Landing() {
  return (
    <div className="min-h-screen">
      <nav className="fixed inset-x-0 top-0 z-50 border-b border-border bg-background/60 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <Logo />
          <div className="hidden gap-6 text-sm text-muted-foreground md:flex">
            <a href="#how" className="hover:text-foreground">How it works</a><a href="#features" className="hover:text-foreground">Features</a><a href="#om" className="hover:text-foreground">O&M</a><a href="#why" className="hover:text-foreground">Why SolarOps</a>
          </div>
          <Link to="/dashboard" className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Open app</Link>
        </div>
      </nav>

      <header className="relative overflow-hidden pt-16">
        <img src={HERO} alt="Rooftop solar panels at sunset" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-hero-fade" />
        <div className="relative mx-auto grid max-w-7xl gap-12 px-4 pb-24 pt-24 sm:px-6 lg:grid-cols-2 lg:pt-32">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-background/50 px-3 py-1 text-xs text-muted-foreground backdrop-blur"><span className="h-1.5 w-1.5 rounded-full bg-solar" />Every Watt Matters</span>
            <h1 className="mt-6 text-5xl font-semibold leading-[1.05] sm:text-6xl">Your Energy.<br /><span className="text-solar">One Intelligent View.</span></h1>
            <p className="mt-6 max-w-xl text-lg text-muted-foreground">Monitor solar production, battery storage, energy consumption, and system health in real time. Turn energy data into smarter decisions.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/dashboard" className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 font-semibold text-primary-foreground">Explore Dashboard<ArrowRight className="h-4 w-4" /></Link>
              <a href="#how" className="rounded-xl border border-border bg-background/40 px-5 py-3 font-semibold backdrop-blur hover:bg-accent">How It Works</a>
            </div>
            <div className="mt-12 grid max-w-lg grid-cols-3 gap-6">
              <div><p className="text-3xl font-semibold text-solar"><Counter to={42} /></p><p className="text-xs text-muted-foreground">Sites monitored</p></div>
              <div><p className="text-3xl font-semibold"><Counter to={18.4} decimals={1} suffix=" MWh" /></p><p className="text-xs text-muted-foreground">Produced today</p></div>
              <div><p className="text-3xl font-semibold text-battery"><Counter to={78} suffix="%" /></p><p className="text-xs text-muted-foreground">Self-consumption</p></div>
            </div>
          </div>
          <div className="glass rounded-3xl p-5">
            <div className="flex items-center justify-between text-xs text-muted-foreground"><span>Live · Casa Cluj 2</span><span className="num">13:00</span></div>
            <div className="py-4"><EnergySankey data={{ solar: 31.4, gridImport: 4.1, batteryDischarge: 5.2, batteryCharge: 7.8, gridExport: 9.3, load: 23.6 }} /></div>
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="rounded-xl bg-background/40 p-2"><p className="text-muted-foreground">Today</p><p className="num text-base text-solar">31.4 kWh</p></div>
              <div className="rounded-xl bg-background/40 p-2"><p className="text-muted-foreground">Saved</p><p className="num text-base">38 RON</p></div>
              <div className="rounded-xl bg-background/40 p-2"><p className="text-muted-foreground">Battery</p><p className="num text-base text-battery">72%</p></div>
            </div>
          </div>
        </div>
      </header>

      <section id="how" className="mx-auto max-w-7xl px-4 py-24 sm:px-6">
        <h2 className="text-3xl font-semibold sm:text-4xl">How SolarOps works</h2>
        <div className="mt-10 grid gap-4 md:grid-cols-4">
          {steps.map((s, i) => <div key={s.t} className="glass rounded-2xl p-6"><span className="num text-xs text-muted-foreground">0{i + 1}</span><s.icon className="mt-4 h-6 w-6 text-solar" /><h3 className="mt-4 font-semibold">{s.t}</h3><p className="mt-2 text-sm text-muted-foreground">{s.d}</p></div>)}
        </div>
      </section>

      <section id="features" className="mx-auto grid max-w-7xl items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-2">
        <img src={IMAGES.house} alt="Residential home with solar panels" className="h-[420px] w-full rounded-3xl object-cover" loading="lazy" />
        <div>
          <p className="text-sm text-solar">For prosumers</p>
          <h2 className="mt-2 text-3xl font-semibold sm:text-4xl">Know when to use your own sun.</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">{prosumer.map((f) => <div key={f.t}><f.icon className="h-5 w-5 text-battery" /><h3 className="mt-2 font-semibold">{f.t}</h3><p className="text-sm text-muted-foreground">{f.d}</p></div>)}</div>
        </div>
      </section>

      <section id="om" className="mx-auto grid max-w-7xl items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-2">
        <div className="lg:order-2"><img src={IMAGES.farm} alt="Solar farm" className="h-[420px] w-full rounded-3xl object-cover" loading="lazy" /></div>
        <div>
          <p className="text-sm text-solar">For O&M teams</p>
          <h2 className="mt-2 text-3xl font-semibold sm:text-4xl">Hundreds of sites. One control room.</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">{om.map((f) => <div key={f.t}><f.icon className="h-5 w-5 text-solar" /><h3 className="mt-2 font-semibold">{f.t}</h3><p className="text-sm text-muted-foreground">{f.d}</p></div>)}</div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="glass rounded-3xl p-8">
            <CloudSun className="h-7 w-7 text-solar" /><h3 className="mt-4 text-2xl font-semibold">Intelligent energy optimization</h3>
            <p className="mt-3 text-muted-foreground">Forecasts, battery state and your actual contract tariff decide the best hour to run each appliance — so solar is consumed, not wasted.</p>
            <div className="mt-6 flex gap-1">{Array.from({ length: 24 }).map((_, h) => <div key={h} className={`h-10 flex-1 rounded ${h >= 10 && h <= 15 ? "bg-solar" : h >= 17 && h <= 21 ? "bg-destructive/70" : "bg-warning/50"}`} />)}</div>
          </div>
          <div className="glass rounded-3xl p-8">
            <ShieldCheck className="h-7 w-7 text-battery" /><h3 className="mt-4 text-2xl font-semibold">Predictive maintenance & alerts</h3>
            <p className="mt-3 text-muted-foreground">Weather-aware anomaly detection separates cloudy days from real faults, and estimates the RON lost before a technician is dispatched.</p>
            <div className="mt-6 space-y-2 text-sm">
              <div className="flex justify-between rounded-xl bg-background/40 px-3 py-2"><span>String disconnected · Hala Arad</span><span className="text-destructive">High</span></div>
              <div className="flex justify-between rounded-xl bg-background/40 px-3 py-2"><span>Soiling suspected · Casa Iași</span><span className="text-warning">Medium</span></div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 text-center sm:px-6">
        <p className="text-sm text-muted-foreground">Supported inverter ecosystem</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">{brands.map((b) => <span key={b} className="glass rounded-xl px-5 py-3 font-display font-semibold text-muted-foreground">{b}</span>)}</div>
      </section>

      <section id="why" className="mx-auto max-w-7xl px-4 py-24 sm:px-6">
        <div className="relative overflow-hidden rounded-3xl">
          <img src={IMAGES.field} alt="Field of photovoltaic panels" className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
          <div className="absolute inset-0 bg-background/80" />
          <div className="relative grid gap-8 p-10 md:grid-cols-3 md:p-16">
            <div className="md:col-span-3"><h2 className="text-3xl font-semibold sm:text-4xl">Why SolarOps?</h2></div>
            {[["Built for Romania", "RON, ANRE rules, compensation mechanisms and local suppliers."], ["Honest numbers", "Measured values and estimates are always labelled separately."], ["One platform", "Prosumers and technicians share the same source of truth."]].map(([t, d]) => <div key={t}><h3 className="text-lg font-semibold text-solar">{t}</h3><p className="mt-2 text-muted-foreground">{d}</p></div>)}
            <div className="md:col-span-3"><Link to="/dashboard" className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 font-semibold text-primary-foreground">Explore Dashboard<ArrowRight className="h-4 w-4" /></Link></div>
          </div>
        </div>
      </section>

      <footer className="border-t border-border">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-4">
          <div><Logo /><p className="mt-3 text-sm text-muted-foreground">Every Watt Matters.</p></div>
          <div className="text-sm"><p className="font-semibold">Product</p><div className="mt-3 flex flex-col gap-2 text-muted-foreground"><Link to="/dashboard">Dashboard</Link><Link to="/map">Fleet map</Link><Link to="/operations">O&M center</Link></div></div>
          <div className="text-sm"><p className="font-semibold">Resources</p><div className="mt-3 flex flex-col gap-2 text-muted-foreground"><Link to="/regulations">Regulations</Link><Link to="/forecast">Forecast</Link><a href="https://unsplash.com" target="_blank" rel="noreferrer">Photos: Unsplash</a></div></div>
          <div className="text-sm"><p className="font-semibold">Contact</p><div className="mt-3 flex flex-col gap-2 text-muted-foreground"><span className="flex items-center gap-2"><Mail className="h-4 w-4" />hello@solarops.ro</span><span className="flex items-center gap-2"><Phone className="h-4 w-4" />+40 21 000 0000</span><span>Cluj-Napoca, România</span></div></div>
        </div>
      </footer>
    </div>
  );
}
