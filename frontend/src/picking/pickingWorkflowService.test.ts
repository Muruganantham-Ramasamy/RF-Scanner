import { describe, expect, it } from "vitest";
import {
  cancelCameraScan,
  clearStepFailure,
  createInitialPickingState,
  formatVerifiedTimestamp,
  getStepStatus,
  getVerifiedDisplayValue,
  markUnreadableFailure,
  verifyCurrentStep,
  type PickingWorkflowState,
} from "./pickingWorkflowService";
import {
  cameraBarcodeScanner,
  manualBarcodeScanner,
  safeBarcodeScanner,
} from "./safeBarcodeScanner";

function afterWo(state = createInitialPickingState()): PickingWorkflowState {
  const result = verifyCurrentStep(state, "200028");
  expect(result.ok).toBe(true);
  return result.state;
}

function afterSource(state = createInitialPickingState()): PickingWorkflowState {
  return verifyCurrentStep(afterWo(state), "0010-20-27").state;
}

describe("PickingWorkflowService — sequential verification", () => {
  it("1. Start Picking begins at Warehouse Order", () => {
    const state = createInitialPickingState();
    expect(state.verified).toEqual([]);
    expect(state.current).toBe("wo");
    expect(getStepStatus(state, "wo")).toBe("current");
  });

  it("2. Source Bin succeeds and advances to Product", () => {
    const state = afterSource();
    expect(state.verified).toEqual(["wo", "source"]);
    expect(state.current).toBe("product");
    expect(getStepStatus(state, "source")).toBe("verified");
    expect(getStepStatus(state, "product")).toBe("current");
  });

  it("3. Product wrong barcode fails", () => {
    const fail = verifyCurrentStep(afterSource(), "1000001107");
    expect(fail.ok).toBe(false);
    if (fail.ok) return;
    expect(fail.reason).toBe("mismatch");
    expect(fail.state.failedValue).toBe("1000001107");
    expect(fail.state.failureKind).toBe("mismatch");
  });

  it("4. Product remains the current step after failure", () => {
    const fail = verifyCurrentStep(afterSource(), "1000001107");
    expect(fail.state.current).toBe("product");
    expect(getStepStatus(fail.state, "product")).toBe("failed");
  });

  it("5. Warehouse Order remains verified after Product failure", () => {
    const fail = verifyCurrentStep(afterSource(), "1000001107");
    expect(fail.state.verified).toContain("wo");
    expect(getStepStatus(fail.state, "wo")).toBe("verified");
  });

  it("6. Source Bin remains verified after Product failure", () => {
    const fail = verifyCurrentStep(afterSource(), "1000001107");
    expect(fail.state.verified).toContain("source");
    expect(getStepStatus(fail.state, "source")).toBe("verified");
  });

  it("7. Batch does not become active after Product failure", () => {
    const fail = verifyCurrentStep(afterSource(), "1000001107");
    expect(fail.state.current).not.toBe("batch");
    expect(getStepStatus(fail.state, "batch")).toBe("waiting");
  });

  it("8. Product retry succeeds after failure", () => {
    let state = verifyCurrentStep(afterSource(), "1000001107").state;
    state = clearStepFailure(state);
    const retry = verifyCurrentStep(state, "1000001106");
    expect(retry.ok).toBe(true);
    if (!retry.ok) return;
    expect(retry.state.verified).toEqual(["wo", "source", "product"]);
  });

  it("9. Product success advances to Batch", () => {
    const ok = verifyCurrentStep(afterSource(), "1000001106");
    expect(ok.ok).toBe(true);
    if (!ok.ok) return;
    expect(ok.state.current).toBe("batch");
    expect(getStepStatus(ok.state, "batch")).toBe("current");
  });

  it("10. Camera failure does not reset workflow", () => {
    let state = afterSource();
    state = markUnreadableFailure(state);
    expect(state.verified).toEqual(["wo", "source"]);
    expect(state.current).toBe("product");
    expect(state.failureKind).toBe("unreadable");
    expect(getStepStatus(state, "product")).toBe("failed");
  });

  it("11. Camera cancellation does not reset workflow", () => {
    let state = afterSource();
    state = markUnreadableFailure(state);
    state = cancelCameraScan(state);
    expect(state.verified).toEqual(["wo", "source"]);
    expect(state.current).toBe("product");
    expect(state.failureKind).toBeNull();
  });

  it("12. Manual fallback after camera failure succeeds with correct value", () => {
    let state = afterSource();
    state = markUnreadableFailure(state);
    state = clearStepFailure(state);
    const manual = manualBarcodeScanner("1000001106");
    expect(manual.ok).toBe(true);
    if (!manual.ok) return;
    const result = verifyCurrentStep(state, manual.value);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.current).toBe("batch");
  });

  it("13. Manual fallback with incorrect value remains on Product", () => {
    const state = afterSource();
    const manual = manualBarcodeScanner("1000001107");
    expect(manual.ok).toBe(true);
    if (!manual.ok) return;
    const result = verifyCurrentStep(state, manual.value);
    expect(result.ok).toBe(false);
    expect(result.state.current).toBe("product");
    expect(result.state.verified).toEqual(["wo", "source"]);
  });

  it("15. Existing E2E happy path continues passing", () => {
    let state = createInitialPickingState();
    const values = [
      "200028",
      "0010-20-27",
      "1000001106",
      "BATCH1",
      "2",
      "9020 0001 GI-ZONE",
    ];
    for (const v of values) {
      const r = verifyCurrentStep(state, v);
      expect(r.ok).toBe(true);
      if (!r.ok) return;
      state = r.state;
    }
    expect(state.complete).toBe(true);
    expect(state.verified).toEqual([
      "wo",
      "source",
      "product",
      "batch",
      "quantity",
      "destination",
    ]);
    expect(state.verifiedValues?.destination).toBe("9020 0001 GI-ZONE");
    expect(state.verifiedAt?.destination).toEqual(expect.any(Number));
  });
});

describe("PickingWorkflowService — per-step verification UI state", () => {
  it("pending step displays waiting state", () => {
    const state = createInitialPickingState();
    expect(getStepStatus(state, "product")).toBe("waiting");
    expect(getStepStatus(state, "batch")).toBe("waiting");
  });

  it("active step displays current state", () => {
    const state = createInitialPickingState();
    expect(getStepStatus(state, "wo")).toBe("current");
  });

  it("each verified step exposes its own verified status", () => {
    let state = createInitialPickingState();
    expect(getStepStatus(state, "wo")).toBe("current");

    state = verifyCurrentStep(state, "200028").state;
    expect(getStepStatus(state, "wo")).toBe("verified");
    expect(getStepStatus(state, "source")).toBe("current");

    state = verifyCurrentStep(state, "0010-20-27").state;
    expect(getStepStatus(state, "source")).toBe("verified");
    expect(getStepStatus(state, "product")).toBe("current");

    state = verifyCurrentStep(state, "1000001106").state;
    expect(getStepStatus(state, "product")).toBe("verified");
    expect(getStepStatus(state, "batch")).toBe("current");
  });

  it("records verified display values per step", () => {
    let state = afterWo();
    state = verifyCurrentStep(state, "0010-20-27").state;
    state = verifyCurrentStep(state, "1000001106").state;
    expect(getVerifiedDisplayValue(state, "source")).toBe("0010-20-27");
    expect(getVerifiedDisplayValue(state, "product")).toBe("1000001106");
  });

  it("failed scan does not reset previous verified steps", () => {
    const fail = verifyCurrentStep(afterSource(), "1000001107");
    expect(getStepStatus(fail.state, "wo")).toBe("verified");
    expect(getStepStatus(fail.state, "source")).toBe("verified");
    expect(getStepStatus(fail.state, "product")).toBe("failed");
  });

  it("successful retry marks only the current step verified", () => {
    let state = verifyCurrentStep(afterSource(), "1000001107").state;
    state = clearStepFailure(state);
    state = verifyCurrentStep(state, "1000001106").state;
    expect(getStepStatus(state, "product")).toBe("verified");
    expect(state.verifiedValues?.product).toBe("1000001106");
  });

  it("formatVerifiedTimestamp renders a readable time", () => {
    const formatted = formatVerifiedTimestamp(new Date("2026-08-27T10:13:00").getTime());
    expect(formatted).toMatch(/10:13/);
  });

  it("verified steps stay locked after workflow advances", () => {
    let state = afterSource();
    state = verifyCurrentStep(state, "1000001106").state;
    expect(getStepStatus(state, "wo")).toBe("verified");
    expect(getStepStatus(state, "source")).toBe("verified");
    expect(getStepStatus(state, "product")).toBe("verified");
    expect(getStepStatus(state, "batch")).toBe("current");
    expect(state.current).toBe("batch");
  });

  it("validation only applies to the current step", () => {
    let state = afterSource();
    state = verifyCurrentStep(state, "1000001106").state;
    const wrongOnBatch = verifyCurrentStep(state, "1000001106");
    expect(wrongOnBatch.ok).toBe(false);
    expect(wrongOnBatch.state.current).toBe("batch");
    expect(getStepStatus(wrongOnBatch.state, "product")).toBe("verified");
  });

  it("failed Batch does not reset Product", () => {
    let state = afterSource();
    state = verifyCurrentStep(state, "1000001106").state;
    const fail = verifyCurrentStep(state, "WRONG-BATCH");
    expect(fail.state.current).toBe("batch");
    expect(getStepStatus(fail.state, "product")).toBe("verified");
    expect(getStepStatus(fail.state, "batch")).toBe("failed");
  });

  it("failed Destination Bin does not reset previous steps", () => {
    let state = afterSource();
    state = verifyCurrentStep(state, "1000001106").state;
    state = verifyCurrentStep(state, "BATCH1").state;
    state = verifyCurrentStep(state, "2").state;
    const fail = verifyCurrentStep(state, "WRONG-BIN");
    expect(fail.state.current).toBe("destination");
    expect(getStepStatus(fail.state, "quantity")).toBe("verified");
    expect(getStepStatus(fail.state, "batch")).toBe("verified");
    expect(getStepStatus(fail.state, "destination")).toBe("failed");
  });

  it("successful retry on failed current step advances normally", () => {
    let state = afterSource();
    state = verifyCurrentStep(state, "1000001107").state;
    state = clearStepFailure(state);
    state = verifyCurrentStep(state, "1000001106").state;
    expect(getStepStatus(state, "product")).toBe("verified");
    expect(state.current).toBe("batch");
  });
});

describe("SafeBarcodeScanner", () => {
  it("16. camera and safe scanners return raw value only", () => {
    expect(cameraBarcodeScanner(" 1000001106 ")).toEqual({
      ok: true,
      value: "1000001106",
    });
    expect(safeBarcodeScanner("BATCH1")).toEqual({ ok: true, value: "BATCH1" });
  });

  it("rejects empty / non-string payloads", () => {
    expect(safeBarcodeScanner("")).toEqual({ ok: false, reason: "empty" });
    expect(safeBarcodeScanner(null)).toEqual({ ok: false, reason: "invalid_type" });
    expect(manualBarcodeScanner("   ")).toEqual({ ok: false, reason: "empty" });
  });
});
