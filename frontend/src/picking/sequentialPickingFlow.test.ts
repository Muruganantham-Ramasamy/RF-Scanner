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
import { DEMO_REQUIRED_VERIFICATION_STEPS } from "./pickingDataSource";

const DEMO_SEQUENCE = [
  "200028",
  "0010-20-27",
  "1000001106",
  "BATCH1",
  "2",
  "9020 0001 GI-ZONE",
] as const;

/**
 * Client demo flow after Start Picking:
 * WO → SBin → Product → Batch → Quantity → Destination → Summary → Complete
 */
describe("sequential automatic picking flow", () => {
  it("Start Picking begins at Warehouse Order", () => {
    const state = createInitialPickingState();
    expect(state.current).toBe("wo");
    expect(state.stepOrder).toEqual([...DEMO_REQUIRED_VERIFICATION_STEPS]);
    expect(getStepStatus(state, "wo")).toBe("current");
    expect(shouldAutoStartCamera("wo")).toBe(true);
  });

  it("WO success → automatically opens Source Bin", () => {
    const result = verifyCurrentStep(createInitialPickingState(), "200028");
    expect(result.ok).toBe(true);
    expect(result.state.current).toBe("source");
    expect(getStepStatus(result.state, "wo")).toBe("verified");
    expect(verifiedSuccessLabel("wo")).toContain("Warehouse Order Verified");
    expect(movingToNextLabel("wo", result.state.stepOrder)).toBe("Moving to Source Bin...");
  });

  it("SBin success → automatically opens Product", () => {
    let state = verifyCurrentStep(createInitialPickingState(), "200028").state;
    const result = verifyCurrentStep(state, "0010-20-27");
    expect(result.ok).toBe(true);
    expect(result.state.current).toBe("product");
    expect(movingToNextLabel("source", state.stepOrder)).toBe("Moving to Product...");
  });

  it("Product success → automatically opens Batch", () => {
    let state = createInitialPickingState();
    state = verifyCurrentStep(state, "200028").state;
    state = verifyCurrentStep(state, "0010-20-27").state;
    const result = verifyCurrentStep(state, "1000001106");
    expect(result.ok).toBe(true);
    expect(result.state.current).toBe("batch");
  });

  it("Batch success → automatically opens Quantity", () => {
    let state = createInitialPickingState();
    for (const v of ["200028", "0010-20-27", "1000001106"]) {
      state = verifyCurrentStep(state, v).state;
    }
    const result = verifyCurrentStep(state, "BATCH1");
    expect(result.ok).toBe(true);
    expect(result.state.current).toBe("quantity");
  });

  it("Quantity success → automatically opens Destination", () => {
    let state = createInitialPickingState();
    for (const v of ["200028", "0010-20-27", "1000001106", "BATCH1"]) {
      state = verifyCurrentStep(state, v).state;
    }
    const result = verifyCurrentStep(state, "2");
    expect(result.ok).toBe(true);
    expect(result.state.current).toBe("destination");
  });

  it("Destination success → Verification Summary (complete flag)", () => {
    let state = createInitialPickingState();
    for (const v of DEMO_SEQUENCE) {
      const r = verifyCurrentStep(state, v);
      expect(r.ok).toBe(true);
      state = r.state;
    }
    expect(state.complete).toBe(true);
    expect(movingToNextLabel("destination", state.stepOrder)).toBe(
      "Moving to Verification Summary...",
    );
    expect(VERIFICATION_SUMMARY_UI.title).toBe("Verification Summary");
  });

  it("wrong WO stays on WO", () => {
    const fail = verifyCurrentStep(createInitialPickingState(), "999999");
    expect(fail.ok).toBe(false);
    expect(fail.state.current).toBe("wo");
    expect(fail.state.complete).toBe(false);
  });

  it("RF Document Fields are not required verification steps", () => {
    const state = createInitialPickingState();
    expect(state.stepOrder).toEqual([
      "wo",
      "source",
      "product",
      "batch",
      "quantity",
      "destination",
    ]);
  });

  it("manual fallback starts empty and uses same validation", () => {
    let state = createInitialPickingState();
    const wrong = manualBarcodeScanner("WRONG");
    expect(wrong.ok).toBe(true);
    if (!wrong.ok) return;
    const fail = verifyCurrentStep(state, wrong.value);
    expect(fail.ok).toBe(false);
    expect(fail.state.current).toBe("wo");

    const okManual = manualBarcodeScanner("200028");
    expect(okManual.ok).toBe(true);
    if (!okManual.ok) return;
    state = clearStepFailure(fail.state);
    const ok = verifyCurrentStep(state, okManual.value);
    expect(ok.ok).toBe(true);
    expect(ok.state.current).toBe("source");
  });

  it("camera cancel does not advance workflow", () => {
    let state = createInitialPickingState();
    state = markUnreadableFailure(state);
    state = cancelCameraScan(state);
    expect(state.current).toBe("wo");
    expect(state.complete).toBe(false);
    expect(state.failureKind).toBeNull();
  });

  it("safe scan session does not double-advance", () => {
    const session = createSafeScanSession();
    let state = createInitialPickingState();
    const first = session.submit("200028");
    expect(first.type).toBe("ScanSuccess");
    if (first.type !== "ScanSuccess") return;
    state = verifyCurrentStep(state, first.value).state;
    session.release();
    expect(state.current).toBe("source");
    expect(session.submit("200028").type).toBe("ScanDuplicate");
  });
});
