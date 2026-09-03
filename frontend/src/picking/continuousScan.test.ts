import { describe, expect, it } from "vitest";
import {
  cameraBarcodeScanner,
  createSafeScanSession,
  manualBarcodeScanner,
  safeBarcodeScanner,
} from "./safeBarcodeScanner";
import { getScanContext, isBarcodeScanStep, shouldAutoStartCamera } from "./scanContext";
import {
  clearStepFailure,
  createInitialPickingState,
  getStepStatus,
  markUnreadableFailure,
  verifyCurrentStep,
} from "./pickingWorkflowService";

describe("SafeBarcodeScanner — continuous camera protection", () => {
  it("returns raw barcode value on success", () => {
    const session = createSafeScanSession();
    const result = session.submit("1000001106");
    expect(result).toEqual({ type: "ScanSuccess", value: "1000001106" });
    session.release();
  });

  it("blocks duplicate identical scans within the window", () => {
    const session = createSafeScanSession({ duplicateWindowMs: 2000 });
    expect(session.submit("BATCH1").type).toBe("ScanSuccess");
    session.release();
    expect(session.submit("BATCH1").type).toBe("ScanDuplicate");
  });

  it("blocks concurrent submissions while in flight", () => {
    const session = createSafeScanSession();
    expect(session.submit("1000001106").type).toBe("ScanSuccess");
    expect(session.submit("BATCH1").type).toBe("ScanBusy");
    session.release();
    expect(session.submit("BATCH1").type).toBe("ScanSuccess");
    session.release();
  });

  it("cancel does not advance workflow and clears busy", () => {
    const session = createSafeScanSession();
    session.submit("1000001106");
    expect(session.cancel()).toEqual({ type: "ScanCancelled" });
    expect(session.isBusy()).toBe(false);
  });

  it("manual and camera capture share the same safe path", () => {
    expect(cameraBarcodeScanner("1000001106")).toEqual({
      ok: true,
      value: "1000001106",
    });
    expect(manualBarcodeScanner("1000001106")).toEqual({
      ok: true,
      value: "1000001106",
    });
    expect(safeBarcodeScanner("")).toEqual({ ok: false, reason: "empty" });
  });
});

describe("continuous scan workflow integration", () => {
  it("correct Product advances to Batch", () => {
    let state = createInitialPickingState();
    state = verifyCurrentStep(state, "200028").state;
    state = verifyCurrentStep(state, "0010-20-27").state;
    const result = verifyCurrentStep(state, "1000001106");
    expect(result.ok).toBe(true);
    expect(result.state.current).toBe("batch");
  });

  it("correct Batch advances to Quantity", () => {
    let state = createInitialPickingState();
    state = verifyCurrentStep(state, "200028").state;
    state = verifyCurrentStep(state, "0010-20-27").state;
    state = verifyCurrentStep(state, "1000001106").state;
    const result = verifyCurrentStep(state, "BATCH1");
    expect(result.ok).toBe(true);
    expect(result.state.current).toBe("quantity");
  });

  it("correct Destination completes the workflow", () => {
    let state = createInitialPickingState();
    state = verifyCurrentStep(state, "200028").state;
    state = verifyCurrentStep(state, "0010-20-27").state;
    state = verifyCurrentStep(state, "1000001106").state;
    state = verifyCurrentStep(state, "BATCH1").state;
    state = verifyCurrentStep(state, "2").state;
    const result = verifyCurrentStep(state, "9020 0001 GI-ZONE");
    expect(result.ok).toBe(true);
    expect(result.state.complete).toBe(true);
  });

  it("wrong Product remains on Product with prior steps verified", () => {
    let state = createInitialPickingState();
    state = verifyCurrentStep(state, "200028").state;
    state = verifyCurrentStep(state, "0010-20-27").state;
    const fail = verifyCurrentStep(state, "9999999999");
    expect(fail.ok).toBe(false);
    expect(fail.state.current).toBe("product");
    expect(getStepStatus(fail.state, "source")).toBe("verified");
  });

  it("wrong Batch remains on Batch", () => {
    let state = createInitialPickingState();
    state = verifyCurrentStep(state, "200028").state;
    state = verifyCurrentStep(state, "0010-20-27").state;
    state = verifyCurrentStep(state, "1000001106").state;
    const fail = verifyCurrentStep(state, "WRONG");
    expect(fail.state.current).toBe("batch");
  });

  it("wrong Destination remains on Destination", () => {
    let state = createInitialPickingState();
    state = verifyCurrentStep(state, "200028").state;
    state = verifyCurrentStep(state, "0010-20-27").state;
    state = verifyCurrentStep(state, "1000001106").state;
    state = verifyCurrentStep(state, "BATCH1").state;
    state = verifyCurrentStep(state, "2").state;
    const fail = verifyCurrentStep(state, "WRONG-BIN");
    expect(fail.state.current).toBe("destination");
  });

  it("camera failure keeps current step active", () => {
    let state = createInitialPickingState();
    state = verifyCurrentStep(state, "200028").state;
    state = verifyCurrentStep(state, "0010-20-27").state;
    state = markUnreadableFailure(state);
    expect(state.current).toBe("product");
    expect(state.failureKind).toBe("unreadable");
    expect(getStepStatus(state, "source")).toBe("verified");
  });

  it("manual fallback after failure uses same validation", () => {
    let state = createInitialPickingState();
    state = verifyCurrentStep(state, "200028").state;
    state = verifyCurrentStep(state, "0010-20-27").state;
    state = verifyCurrentStep(state, "WRONG").state;
    state = clearStepFailure(state);
    const manual = safeBarcodeScanner("1000001106");
    expect(manual.ok).toBe(true);
    if (!manual.ok) return;
    const result = verifyCurrentStep(state, manual.value);
    expect(result.ok).toBe(true);
    expect(result.state.current).toBe("batch");
  });

  it("duplicate session submissions do not advance multiple steps", () => {
    const session = createSafeScanSession({ duplicateWindowMs: 5000 });
    let state = createInitialPickingState();
    state = verifyCurrentStep(state, "200028").state;
    state = verifyCurrentStep(state, "0010-20-27").state;

    const first = session.submit("1000001106");
    expect(first.type).toBe("ScanSuccess");
    if (first.type !== "ScanSuccess") return;
    state = verifyCurrentStep(state, first.value).state;
    session.release();

    const dup = session.submit("1000001106");
    expect(dup.type).toBe("ScanDuplicate");
    expect(state.current).toBe("batch");
  });

  it("scan context reflects current step titles", () => {
    expect(getScanContext("product").title).toContain("Product");
    expect(getScanContext("batch").instruction.toLowerCase()).toContain("batch");
    expect(isBarcodeScanStep("product")).toBe(true);
    expect(isBarcodeScanStep("quantity")).toBe(false);
  });

  it("camera auto-starts only for active barcode steps", () => {
    expect(shouldAutoStartCamera("product")).toBe(true);
    expect(shouldAutoStartCamera("batch")).toBe(true);
    expect(shouldAutoStartCamera("destination")).toBe(true);
    expect(shouldAutoStartCamera("quantity")).toBe(false);
    expect(shouldAutoStartCamera("product", { complete: true })).toBe(false);
    expect(shouldAutoStartCamera("product", { showManual: true })).toBe(false);
  });

  it("concurrent in-flight scans do not corrupt workflow state", () => {
    const session = createSafeScanSession();
    let state = createInitialPickingState();
    state = verifyCurrentStep(state, "200028").state;
    state = verifyCurrentStep(state, "0010-20-27").state;

    const first = session.submit("1000001106");
    expect(first.type).toBe("ScanSuccess");
    if (first.type !== "ScanSuccess") return;

    const concurrent = session.submit("BATCH1");
    expect(concurrent.type).toBe("ScanBusy");

    state = verifyCurrentStep(state, first.value).state;
    session.release();
    expect(state.current).toBe("batch");
    expect(getStepStatus(state, "product")).toBe("verified");
  });
});
