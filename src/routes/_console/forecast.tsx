import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Area, Bar, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Thermometer, Cloud, Sun, Wind, Sunrise, Sunset } from "lucide-react";
import { Kpi, PageHeader, Panel, axis, chartTooltip, fmt } from "@/components/solar/ui";
import { getSites, siteDay } from "@/lib/fleet";
import { pvFromIrradiance, weatherLabel, weatherQuery } from "@/lib/weather";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_console/forecast")({
  head: () => ({ meta: [
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { title: "Weather & Solar Forecast — SolarOps" },
    { name: "description", content: "Live Open-Meteo weather, irradiance and 48h solar production forecast per installation." },
    { property: "og:title", content: "Weather & Solar Forecast — SolarOps" },
    { property: "og:description", content: "Live weather and 48h solar forecast per installation." },
  ]}),
  component: ForecastPage,
});

function ForecastPage() {
  const sites = getSites();
  const [id, setId] = useState(sites[0].id);
  const site = sites.find((s) => s.id === id)!;
  const { data: w, isLoading, isError } = useQuery(weatherQuery(site.lat, site.lng));
  const day = useMemo(() => siteDay(site), [site]);

  const forecast = useMemo(() => {
    if (!w) return [];
    const nowIdx = Math.max(0, w.hourly.time.findIndex((t) => new Date(t) >= new Date()) - 1);
    return w.hourly.time.slice(nowIdx, nowIdx + 48).map((t, i) => ({
      label: t.slice(11, 16) === "00:00" ? t.slice(5, 10) : t.slice(11, 16),
      kw: +pvFromIrradiance(site.kWp, w.hourly.shortwave_radiation[nowIdx + i], w.hourly.temperature_2m[nowIdx + i]).toFixed(2),
      cloud: w.hourly.cloud_cover[nowIdx + i],
    }));
  }, [w, site.kWp]);

  const avp = day.map((p) => ({ label: p.label, actual: p.solar, expected: p.expected, gap: +(Math.max(0, p.expected - p.solar)).toFixed(2) }));
  const totA = avp.reduce((a, b) => a + b.actual, 0), totE = avp.reduce((a, b) => a + b.expected, 0);
  const dev = 1 - totA / totE;

  return (
    <div>
      <PageHeader title="Weather & solar forecast" subtitle={`${site.name} · ${site.city} · ${site.kWp} kWp`}
        actions={<Select value={id} onValueChange={setId}><SelectTrigger className="w-64"><SelectValue /></SelectTrigger><SelectContent>{sites.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent></Select>} />
      {isError && <p className="mb-4 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm">Weather service unavailable right now. Try again shortly.</p>}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {isLoading || !w ? Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-2xl" />) : <>
          <Kpi icon={Thermometer} label="Temperature" value={fmt(w.current.temperature_2m)} unit="°C" tone="warning" hint={weatherLabel(w.current.weather_code)} />
          <Kpi icon={Cloud} label="Cloud cover" value={w.current.cloud_cover} unit="%" tone="home" />
          <Kpi icon={Sun} label="Irradiance (GHI)" value={Math.round(w.current.shortwave_radiation)} unit="W/m²" />
          <Kpi icon={Wind} label="Wind speed" value={fmt(w.current.wind_speed_10m)} unit="km/h" tone="battery" />
          <Kpi icon={Sunrise} label="Sunrise" value={w.daily.sunrise[0].slice(11)} tone="warning" />
          <Kpi icon={Sunset} label="Sunset" value={w.daily.sunset[0].slice(11)} tone="grid" />
        </>}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <Panel title="Solar production forecast · next 48h" className="xl:col-span-2" action={<span className="text-xs text-muted-foreground">Open-Meteo irradiance × kWp × PR 0.82</span>}>
          <div className="h-72">{forecast.length ? <ResponsiveContainer>
            <ComposedChart data={forecast}>
              <defs><linearGradient id="gf" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="var(--solar)" stopOpacity={0.5} /><stop offset="1" stopColor="var(--solar)" stopOpacity={0} /></linearGradient></defs>
              <CartesianGrid stroke="var(--border)" vertical={false} />
              <XAxis dataKey="label" {...axis} interval={5} /><YAxis {...axis} unit=" kW" /><YAxis yAxisId="c" orientation="right" {...axis} unit="%" />
              <Tooltip {...chartTooltip} /><Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar yAxisId="c" dataKey="cloud" name="Cloud %" fill="var(--grid)" opacity={0.25} />
              <Area dataKey="kw" name="Forecast kW" stroke="var(--solar)" fill="url(#gf)" strokeWidth={2} />
            </ComposedChart>
          </ResponsiveContainer> : <Skeleton className="h-full rounded-xl" />}</div>
        </Panel>
        <Panel title="7-day outlook">
          <div className="space-y-2">{w?.daily.time.map((d, i) => (
            <div key={d} className="flex items-center justify-between rounded-xl bg-background/40 px-3 py-2 text-sm">
              <span className="w-12 text-muted-foreground">{new Date(d).toLocaleDateString("en-GB", { weekday: "short" })}</span>
              <span className="flex-1 truncate">{weatherLabel(w.daily.weather_code[i])}</span>
              <span className="num text-xs text-solar">{fmt(w.daily.shortwave_radiation_sum[i], 0)} MJ/m²</span>
              <span className="num ml-3 w-16 text-right">{Math.round(w.daily.temperature_2m_min[i])}° / {Math.round(w.daily.temperature_2m_max[i])}°</span>
            </div>
          )) ?? <Skeleton className="h-72 rounded-xl" />}</div>
        </Panel>
      </div>

      <Panel className="mt-6" title="Actual vs expected production · today" action={<span className={`text-xs ${dev > 0.1 ? "text-warning" : "text-solar"}`}>Deviation {Math.round(dev * 100)}%</span>}>
        <div className="h-72"><ResponsiveContainer>
          <ComposedChart data={avp}>
            <CartesianGrid stroke="var(--border)" vertical={false} />
            <XAxis dataKey="label" {...axis} interval={2} /><YAxis {...axis} unit=" kW" />
            <Tooltip {...chartTooltip} /><Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="gap" name="Shortfall" fill="var(--destructive)" opacity={0.5} radius={[4, 4, 0, 0]} />
            <Line dataKey="expected" name="Expected (PVGIS-style model)" stroke="var(--muted-foreground)" strokeDasharray="5 5" dot={false} />
            <Line dataKey="actual" name="Actual (measured)" stroke="var(--solar)" strokeWidth={2} dot={false} />
          </ComposedChart>
        </ResponsiveContainer></div>
        <p className="mt-3 text-xs text-muted-foreground">Expected yield uses a PVGIS-style long-term model for location, tilt 30°, azimuth south, 14% system losses. It is a historical average — not a live weather forecast. {w && w.current.cloud_cover > 70 ? "Heavy cloud cover today: the deviation is likely weather-related." : dev > 0.1 ? "Clear conditions with a persistent gap suggest a possible equipment issue." : ""}</p>
      </Panel>
    </div>
  );
}
