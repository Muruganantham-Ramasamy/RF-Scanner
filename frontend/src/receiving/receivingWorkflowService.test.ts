import { describe, expect, it } from "vitest";
import { safeBarcodeScanner } from "../picking/safeBarcodeScanner";
import {
  cancelReceivingCameraScan,
  clearReceivingFailure,
  createInitialReceivingState,
  createPrePoReceivingState,
  DEMO_RECEIVING,
  getReceivingStepStatus,
  markReceivingUnreadable,
  quantityErrorMessage,
  verifyReceivingStep,
} from "./receivingWorkflowService";

function afterSupplier(
  state = createInitialReceivingState(),
) {
  return verifyReceivingStep(state, DEMO_RECEIVING.supplier).state;
}

function afterProduct(state = afterSupplier()) {
  return verifyReceivingStep(state, DEMO_RECEIVING.product).state;
}

function afterBatch(state = afterProduct()) {
  return verifyReceivingStep(state, DEMO_RECEIVING.batchSerial).state;
}

function afterQuantity(state = afterBatch()) {
  return verifyReceivingStep(state, DEMO_RECEIVING.quantity).state;
}

describe("Purchase Order", () => {
  it("valid scan advances past PO", () => {
    const state = createPrePoReceivingState();
    const result = verifyReceivingStep(state, DEMO_RECEIVING.purchaseOrder);
    expect(result.ok).toBe(true);
    expect(result.state.verified).toContain("po");
    expect(result.state.current).toBe("supplier");
  });

  it("wrong PO fails and stays on PO", () => {
    const state = createPrePoReceivingState();
    const result = verifyReceivingStep(state, "9999999999");
    expect(result.ok).toBe(false);
    expect(result.state.current).toBe("po");
    expect(result.state.verified).toEqual([]);
  });

  it("blank PO fails", () => {
    const state = createPrePoReceivingState();
    const result = verifyReceivingStep(state, "   ");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("blank");
  });

  it("cancellation does not advance", () => {
    const state = createPrePoReceivingState();
    const next = cancelReceivingCameraScan(state);
    expect(next.current).toBe("po");
    expect(next.verified).toEqual([]);
  });

  it("scanner failure marks unreadable without advancing", () => {
    const state = createPrePoReceivingState();
    const next = markReceivingUnreadable(state);
    expect(next.failureKind).toBe("unreadable");
    expect(next.current).toBe("po");
  });

  it("manual fallback uses the same validation path", () => {
    const state = createPrePoReceivingState();
    const safe = safeBarcodeScanner(DEMO_RECEIVING.purchaseOrder);
    expect(safe.ok).toBe(true);
    if (!safe.ok) return;
    const result = verifyReceivingStep(state, safe.value);
    expect(result.ok).toBe(true);
    expect(result.state.current).toBe("supplier");
  });
});

describe("Supplier", () => {
  it("expected supplier succeeds", () => {
    const result = verifyReceivingStep(
      createInitialReceivingState(),
      DEMO_RECEIVING.supplier,
    );
    expect(result.ok).toBe(true);
    expect(result.state.current).toBe("product");
  });

  it("mismatch stays on supplier and keeps PO verified", () => {
    const result = verifyReceivingStep(createInitialReceivingState(), "Wrong Co");
    expect(result.ok).toBe(false);
    expect(result.state.current).toBe("supplier");
    expect(getReceivingStepStatus(result.state, "po")).toBe("verified");
  });
});

describe("Product", () => {
  it("valid product succeeds", () => {
    const result = verifyReceivingStep(afterSupplier(), DEMO_RECEIVING.product);
    expect(result.ok).toBe(true);
    expect(result.state.current).toBe("batchSerial");
  });

  it("wrong product fails", () => {
    const result = verifyReceivingStep(afterSupplier(), "999999");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("mismatch");
  });

  it("blank product fails", () => {
    const result = verifyReceivingStep(afterSupplier(), "");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("blank");
  });

  it("scanner failure does not advance", () => {
    const next = markReceivingUnreadable(afterSupplier());
    expect(next.current).toBe("product");
    expect(next.failureKind).toBe("unreadable");
  });

  it("cancellation never advances", () => {
    const next = cancelReceivingCameraScan(afterSupplier());
    expect(next.current).toBe("product");
  });

  it("manual fallback matches camera validation", () => {
    const safe = safeBarcodeScanner("999999");
    expect(safe.ok).toBe(true);
    if (!safe.ok) return;
    const fail = verifyReceivingStep(afterSupplier(), safe.value);
    expect(fail.ok).toBe(false);
    const okSafe = safeBarcodeScanner(DEMO_RECEIVING.product);
    expect(okSafe.ok).toBe(true);
    if (!okSafe.ok) return;
    const ok = verifyReceivingStep(afterSupplier(), okSafe.value);
    expect(ok.ok).toBe(true);
  });
});

describe("Batch / Serial", () => {
  it("valid batch succeeds", () => {
    const result = verifyReceivingStep(afterProduct(), DEMO_RECEIVING.batchSerial);
    expect(result.ok).toBe(true);
    expect(result.state.current).toBe("quantity");
  });

  it("wrong batch fails", () => {
    const result = verifyReceivingStep(afterProduct(), "BATCH99");
    expect(result.ok).toBe(false);
  });

  it("blank batch fails", () => {
    const result = verifyReceivingStep(afterProduct(), "");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("blank");
  });

  it("cancellation does not advance", () => {
    expect(cancelReceivingCameraScan(afterProduct()).current).toBe("batchSerial");
  });

  it("scanner failure stays on batch", () => {
    expect(markReceivingUnreadable(afterProduct()).current).toBe("batchSerial");
  });
});

describe("Quantity", () => {
  it("valid quantity succeeds", () => {
    const result = verifyReceivingStep(afterBatch(), DEMO_RECEIVING.quantity);
    expect(result.ok).toBe(true);
    expect(result.state.current).toBe("destination");
  });

  it("blank quantity fails", () => {
    const result = verifyReceivingStep(afterBatch(), "");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("blank");
      expect(quantityErrorMessage(result.reason)).toBe("Quantity is required.");
    }
  });

  it("zero quantity fails", () => {
    const result = verifyReceivingStep(afterBatch(), "0");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("invalid_quantity");
  });

  it("negative quantity fails", () => {
    const result = verifyReceivingStep(afterBatch(), "-5");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("invalid_quantity");
  });

  it("invalid quantity fails", () => {
    const result = verifyReceivingStep(afterBatch(), "abc");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("invalid_quantity");
  });

  it("excess quantity fails", () => {
    const result = verifyReceivingStep(afterBatch(), "101");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("excess_quantity");
  });
});

describe("Destination Bin", () => {
  it("valid destination completes workflow", () => {
    const result = verifyReceivingStep(afterQuantity(), DEMO_RECEIVING.destinationBin);
    expect(result.ok).toBe(true);
    expect(result.state.complete).toBe(true);
    expect(getReceivingStepStatus(result.state, "destination")).toBe("verified");
  });

  it("wrong destination fails", () => {
    const result = verifyReceivingStep(afterQuantity(), "9999-99-99");
    expect(result.ok).toBe(false);
    expect(result.state.complete).toBe(false);
  });

  it("blank destination fails", () => {
    const result = verifyReceivingStep(afterQuantity(), "");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("blank");
  });

  it("cancellation does not complete", () => {
    const next = cancelReceivingCameraScan(afterQuantity());
    expect(next.complete).toBe(false);
    expect(next.current).toBe("destination");
  });

  it("scanner failure does not complete", () => {
    const next = markReceivingUnreadable(afterQuantity());
    expect(next.complete).toBe(false);
  });
});

describe("Receiving workflow integrity", () => {
  it("cannot skip verification — product is current after supplier", () => {
    const state = afterSupplier();
    expect(state.current).toBe("product");
    expect(getReceivingStepStatus(state, "batchSerial")).toBe("waiting");
  });

  it("failed Product does not reset PO/Supplier", () => {
    const fail = verifyReceivingStep(afterSupplier(), "WRONG");
    expect(getReceivingStepStatus(fail.state, "po")).toBe("verified");
    expect(getReceivingStepStatus(fail.state, "supplier")).toBe("verified");
    expect(fail.state.current).toBe("product");
  });

  it("failed Batch does not reset Product", () => {
    const fail = verifyReceivingStep(afterProduct(), "WRONG");
    expect(getReceivingStepStatus(fail.state, "product")).toBe("verified");
    expect(fail.state.current).toBe("batchSerial");
  });

  it("failed Destination does not reset earlier verification", () => {
    const fail = verifyReceivingStep(afterQuantity(), "WRONG");
    expect(getReceivingStepStatus(fail.state, "po")).toBe("verified");
    expect(getReceivingStepStatus(fail.state, "supplier")).toBe("verified");
    expect(getReceivingStepStatus(fail.state, "product")).toBe("verified");
    expect(getReceivingStepStatus(fail.state, "batchSerial")).toBe("verified");
    expect(getReceivingStepStatus(fail.state, "quantity")).toBe("verified");
    expect(fail.state.current).toBe("destination");
  });

  it("successful complete flow reaches Goods Receipt readiness", () => {
    let state = createInitialReceivingState();
    state = verifyReceivingStep(state, DEMO_RECEIVING.supplier).state;
    state = verifyReceivingStep(state, DEMO_RECEIVING.product).state;
    state = verifyReceivingStep(state, DEMO_RECEIVING.batchSerial).state;
    state = verifyReceivingStep(state, DEMO_RECEIVING.quantity).state;
    const done = verifyReceivingStep(state, DEMO_RECEIVING.destinationBin);
    expect(done.ok).toBe(true);
    expect(done.state.complete).toBe(true);
  });

  it("clear failure allows retry on same step", () => {
    const fail = verifyReceivingStep(afterSupplier(), "WRONG");
    const cleared = clearReceivingFailure(fail.state);
    expect(cleared.failureKind).toBeNull();
    expect(cleared.current).toBe("product");
    const retry = verifyReceivingStep(cleared, DEMO_RECEIVING.product);
    expect(retry.ok).toBe(true);
  });
});
