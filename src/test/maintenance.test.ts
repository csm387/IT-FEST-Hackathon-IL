import { describe, expect, it } from "vitest";
import { DEFAULT_MAINTENANCE_MONTHS, nextMaintenanceDate } from "@/lib/maintenance";

describe("Maintenance schedule", () => {
  it("defaults to the requested 24-month period", () => {
    expect(DEFAULT_MAINTENANCE_MONTHS).toBe(24);
    expect(nextMaintenanceDate("2024-09-12")).toBe("2026-09-12");
  });
  it("keeps a leap-day maintenance visit within the target month", () => {
    expect(nextMaintenanceDate("2024-02-29")).toBe("2026-02-28");
  });
});