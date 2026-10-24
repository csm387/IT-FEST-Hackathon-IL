import { describe, it, expect, vi } from "vitest";
vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
import { canOpen } from "@/lib/account";

describe("account access", () => {
  it("individual cannot open dispatch", () => expect(canOpen("individual", "/business/dispatch")).toBe(false));
  it("individual cannot open installations list", () => expect(canOpen("individual", "/sites")).toBe(false));
  it("individual can open own dashboard", () => expect(canOpen("individual", "/dashboard")).toBe(true));
  it("business can also open the individual views", () => expect(canOpen("business", "/flow")).toBe(true));
});
