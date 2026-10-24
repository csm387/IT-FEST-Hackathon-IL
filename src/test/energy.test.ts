import { describe, expect, it } from "vitest";
import { classifyAnomaly, compensationRule, computeFlows, estimateBattery, monthlyBill } from "@/lib/energy";

describe("energy balance", () => {
  it("supplies home exactly with solar, battery and grid", () => {
    const f = computeFlows({ solarKW: 5.2, loadKW: 1.4, soc: 0.5, maxChargeKW: 2.5, hasBattery: true });
    expect(f.solarToHome).toBeCloseTo(1.4);
    expect(f.solarToBattery).toBeCloseTo(2.5);
    expect(f.solarToGrid).toBeCloseTo(1.3);
  });
  it("discharges battery before importing at night", () => {
    const f = computeFlows({ solarKW: 0, loadKW: 3, soc: 0.6, maxChargeKW: 2, hasBattery: true });
    expect(f.batteryToHome).toBe(2);
    expect(f.gridToHome).toBe(1);
  });
});

describe("battery estimate", () => {
  it("shows no charging time when not charging", () => {
    const e = estimateBattery({ capacityKWh: 10, usableRatio: 0.9, soc: 0.5, chargeKW: 0, efficiency: 0.95 });
    expect(e.state).toBe("idle");
    expect(e.hoursToFull).toBeNull();
  });
  it("computes time to full from remaining usable capacity and efficiency", () => {
    const e = estimateBattery({ capacityKWh: 10, usableRatio: 0.9, soc: 0.5, chargeKW: 2, efficiency: 0.9 });
    expect(e.hoursToFull).toBeCloseTo(4.5 / 1.8);
  });
});

describe("compensation rules", () => {
  it("uses 200 kW threshold before the reported change", () => {
    expect(compensationRule({ capacityKW: 300, customer: "company", effectiveDate: "2025-06-01" }).mechanism).toBe("financial");
  });
  it("uses 400 kW threshold after Law 160/2026 and flags verification", () => {
    const r = compensationRule({ capacityKW: 300, customer: "company", effectiveDate: "2026-10-24" });
    expect(r.mechanism).toBe("quantity");
    expect(r.verify).toBe(true);
  });
  it("quantity compensation carries surplus forward", () => {
    const b = monthlyBill({ importKWh: 300, exportKWh: 420, retailRON: 1.3, exportRON: 0.45, mechanism: "quantity" });
    expect(b.costRON).toBe(0);
    expect(b.carryOutKWh).toBe(120);
  });
});

describe("anomaly detection", () => {
  it("treats overcast deviation as weather, not a fault", () => {
    expect(classifyAnomaly({ expectedKWh: 40, actualKWh: 16, cloudCover: 92, hoursPersisting: 4, dataCompleteness: 1, minutesSinceLastSeen: 2 }).kind).toBe("weather");
  });
  it("flags persistent clear-sky drop as fault", () => {
    expect(classifyAnomaly({ expectedKWh: 40, actualKWh: 18, cloudCover: 10, hoursPersisting: 3, dataCompleteness: 1, minutesSinceLastSeen: 2 }).kind).toBe("fault");
  });
});
