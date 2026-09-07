import { describe, expect, it } from "vitest";
import {
  canEnterPickingDetails,
  clearPickingSessionGate,
  createPickingSessionGate,
  markWoVerified,
  resolvePickingNavigation,
} from "./pickingRouteGuard";

describe("pickingRouteGuard — Picking by WO screen order", () => {
  it("blocks Picking Details until the Warehouse Order is scanned", () => {
    const gate = createPickingSessionGate();
    expect(canEnterPickingDetails(gate)).toBe(false);
    expect(resolvePickingNavigation("picking-details", gate)).toBe("scan-wo");
    expect(resolvePickingNavigation("picking-execution", gate)).toBe("scan-wo");
  });

  it("allows Picking Details after a successful Warehouse Order scan", () => {
    const gate = markWoVerified(createPickingSessionGate(), "200028");
    expect(canEnterPickingDetails(gate)).toBe(true);
    expect(gate.verifiedWo).toBe("200028");
    expect(resolvePickingNavigation("picking-details", gate)).toBe("picking-details");
    expect(resolvePickingNavigation("picking-execution", gate)).toBe("picking-execution");
  });

  it("does not redirect the Warehouse Order scanner itself", () => {
    const gate = createPickingSessionGate();
    expect(resolvePickingNavigation("scan-wo", gate)).toBe("scan-wo");
  });

  it("clears the session so a new pick must scan the Warehouse Order again", () => {
    const verified = markWoVerified(createPickingSessionGate(), "200028");
    const cleared = clearPickingSessionGate();
    expect(canEnterPickingDetails(verified)).toBe(true);
    expect(canEnterPickingDetails(cleared)).toBe(false);
    expect(resolvePickingNavigation("picking-details", cleared)).toBe("scan-wo");
  });
});
