import { describe, expect, it } from "vitest";
import {
  BARCODE_SCAN_ICON_STEPS,
  CAMERA_ACTIVE_STATUS,
  INBOUND_UI_TERMS,
  PICKING_COMPLETE_UI,
  PICKING_UI_TERMS,
  RF_DOCUMENT_FIELDS,
  expectedValueLabel,
  pickingDisplayValue,
  verifiedSuccessLabel,
  movingToNextLabel,
} from "./pickingUiTerms";
import {
  createInitialPickingState,
  getStepStatus,
  verifyCurrentStep,
} from "./pickingWorkflowService";
import { WarehouseOrderEntryController } from "./warehouseOrderEntry";

describe("picking UI terminology", () => {
  it("shows technical SAP terms for each picking step", () => {
    expect(PICKING_UI_TERMS.wo.label).toContain("Warehouse Order (WO)");
    expect(PICKING_UI_TERMS.source.label).toContain("Source Bin (SBin)");
    expect(PICKING_UI_TERMS.product.label).toContain("Product (Prod.)");
    expect(PICKING_UI_TERMS.batch.label).toBe("Batch");
    expect(PICKING_UI_TERMS.quantity.label).toContain("Quantity (AQty)");
    expect(PICKING_UI_TERMS.destination.label).toContain("Destination Bin (DstBin)");
  });

  it("uses exact scan titles for workers", () => {
    expect(PICKING_UI_TERMS.wo.scanTitle).toBe("Scan Warehouse Order (WO)");
    expect(PICKING_UI_TERMS.source.scanTitle).toBe("Scan Source Bin (SBin)");
    expect(PICKING_UI_TERMS.product.scanTitle).toBe("Scan Product (Prod.)");
    expect(PICKING_UI_TERMS.batch.scanTitle).toBe("Scan Batch");
    expect(PICKING_UI_TERMS.quantity.scanTitle).toBe("Confirm Quantity (AQty)");
    expect(PICKING_UI_TERMS.destination.scanTitle).toBe("Scan Destination Bin (DstBin)");
  });

  it("includes WO / Source / Product / Batch / Destination descriptions", () => {
    expect(PICKING_UI_TERMS.wo.scanHelper).toBe(
      "Scan the barcode on the warehouse picking order.",
    );
    expect(PICKING_UI_TERMS.wo.meaning).toBe(
      "This identifies the picking job to be processed.",
    );
    expect(PICKING_UI_TERMS.source.scanHelper).toBe(
      "Scan the barcode of the bin where the product is currently stored.",
    );
    expect(PICKING_UI_TERMS.source.meaning).toBe(
      "This confirms where the product should be picked from.",
    );
    expect(PICKING_UI_TERMS.product.scanHelper).toBe(
      "Scan the barcode on the product you need to pick.",
    );
    expect(PICKING_UI_TERMS.batch.scanHelper).toBe(
      "Scan the barcode on the product batch.",
    );
    expect(PICKING_UI_TERMS.destination.scanHelper).toBe(
      "Scan the barcode of the bin where the product will be placed.",
    );
  });

  it("includes quantity and picking-complete descriptions", () => {
    expect(PICKING_UI_TERMS.quantity.scanHelper).toBe(
      "Enter the quantity you are picking.",
    );
    expect(PICKING_COMPLETE_UI.title).toBe("Picking Complete");
    expect(PICKING_COMPLETE_UI.description).toBe(
      "All required checks have been completed successfully.",
    );
  });

  it("defines animated barcode icons for every scan context", () => {
    expect(BARCODE_SCAN_ICON_STEPS).toEqual([
      "wo",
      "source",
      "product",
      "batch",
      "destination",
    ]);
    expect(BARCODE_SCAN_ICON_STEPS).not.toContain("quantity");
  });

  it("uses clear incorrect-step mismatch titles", () => {
    expect(PICKING_UI_TERMS.source.mismatchTitle).toBe("Incorrect Source Bin");
    expect(PICKING_UI_TERMS.source.mismatchHint).toBe(
      "Please scan the correct source bin.",
    );
    expect(PICKING_UI_TERMS.product.mismatchTitle).toBe("Incorrect Product");
  });

  it("keeps camera status and expected labels worker-friendly", () => {
    expect(CAMERA_ACTIVE_STATUS).toBe("Camera active — point at the barcode");
    expect(expectedValueLabel("wo")).toBe("Expected Warehouse Order (WO)");
    expect(expectedValueLabel("source")).toContain("Source Bin");
  });

  it("shows clear per-step success labels for sequential auto-advance", () => {
    expect(verifiedSuccessLabel("source")).toBe("✓ Source Bin Verified");
    expect(verifiedSuccessLabel("product")).toBe("✓ Product Verified");
    expect(verifiedSuccessLabel("batch")).toBe("✓ Batch Verified");
    expect(verifiedSuccessLabel("quantity")).toBe("✓ Quantity Confirmed");
    expect(verifiedSuccessLabel("destination")).toBe("✓ Destination Bin Verified");
    expect(movingToNextLabel("product")).toBe("Moving to Batch...");
    expect(movingToNextLabel("destination")).toBe("Moving to Verification Summary...");
  });

  it("keeps demo display values unchanged", () => {
    expect(pickingDisplayValue("wo")).toBe("200028");
    expect(pickingDisplayValue("source")).toBe("0010-20-27");
    expect(pickingDisplayValue("product")).toBe("1000001106");
    expect(pickingDisplayValue("batch")).toBe("BATCH1");
    expect(pickingDisplayValue("quantity")).toBe("2 EA");
    expect(pickingDisplayValue("destination")).toBe("9020 0001 GI-ZONE");
  });

  it("manual WO fallback starts empty", () => {
    expect(WarehouseOrderEntryController.emptyManualValue()).toBe("");
  });

  it("keeps RF placeholders as Not assigned", () => {
    expect(RF_DOCUMENT_FIELDS.every((f) => f.value === "Not assigned")).toBe(true);
    expect(RF_DOCUMENT_FIELDS.some((f) => f.label === "Pick-HU")).toBe(true);
    expect(RF_DOCUMENT_FIELDS.some((f) => f.label === "SrcHU")).toBe(true);
  });

  it("documents inbound terms without claiming a live inbound workflow", () => {
    expect(INBOUND_UI_TERMS.po.label).toContain("Purchase Order (PO)");
    expect(INBOUND_UI_TERMS.goodsReceipt.label).toContain("Goods Receipt (GR)");
  });
});

describe("verification behavior unchanged with UI terms", () => {
  it("failed product scan stays on product and keeps prior steps verified", () => {
    let state = createInitialPickingState();
    state = verifyCurrentStep(state, "200028").state;
    state = verifyCurrentStep(state, "0010-20-27").state;
    const fail = verifyCurrentStep(state, "WRONG");
    expect(fail.ok).toBe(false);
    expect(fail.state.current).toBe("product");
    expect(getStepStatus(fail.state, "source")).toBe("verified");
    expect(getStepStatus(fail.state, "product")).toBe("failed");
  });

  it("manual fallback uses the same domain validation", () => {
    let state = createInitialPickingState();
    state = verifyCurrentStep(state, "200028").state;
    state = verifyCurrentStep(state, "0010-20-27").state;
    const ok = verifyCurrentStep(state, "1000001106");
    expect(ok.ok).toBe(true);
    expect(ok.state.current).toBe("batch");
  });
});
