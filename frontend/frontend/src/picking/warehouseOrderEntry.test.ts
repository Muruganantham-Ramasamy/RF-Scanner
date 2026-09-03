import { describe, expect, it } from "vitest";
import { createSafeScanSession, safeBarcodeScanner } from "./safeBarcodeScanner";
import { DEMO_PICK } from "./pickingWorkflowService";
import {
  validateWarehouseOrder,
  WarehouseOrderEntryController,
} from "./warehouseOrderEntry";

describe("WarehouseOrderEntryController", () => {
  it("manual input starts EMPTY (never pre-filled with expected WO)", () => {
    expect(WarehouseOrderEntryController.emptyManualValue()).toBe("");
    expect(WarehouseOrderEntryController.emptyManualValue()).not.toBe(
      DEMO_PICK.wo,
    );
  });

  it("camera / safe scanner returns raw WO barcode on success", () => {
    const session = createSafeScanSession();
    const result = session.submit("200028");
    expect(result).toEqual({ type: "ScanSuccess", value: "200028" });
    session.release();
  });

  it("valid WO continues workflow (validation ok)", () => {
    const result = WarehouseOrderEntryController.validate("200028");
    expect(result).toEqual({ ok: true, value: "200028" });
  });

  it("wrong WO stays on WO (not found)", () => {
    const result = validateWarehouseOrder("999999");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe("not_found");
    expect(result.message).toBe("Warehouse Order not found.");
    expect(result.value).toBe("999999");
  });

  it("blank manual WO validation remains required", () => {
    const result = validateWarehouseOrder("   ");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe("blank");
    expect(result.message).toBe("Warehouse Order is required.");
  });

  it("manual typed WO is accepted when valid", () => {
    const typed = safeBarcodeScanner("200028");
    expect(typed.ok).toBe(true);
    if (!typed.ok) return;
    expect(WarehouseOrderEntryController.validate(typed.value).ok).toBe(true);
  });

  it("manual invalid WO stays on screen", () => {
    expect(WarehouseOrderEntryController.validate("WRONG").ok).toBe(false);
  });

  it("camera auto-start only while WO step is active", () => {
    expect(WarehouseOrderEntryController.shouldAutoStartCamera({})).toBe(true);
    expect(
      WarehouseOrderEntryController.shouldAutoStartCamera({ verified: true }),
    ).toBe(false);
    expect(
      WarehouseOrderEntryController.shouldAutoStartCamera({ showManual: true }),
    ).toBe(false);
  });

  it("camera cancellation does not advance (validation not called)", () => {
    const session = createSafeScanSession();
    session.submit("200028");
    expect(session.cancel()).toEqual({ type: "ScanCancelled" });
    // Without calling validate, WO is not verified.
    expect(WarehouseOrderEntryController.validate("").ok).toBe(false);
  });

  it("SafeBarcodeScanner behavior remains unchanged for empty / valid", () => {
    expect(safeBarcodeScanner("")).toEqual({ ok: false, reason: "empty" });
    expect(safeBarcodeScanner("200028")).toEqual({
      ok: true,
      value: "200028",
    });
  });

  it("switching modes still uses the same validation path", () => {
    const fromCamera = WarehouseOrderEntryController.validate("200028");
    const fromManual = WarehouseOrderEntryController.validate(
      WarehouseOrderEntryController.emptyManualValue() || "200028",
    );
    expect(fromCamera).toEqual(fromManual);
  });
});
