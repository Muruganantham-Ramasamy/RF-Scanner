import { describe, expect, it } from "vitest";
import {
  cancelCameraScan,
  clearStepFailure,
  createInitialPickingState,
  getStepStatus,
  markUnreadableFailure,
  verifyCurrentStep,
} from "./pickingWorkflowService";
import { manualBarcodeScanner, createSafeScanSession } from "./safeBarcodeScanner";
import { shouldAutoStartCamera } from "./scanContext";
import { movingToNextLabel, verifiedSuccessLabel, VERIFICATION_SUMMARY_UI } from "./pickingUiTerms";

/**
 * Sequential automatic verification:
 * Details → WO → SBin → Product → Batch → Quantity → Destination → Summary → Complete
 */
describe("sequential automatic picking flow", () => {
  it("Start Picking begins at Warehouse Order", () => {
    const state = createInitialPickingState();
    expect(state.current).toBe("wo");
    expect(getStepStatus(state, "wo")).toBe("current");
    expect(shouldAutoStartCamera("wo")).toBe(true);
  });

  it("WO success → automatically opens Source Bin", () => {
    const result = verifyCurrentStep(createInitialPickingState(), "200028");
    expect(result.ok).toBe(true);
    expect(result.state.current).toBe("source");
    expect(getStepStatus(result.state, "wo")).toBe("verified");
    expect(verifiedSuccessLabel("wo")).toContain("Warehouse Order Verified");
    expect(movingToNextLabel("wo")).toBe("Moving to Source Bin...");
  });

  it("SBin success → automatically opens Product", () => {
    let state = verifyCurrentStep(createInitialPickingState(), "200028").state;
    const result = verifyCurrentStep(state, "0010-20-27");
    expect(result.ok).toBe(true);
    expect(result.state.current).toBe("product");
    expect(movingToNextLabel("source")).toBe("Moving to Product...");
  });

  it("Product success → automatically opens Batch", () => {
    let state = createInitialPickingState();
    state = verifyCurrentStep(state, "200028").state;
    state = verifyCurrentStep(state, "0010-20-27").state;
    const result = verifyCurrentStep(state, "1000001106");
    expect(result.ok).toBe(true);
    expect(result.state.current).toBe("batch");
    expect(movingToNextLabel("product")).toBe("Moving to Batch...");
  });

  it("Batch success → automatically opens Quantity", () => {
    let state = createInitialPickingState();
    state = verifyCurrentStep(state, "200028").state;
    state = verifyCurrentStep(state, "0010-20-27").state;
    state = verifyCurrentStep(state, "1000001106").state;
    const result = verifyCurrentStep(state, "BATCH1");
    expect(result.ok).toBe(true);
    expect(result.state.current).toBe("quantity");
    expect(movingToNextLabel("batch")).toBe("Moving to Quantity...");
  });

  it("Quantity success → automatically opens Destination Bin", () => {
    let state = createInitialPickingState();
    state = verifyCurrentStep(state, "200028").state;
    state = verifyCurrentStep(state, "0010-20-27").state;
    state = verifyCurrentStep(state, "1000001106").state;
    state = verifyCurrentStep(state, "BATCH1").state;
    const result = verifyCurrentStep(state, "2");
    expect(result.ok).toBe(true);
    expect(result.state.current).toBe("destination");
    expect(movingToNextLabel("quantity")).toBe("Moving to Destination Bin...");
  });

  it("Destination success → Verification Summary (complete flag)", () => {
    let state = createInitialPickingState();
    for (const v of ["200028", "0010-20-27", "1000001106", "BATCH1", "2", "9020 0001 GI-ZONE"]) {
      const r = verifyCurrentStep(state, v);
      expect(r.ok).toBe(true);
      state = r.state;
    }
    expect(state.complete).toBe(true);
    expect(state.verified).toHaveLength(6);
    expect(movingToNextLabel("destination")).toBe("Moving to Verification Summary...");
    expect(VERIFICATION_SUMMARY_UI.continueLabel).toBe("Continue to Complete");
  });

  it("wrong WO stays on WO", () => {
    const fail = verifyCurrentStep(createInitialPickingState(), "999999");
    expect(fail.ok).toBe(false);
    expect(fail.state.current).toBe("wo");
    expect(fail.state.complete).toBe(false);
  });

  it("wrong SBin stays on SBin and does not mark WO incomplete", () => {
    let state = verifyCurrentStep(createInitialPickingState(), "200028").state;
    const fail = verifyCurrentStep(state, "WRONG-BIN");
    expect(fail.state.current).toBe("source");
    expect(getStepStatus(fail.state, "wo")).toBe("verified");
  });

  it("wrong Product stays on Product and keeps prior verified steps", () => {
    let state = createInitialPickingState();
    state = verifyCurrentStep(state, "200028").state;
    state = verifyCurrentStep(state, "0010-20-27").state;
    const fail = verifyCurrentStep(state, "9999999999");
    expect(fail.state.current).toBe("product");
    expect(getStepStatus(fail.state, "wo")).toBe("verified");
    expect(getStepStatus(fail.state, "source")).toBe("verified");
  });

  it("wrong Batch stays on Batch", () => {
    let state = createInitialPickingState();
    state = verifyCurrentStep(state, "200028").state;
    state = verifyCurrentStep(state, "0010-20-27").state;
    state = verifyCurrentStep(state, "1000001106").state;
    const fail = verifyCurrentStep(state, "WRONG");
    expect(fail.state.current).toBe("batch");
    expect(getStepStatus(fail.state, "product")).toBe("verified");
  });

  it("wrong Destination stays on Destination", () => {
    let state = createInitialPickingState();
    state = verifyCurrentStep(state, "200028").state;
    state = verifyCurrentStep(state, "0010-20-27").state;
    state = verifyCurrentStep(state, "1000001106").state;
    state = verifyCurrentStep(state, "BATCH1").state;
    state = verifyCurrentStep(state, "2").state;
    const fail = verifyCurrentStep(state, "WRONG-DST");
    expect(fail.state.current).toBe("destination");
    expect(getStepStatus(fail.state, "quantity")).toBe("verified");
  });

  it("successful retry after failure advances to next step", () => {
    let state = createInitialPickingState();
    state = verifyCurrentStep(state, "200028").state;
    state = verifyCurrentStep(state, "0010-20-27").state;
    state = verifyCurrentStep(state, "WRONG").state;
    state = clearStepFailure(state);
    const retry = verifyCurrentStep(state, "1000001106");
    expect(retry.ok).toBe(true);
    expect(retry.state.current).toBe("batch");
  });

  it("manual fallback starts empty and uses same validation", () => {
    expect(manualBarcodeScanner("").ok).toBe(false);

    let state = createInitialPickingState();
    const wrong = manualBarcodeScanner("WRONG-WO");
    expect(wrong.ok).toBe(true);
    if (!wrong.ok) return;
    const fail = verifyCurrentStep(state, wrong.value);
    expect(fail.ok).toBe(false);
    expect(fail.state.current).toBe("wo");

    const okManual = manualBarcodeScanner("200028");
    expect(okManual.ok).toBe(true);
    if (!okManual.ok) return;
    const ok = verifyCurrentStep(fail.state, okManual.value);
    expect(ok.ok).toBe(true);
    expect(ok.state.current).toBe("source");
  });

  it("camera auto-starts for barcode steps, not quantity", () => {
    expect(shouldAutoStartCamera("wo")).toBe(true);
    expect(shouldAutoStartCamera("source")).toBe(true);
    expect(shouldAutoStartCamera("product")).toBe(true);
    expect(shouldAutoStartCamera("batch")).toBe(true);
    expect(shouldAutoStartCamera("destination")).toBe(true);
    expect(shouldAutoStartCamera("quantity")).toBe(false);
    expect(shouldAutoStartCamera("source", { showManual: true })).toBe(false);
  });

  it("camera cancel does not advance workflow", () => {
    let state = createInitialPickingState();
    state = markUnreadableFailure(state);
    state = cancelCameraScan(state);
    expect(state.current).toBe("wo");
    expect(state.complete).toBe(false);
    expect(state.failureKind).toBeNull();
  });

  it("duplicate session gate does not double-advance", () => {
    const session = createSafeScanSession({ duplicateWindowMs: 5000 });
    let state = createInitialPickingState();

    const first = session.submit("200028");
    expect(first.type).toBe("ScanSuccess");
    if (first.type !== "ScanSuccess") return;
    state = verifyCurrentStep(state, first.value).state;
    session.release();

    const dup = session.submit("200028");
    expect(dup.type).toBe("ScanDuplicate");
    expect(state.current).toBe("source");
  });
});
