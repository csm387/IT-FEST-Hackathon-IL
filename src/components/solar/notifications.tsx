import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { homeSite, siteDay } from "@/lib/fleet";
import { shouldNotifySurplus } from "@/lib/energy";

export type Priority = "info" | "opportunity" | "warning" | "critical";
export interface Note { id: string; title: string; body: string; priority: Priority; time: string; read: boolean; kind: "actual" | "forecast" | "system"; key: string }
export interface Prefs { surplus: boolean; battery: boolean; peak: boolean; faults: boolean; push: boolean; quietStart: number; quietEnd: number; thresholdKW: number }

const defaultPrefs: Prefs = { surplus: true, battery: true, peak: true, faults: true, push: false, quietStart: 22, quietEnd: 7, thresholdKW: 2 };

function seed(): Note[] {
  const s = homeSite();
  const day = siteDay(s);
  const peak = day.reduce((a, b) => (b.solar > a.solar ? b : a));
  const now = day[12];
  const surplus = Math.max(0, now.solar - now.load);
  return [
    { id: "n1", key: "surplus-12", kind: "actual", priority: "opportunity", time: "12:04", read: false,
      title: "☀️ Perfect time to use solar energy!",
      body: `Your panels are producing ${now.solar.toFixed(1)} kW and your home uses ${now.load.toFixed(1)} kW — about ${surplus.toFixed(1)} kW of surplus. Consider starting the washing machine or charging your EV.` },
    { id: "n2", key: "peak", kind: "forecast", priority: "info", time: "10:30", read: false,
      title: "Solar peak expected soon", body: `Forecast peak of ${peak.solar.toFixed(1)} kW around ${peak.label}. Flexible loads are best scheduled between 11:00 and 15:00.` },
    { id: "n3", key: "battery-full", kind: "actual", priority: "opportunity", time: "13:20", read: true,
      title: "Battery almost fully charged", body: "Battery is at 94%. Extra solar will be exported at a lower value than self-consumption." },
    { id: "n4", key: "fault-ro-007", kind: "system", priority: "critical", time: "09:12", read: false,
      title: "Inverter offline", body: "No data received from a monitored inverter for 90+ minutes. A technician has been notified." },
    { id: "n5", key: "evening-price", kind: "forecast", priority: "warning", time: "08:00", read: true,
      title: "Higher evening price", body: "Your contract applies a higher rate 17:00–22:00. Use solar energy earlier where possible." },
  ];
}

interface Ctx { notes: Note[]; prefs: Prefs; setPrefs: (p: Prefs) => void; markAll: () => void; markRead: (id: string) => void; push: (n: Omit<Note, "id" | "time" | "read">) => void; unread: number }
const NotificationsCtx = createContext<Ctx | null>(null);

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const [notes, setNotes] = useState<Note[]>(() => seed());
  const [prefs, setPrefsState] = useState<Prefs>(defaultPrefs);
  const lastByKey = useRef<Record<string, number>>({});

  useEffect(() => {
    try { const raw = localStorage.getItem("solarops-prefs"); if (raw) setPrefsState({ ...defaultPrefs, ...JSON.parse(raw) }); } catch { /* ignore */ }
  }, []);
  const setPrefs = useCallback((p: Prefs) => { setPrefsState(p); try { localStorage.setItem("solarops-prefs", JSON.stringify(p)); } catch { /* ignore */ } }, []);

  const push = useCallback((n: Omit<Note, "id" | "time" | "read">) => {
    const now = Date.now();
    const last = lastByKey.current[n.key] ?? 0;
    if (now - last < 60 * 60 * 1000) return; // dedupe: same key max once an hour
    lastByKey.current[n.key] = now;
    const time = new Date().toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit" });
    setNotes((xs) => [{ ...n, id: crypto.randomUUID(), time, read: false }, ...xs]);
    toast(n.title, { description: n.body });
    if (prefs.push && typeof Notification !== "undefined" && Notification.permission === "granted") new Notification(n.title, { body: n.body });
  }, [prefs.push]);

  // Live surplus check every 45s on simulated readings
  useEffect(() => {
    const id = setInterval(() => {
      const h = new Date().getHours();
      const quiet = prefs.quietStart > prefs.quietEnd ? h >= prefs.quietStart || h < prefs.quietEnd : h >= prefs.quietStart && h < prefs.quietEnd;
      const p = siteDay(homeSite())[h];
      const surplus = p.solar - p.load;
      const last = lastByKey.current["surplus-live"] ?? 0;
      if (prefs.surplus && shouldNotifySurplus(surplus, (Date.now() - last) / 60000, quiet, prefs.thresholdKW)) {
        push({ key: "surplus-live", kind: "actual", priority: "opportunity", title: "High solar surplus detected", body: `About ${surplus.toFixed(1)} kW of surplus right now. A good moment for flexible loads.` });
      }
    }, 45000);
    return () => clearInterval(id);
  }, [prefs, push]);

  const value = useMemo<Ctx>(() => ({
    notes, prefs, setPrefs, push, unread: notes.filter((n) => !n.read).length,
    markAll: () => setNotes((xs) => xs.map((x) => ({ ...x, read: true }))),
    markRead: (id) => setNotes((xs) => xs.map((x) => (x.id === id ? { ...x, read: true } : x))),
  }), [notes, prefs, setPrefs, push]);
  return <NotificationsCtx.Provider value={value}>{children}</NotificationsCtx.Provider>;
}

export function useNotifications() {
  const c = useContext(NotificationsCtx);
  if (!c) throw new Error("useNotifications outside provider");
  return c;
}
