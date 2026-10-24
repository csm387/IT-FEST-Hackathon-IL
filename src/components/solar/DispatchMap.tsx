import { useEffect, useRef } from "react";
import L from "leaflet";
import type { Site } from "@/lib/energy";
import type { Crew, Job } from "@/lib/dispatch";

const COLORS: Record<Site["status"], string> = { normal: "var(--success)", under: "var(--warning)", critical: "var(--destructive)", offline: "var(--offline)" };

export default function DispatchMap({ sites, crews, jobs, selected, onSelect }: { sites: Site[]; crews: Crew[]; jobs: Job[]; selected: string | null; onSelect: (jobId: string) => void }) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const layer = useRef<L.LayerGroup | null>(null);
  const sel = useRef(onSelect); sel.current = onSelect;

  useEffect(() => {
    if (!el.current || map.current) return;
    map.current = L.map(el.current).setView([45.9, 25], 7);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: "© OpenStreetMap contributors", maxZoom: 18 }).addTo(map.current);
    layer.current = L.layerGroup().addTo(map.current);
    return () => { map.current?.remove(); map.current = null; };
  }, []);

  useEffect(() => {
    const g = layer.current; if (!g) return;
    g.clearLayers();
    const byId = Object.fromEntries(sites.map((s) => [s.id, s]));
    sites.forEach((s) => {
      const job = jobs.find((j) => j.siteId === s.id && j.status !== "Resolved");
      const size = job ? 18 : 10;
      const ring = job && job.id === selected ? "var(--foreground)" : "var(--background)";
      const icon = L.divIcon({ className: "", iconSize: [size, size], html: `<span style="display:block;width:${size}px;height:${size}px;border-radius:999px;background:${COLORS[s.status]};border:3px solid ${ring}"></span>` });
      const m = L.marker([s.lat, s.lng], { icon }).bindTooltip(`${s.name}${job ? " · " + job.id : ""}`);
      if (job) m.on("click", () => sel.current(job.id));
      g.addLayer(m);
    });
    crews.forEach((c) => {
      const icon = L.divIcon({ className: "", iconSize: [28, 28], html: `<span style="display:grid;place-items:center;width:28px;height:28px;border-radius:8px;background:var(--primary);color:var(--primary-foreground);font:700 11px sans-serif;border:2px solid var(--background)">${c.name.split(" ")[1]?.slice(0, 2).toUpperCase()}</span>` });
      g.addLayer(L.marker([c.lat, c.lng], { icon }).bindTooltip(c.name));
    });
    jobs.filter((j) => j.crewId && j.status !== "Resolved").forEach((j) => {
      const c = crews.find((x) => x.id === j.crewId); const s = byId[j.siteId];
      if (c && s) g.addLayer(L.polyline([[c.lat, c.lng], [s.lat, s.lng]], { color: "var(--primary)", weight: j.id === selected ? 3 : 1.5, dashArray: j.status === "En route" ? undefined : "4 6" }));
    });
  }, [sites, crews, jobs, selected]);

  return <div ref={el} className="h-full w-full" />;
}
