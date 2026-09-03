import { describe, expect, it } from "vitest";
import {
  DEMO_PICK,
  DEMO_PICKING_DOCUMENT,
  DEMO_REQUIRED_VERIFICATION_STEPS,
  PICKING_METHODS,
  getActivePickingDocument,
  getConsolidatedPickingDetailRows,
  getPickingMethodMeta,
  getRequiredVerificationSteps,
} from "./pickingDataSource";

describe("pickingDataSource — SAP-ready demo document", () => {
  it("exposes the same demo pick line for every picking method", () => {
    for (const method of PICKING_METHODS) {
      const doc = getActivePickingDocument(method.id);
      expect(doc.wo).toBe(DEMO_PICKING_DOCUMENT.wo);
      expect(doc.barcodes.product).toBe(DEMO_PICK.product);
      expect(doc.sourceBin).toBe(DEMO_PICK.sourceBin);
    }
  });

  it("provides method metadata used by the shared Outbound flow titles", () => {
    expect(getPickingMethodMeta("by-wo").flowTitle).toBe("Picking by WO");
    expect(getPickingMethodMeta("by-wr").flowTitle).toBe("Picking by WR");
    expect(getPickingMethodMeta("by-hu").flowTitle).toBe("Picking by HU");
    expect(getPickingMethodMeta("system-guided").flowTitle).toBe("Picking System Guided");
    expect(getPickingMethodMeta("queue").flowTitle).toBe("System Guided by Queue");
  });

  it("keeps RF barcode values available for future SAP-supplied validation", () => {
    const doc = getActivePickingDocument("by-wo");
    expect(doc.barcodes.wo).toBe(doc.wo);
    expect(doc.barcodes.destinationBin).toBe(doc.destinationBin);
  });

  it("merges WO fields and RF Document Fields into one consolidated details list", () => {
    const rows = getConsolidatedPickingDetailRows();
    expect(rows[0].label).toBe("Warehouse Order (WO)");
    expect(rows.some((r) => r.label === "Pick-HU")).toBe(true);
    expect(rows.some((r) => r.label === "LogPos")).toBe(true);
    expect(rows.filter((r) => r.isRfField).length).toBe(9);
  });

  it("required verification steps exclude RF Document Fields by default", () => {
    const steps = getRequiredVerificationSteps();
    expect(steps).toEqual([...DEMO_REQUIRED_VERIFICATION_STEPS]);
    expect(steps[0]).toBe("wo");
    expect(steps).toContain("source");
  });
});
