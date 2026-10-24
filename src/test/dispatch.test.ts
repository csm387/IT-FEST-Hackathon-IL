import { describe, it, expect } from "vitest";
import { assignCrew, advanceJob, nearestCrew, CREWS, type Job } from "@/lib/dispatch";

const job: Job = { id: "J", siteId: "s", title: "t", priority: "High", status: "New", crewId: null };

describe("dispatch rules", () => {
  it("assigning a crew moves New to Assigned", () => expect(assignCrew(job, "c1").status).toBe("Assigned"));
  it("unassigning returns job to New", () => expect(assignCrew({ ...job, status: "En route", crewId: "c1" }, null).status).toBe("New"));
  it("unassigned New job cannot advance", () => expect(advanceJob(job).status).toBe("New"));
  it("assigned job advances to En route then Resolved", () => {
    const a = advanceJob(assignCrew(job, "c1"));
    expect(a.status).toBe("En route");
    expect(advanceJob(a).status).toBe("Resolved");
  });
  it("nearest crew to Cluj is the Cluj crew", () => expect(nearestCrew({ lat: 46.7, lng: 23.5 }, CREWS)?.id).toBe("c2"));
});
