import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet.markercluster";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import type { Site } from "@/lib/energy";
import { healthScore, siteDay, sumDay, STATUS_LABEL, TARIFF } from "@/lib/fleet";

const COLORS: Record<Site["status"], string> = { normal: "var(--success)", under: "var(--warning)", critical: "var(--destructive)", offline: "var(--offline)" };

export default function FleetMap({ sites, onOpen }: { sites: Site[]; onOpen: (id: string) => void }) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const layer = useRef<L.MarkerClusterGroup | null>(null);
  const openRef = useRef(onOpen);
  openRef.current = onOpen;

  useEffect(() => {
    if (!el.current || map.current) return;
    map.current = L.map(el.current, { zoomControl: true }).setView([45.9, 25], 7);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: "© OpenStreetMap contributors", maxZoom: 18 }).addTo(map.current);
    layer.current = L.markerClusterGroup({ showCoverageOnHover: false, maxClusterRadius: 45 });
    map.current.addLayer(layer.current);
    return () => { map.current?.remove(); map.current = null; };
  }, []);

  useEffect(() => {
    const g = layer.current; if (!g) return;
    g.clearLayers();
    sites.forEach((s) => {
      const icon = L.divIcon({ className: "", iconSize: [18, 18], html: `<span style="display:block;width:18px;height:18px;border-radius:999px;background:${COLORS[s.status]};border:3px solid var(--background);box-shadow:0 0 14px ${COLORS[s.status]}"></span>` });
      const t = sumDay(siteDay(s));
      const now = siteDay(s)[13];
      const html = `
        <div>
          <img src="${s.image}" alt="" style="width:100%;height:120px;object-fit:cover;border-radius:12px 12px 0 0"/>
          <div style="padding:12px;font-size:12px;line-height:1.6">
            <div style="font-weight:600;font-size:14px">${s.name}</div>
            <div style="color:var(--muted-foreground)">${s.city}, ${s.region} · ${STATUS_LABEL[s.status]} · health ${healthScore(s)}</div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px 12px;margin-top:8px">
              <span>PV: <b>${s.kWp} kWp</b></span><span>Now: <b>${now.solar.toFixed(1)} kW</b></span>
              <span>Battery: <b>${s.batteryKWh || "—"} kWh</b></span><span>Charge: <b>${s.batteryKWh ? Math.round(now.soc * 100) + "%" : "—"}</b></span>
              <span>Today: <b>${t.solar.toFixed(0)} kWh</b></span><span>Value: <b>≈${Math.round(t.solar * TARIFF.retailRON)} RON</b></span>
            </div>
            <div style="margin-top:6px;color:var(--muted-foreground)">Last seen ${s.lastSeenMinutes} min ago · <span data-w>loading weather…</span></div>
            <button data-open style="margin-top:8px;width:100%;padding:6px;border-radius:8px;background:var(--primary);color:var(--primary-foreground);font-weight:600">Open site</button>
          </div>
        </div>`;
      const m = L.marker([s.lat, s.lng], { icon }).bindPopup(html, { maxWidth: 300 });
      m.on("popupopen", (e) => {
        const root = (e as L.PopupEvent).popup.getElement();
        root?.querySelector("[data-open]")?.addEventListener("click", () => openRef.current(s.id));
        fetch(`https://api.open-meteo.com/v1/forecast?latitude=${s.lat}&longitude=${s.lng}&current=temperature_2m,cloud_cover`)
          .then((r) => r.json()).then((w) => { const n = root?.querySelector("[data-w]"); if (n) n.textContent = `${Math.round(w.current.temperature_2m)}°C, ${w.current.cloud_cover}% cloud`; })
          .catch(() => { const n = root?.querySelector("[data-w]"); if (n) n.textContent = "weather unavailable"; });
      });
      g.addLayer(m);
    });
  }, [sites]);

  return <div ref={el} className="h-full w-full" />;
}
