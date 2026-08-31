import { useState, type ReactElement, type ReactNode } from "react";
import { safeBarcodeScanner } from "../picking/safeBarcodeScanner";
import {
  DEMO_RECEIVING,
  RECEIVING_STEP_ORDER,
  cancelReceivingCameraScan,
  clearReceivingFailure,
  createInitialReceivingState,
  createPrePoReceivingState,
  getReceivingStepStatus,
  markReceivingUnreadable,
  quantityErrorMessage,
  verifyReceivingStep,
  type ReceivingStepId,
  type ReceivingWorkflowState,
} from "./receivingWorkflowService";
import { RECEIVING_UI_TERMS, receivingDisplayValue } from "./receivingUiTerms";

type CameraOverlayProps = {
  title: string;
  description?: string;
  instruction: string;
  expectedValue: string;
  onCancel: () => void;
  onEnterManually: () => void;
  onScanCaptured: (value: string) => boolean | void | "ignore";
  onUnreadable?: () => void;
  layout?: "overlay" | "embedded";
  stepId?:
    | "wo"
    | "source"
    | "product"
    | "batch"
    | "quantity"
    | "destination";
  fillAvailable?: boolean;
  showStepGuide?: boolean;
};

export type ReceivingSharedUi = {
  ScreenShell: (props: { children: ReactNode }) => ReactElement;
  ScrollBody: (props: { children: ReactNode; className?: string }) => ReactElement;
  TopBar: (props: {
    title: string;
    subtitle: string;
    showBack?: boolean;
    onBack?: () => void;
  }) => ReactElement;
  BottomNav: (props: {
    active: "home" | "scan" | "activity" | "profile";
    onNavigate: (tab: "home" | "scan" | "activity" | "profile") => void;
  }) => ReactElement;
  CameraScanOverlay: (props: CameraOverlayProps) => ReactElement;
  IconQR: () => ReactElement;
  IconHash: () => ReactElement;
  IconWarning: () => ReactElement;
  IconSuccess: () => ReactElement;
  IconChevronRight: (props: { color?: string }) => ReactElement;
};

const EXEC_STEPS: {
  id: ReceivingStepId;
  label: string;
  meaning: string;
  displayValue: string;
  expected: string;
  kind: "scan" | "quantity";
  scanTitle: string;
  helper: string;
  mismatchTitle: string;
}[] = RECEIVING_STEP_ORDER.map((id) => {
  const term = RECEIVING_UI_TERMS[id];
  return {
    id,
    label: term.label,
    meaning: term.meaning,
    displayValue: receivingDisplayValue(id),
    expected:
      id === "quantity"
        ? DEMO_RECEIVING.quantity
        : receivingDisplayValue(id),
    kind: id === "quantity" ? "quantity" : "scan",
    scanTitle: term.scanTitle,
    helper: term.scanHelper,
    mismatchTitle: term.mismatchTitle,
  };
});

export function InboundHubScreen({
  ui,
  onBack,
  onStartReceiving,
}: {
  ui: ReceivingSharedUi;
  onBack: () => void;
  onStartReceiving: () => void;
}) {
  const { ScreenShell, ScrollBody, TopBar, BottomNav, IconChevronRight } = ui;

  return (
    <ScreenShell>
      <TopBar
        title="Purchasing / Inbound"
        subtitle="Receive products against a Purchase Order"
        showBack
        onBack={onBack}
      />
      <ScrollBody>
        <button
          onClick={onStartReceiving}
          className="w-full bg-white rounded-2xl p-4 shadow-sm flex items-center gap-3 text-left active:opacity-80"
          style={{ minHeight: "var(--touch-min)" }}
        >
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
            style={{ background: "#eeeeff" }}
          >
            <span className="text-sm font-extrabold" style={{ color: "#3b35c4" }}>
              PO
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm sm:text-base font-extrabold" style={{ color: "#1a1a2e" }}>
              Receiving by PO
            </p>
            <p className="text-xs sm:text-sm mt-0.5" style={{ color: "#7c7c99" }}>
              Scan or enter a Purchase Order
            </p>
          </div>
          <IconChevronRight />
        </button>
        <p className="text-[10px] sm:text-xs text-center font-semibold px-2" style={{ color: "#9898b8" }}>
          Demo / mock receiving — no SAP Goods Receipt posting
        </p>
      </ScrollBody>
      <BottomNav active="home" onNavigate={(tab) => tab === "home" && onBack()} />
    </ScreenShell>
  );
}

export function ScanPurchaseOrderScreen({
  ui,
  onBack,
  onPoVerified,
}: {
  ui: ReceivingSharedUi;
  onBack: () => void;
  onPoVerified: () => void;
}) {
  const {
    ScreenShell,
    ScrollBody,
    TopBar,
    BottomNav,
    CameraScanOverlay,
    IconQR,
    IconHash,
    IconWarning,
  } = ui;

  const [value, setValue] = useState<string>(DEMO_RECEIVING.purchaseOrder);
  const [scanning, setScanning] = useState(false);
  const [workflow, setWorkflow] = useState(createPrePoReceivingState);
  const [blankError, setBlankError] = useState(false);

  const status = getReceivingStepStatus(workflow, "po");
  const term = RECEIVING_UI_TERMS.po;

  function applyPo(raw: string) {
    const safe = safeBarcodeScanner(raw);
    if (!safe.ok) {
      setBlankError(true);
      setWorkflow((s) => ({ ...s, failureKind: "blank", failedValue: "" }));
      return;
    }
    setBlankError(false);
    setValue(safe.value);
    setWorkflow((s) => {
      const result = verifyReceivingStep(s, safe.value);
      if (result.ok) {
        queueMicrotask(() => onPoVerified());
      }
      return result.state;
    });
  }

  return (
    <ScreenShell>
      <TopBar
        title="Receiving by PO"
        subtitle="Scan or enter a Purchase Order"
        showBack
        onBack={onBack}
      />

      <ScrollBody className="space-y-3">
        <div>
          <h2 className="text-lg sm:text-xl font-extrabold" style={{ color: "#1a1a2e" }}>
            {term.scanTitle}
          </h2>
          <p className="text-xs sm:text-sm mt-1" style={{ color: "#7c7c99" }}>
            {term.scanHelper}
          </p>
        </div>

        <div className="bg-white rounded-2xl p-3.5 sm:p-4 shadow-sm">
          <p className="text-[10px] sm:text-xs font-extrabold tracking-widest uppercase" style={{ color: "#9898b8" }}>
            Expected Purchase Order (Demo)
          </p>
          <p
            className="text-base sm:text-lg font-extrabold mt-1"
            style={{ color: "#1a1a2e", fontFamily: "'JetBrains Mono', monospace" }}
          >
            {DEMO_RECEIVING.purchaseOrder}
          </p>
          <p className="text-xs mt-1" style={{ color: "#7c7c99" }}>
            {term.meaning}
          </p>
        </div>

        {status === "failed" && (
          <div
            className="rounded-2xl px-3 sm:px-4 py-3 flex items-start gap-3"
            style={{ background: "#fffbeb", border: "1.5px solid #fbbf24" }}
          >
            <IconWarning />
            <div>
              <p className="text-xs sm:text-sm font-extrabold" style={{ color: "#92400e" }}>
                {workflow.failureKind === "unreadable"
                  ? "Unable to read barcode."
                  : term.mismatchTitle}
              </p>
              <p className="text-xs font-semibold mt-1" style={{ color: "#92400e" }}>
                Please try again or use manual entry.
              </p>
            </div>
          </div>
        )}

        {blankError && (
          <div
            className="rounded-2xl px-3 sm:px-4 py-3 flex items-start gap-3"
            style={{ background: "#fffbeb", border: "1.5px solid #fbbf24" }}
          >
            <IconWarning />
            <p className="text-xs sm:text-sm font-semibold" style={{ color: "#92400e" }}>
              Enter a Purchase Order or scan with camera
            </p>
          </div>
        )}

        {status !== "verified" && (
          <>
            <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm flex flex-col items-center gap-3">
              <div
                className="w-20 h-20 rounded-full flex items-center justify-center"
                style={{ background: "#eeeeff" }}
              >
                <IconQR />
              </div>
              <button
                onClick={() => {
                  setBlankError(false);
                  setWorkflow((s) => clearReceivingFailure(s));
                  setScanning(true);
                }}
                className="w-full py-3.5 rounded-xl text-white font-bold text-sm"
                style={{ background: "#1a1a22", minHeight: "var(--touch-min)" }}
              >
                Scan Purchase Order
              </button>
              <p className="text-[10px] text-center" style={{ color: "#b0b0cc" }}>
                Camera unavailable? Enter barcode manually.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex-1 h-px" style={{ background: "#e0e0ec" }} />
              <span className="text-[10px] font-bold tracking-widest" style={{ color: "#b0b0cc" }}>
                OR MANUAL ENTRY
              </span>
              <div className="flex-1 h-px" style={{ background: "#e0e0ec" }} />
            </div>

            <div>
              <label className="text-xs font-semibold block mb-2" style={{ color: "#1a1a2e" }}>
                Purchase Order
              </label>
              <div
                className="flex items-center gap-3 rounded-xl px-3 py-3 bg-white"
                style={{ border: "1.5px solid #e0e0ec", minHeight: "var(--touch-min)" }}
              >
                <IconHash />
                <input
                  type="text"
                  value={value}
                  onChange={(e) => {
                    setValue(e.target.value);
                    setBlankError(false);
                    setWorkflow((s) => clearReceivingFailure(s));
                  }}
                  className="flex-1 outline-none text-base font-semibold bg-transparent min-w-0"
                  style={{ color: "#1a1a2e", fontFamily: "'JetBrains Mono', monospace" }}
                  placeholder="Enter PO number"
                />
              </div>
            </div>

            <button
              onClick={() => applyPo(value)}
              className="w-full py-3.5 rounded-2xl text-white font-bold text-sm"
              style={{
                background: value.trim() ? "#26208a" : "#b0b0cc",
                minHeight: "var(--touch-min)",
              }}
            >
              Manual Entry
            </button>
          </>
        )}
      </ScrollBody>

      <BottomNav active="scan" onNavigate={(tab) => tab === "home" && onBack()} />

      {scanning && (
        <CameraScanOverlay
          title={term.scanTitle}
          description={term.scanHelper}
          instruction={term.meaning}
          stepId="wo"
          expectedValue={DEMO_RECEIVING.purchaseOrder}
          onCancel={() => {
            setScanning(false);
            setWorkflow((s) => cancelReceivingCameraScan(s));
          }}
          onEnterManually={() => {
            setScanning(false);
            setWorkflow((s) => clearReceivingFailure(s));
          }}
          onUnreadable={() => setWorkflow((s) => markReceivingUnreadable(s))}
          onScanCaptured={(scanned) => {
            setScanning(false);
            applyPo(scanned);
          }}
        />
      )}
    </ScreenShell>
  );
}

export function ReceivingExecutionScreen({
  ui,
  onBack,
  onComplete,
}: {
  ui: ReceivingSharedUi;
  onBack: () => void;
  onComplete: () => void;
}) {
  const {
    ScreenShell,
    ScrollBody,
    TopBar,
    BottomNav,
    CameraScanOverlay,
    IconHash,
    IconWarning,
  } = ui;

  const [workflow, setWorkflow] = useState<ReceivingWorkflowState>(createInitialReceivingState);
  const [inputValue, setInputValue] = useState("");
  const [scanning, setScanning] = useState(false);
  const [showManual, setShowManual] = useState(false);

  const activeStep = EXEC_STEPS.find((s) => s.id === workflow.current)!;
  const activeIndex = RECEIVING_STEP_ORDER.indexOf(workflow.current);
  const complete = workflow.complete;
  const failed = workflow.failureKind !== null;

  function submitRawValue(raw: string) {
    const safe = safeBarcodeScanner(raw);
    if (!safe.ok) {
      setWorkflow((s) => ({
        ...s,
        failureKind: "blank",
        failedValue: "",
      }));
      return;
    }
    setWorkflow((s) => {
      const result = verifyReceivingStep(s, safe.value);
      if (result.ok) {
        setInputValue("");
        setShowManual(false);
        if (result.state.complete) {
          queueMicrotask(() => onComplete());
        }
      }
      return result.state;
    });
  }

  function retryCurrentStep() {
    setWorkflow((s) => clearReceivingFailure(s));
    setInputValue("");
  }

  return (
    <ScreenShell>
      <TopBar
        title="Receiving by PO"
        subtitle="Verify each receiving step in sequence"
        showBack
        onBack={onBack}
      />

      <ScrollBody className="space-y-3">
        <div className="bg-white rounded-2xl p-3.5 sm:p-4 shadow-sm">
          <p className="text-[10px] sm:text-xs font-extrabold tracking-widest uppercase" style={{ color: "#9898b8" }}>
            Purchase Order (Demo)
          </p>
          <p
            className="text-base sm:text-lg font-extrabold mt-1"
            style={{ color: "#1a1a2e", fontFamily: "'JetBrains Mono', monospace" }}
          >
            {DEMO_RECEIVING.purchaseOrder}
          </p>
          <p className="text-xs mt-1" style={{ color: "#7c7c99" }}>
            {RECEIVING_UI_TERMS.po.meaning}
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          {EXEC_STEPS.map((step, index) => {
            const status = getReceivingStepStatus(workflow, step.id);
            const isLast = index === EXEC_STEPS.length - 1;
            const isActive = (status === "current" || status === "failed") && !complete;
            const showFailure = isActive && failed && workflow.current === step.id;

            return (
              <div key={step.id}>
                <div
                  className="px-3.5 sm:px-4 py-3.5"
                  style={{
                    background: isActive ? "#eeeeff" : "white",
                    borderBottom: isLast ? "none" : "1px solid #f0f0f8",
                  }}
                >
                  <div className="flex gap-3">
                    <div className="flex flex-col items-center shrink-0 pt-0.5">
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-extrabold"
                        style={{
                          background:
                            status === "verified"
                              ? "#d1fae5"
                              : status === "failed"
                                ? "#fee2e2"
                                : isActive
                                  ? "#3b35c4"
                                  : "#f4f4f8",
                          color:
                            status === "verified"
                              ? "#059669"
                              : status === "failed"
                                ? "#dc2626"
                                : isActive
                                  ? "white"
                                  : "#c0c0d8",
                        }}
                      >
                        {status === "verified" ? "✓" : status === "failed" ? "✕" : isActive ? "→" : "○"}
                      </div>
                      {!isLast && (
                        <div
                          className="w-0.5 flex-1 min-h-[16px] mt-1"
                          style={{
                            background: status === "verified" ? "#6ee7b7" : "#e8e8f0",
                          }}
                        />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p
                          className="text-sm sm:text-base font-extrabold"
                          style={{
                            color:
                              status === "verified"
                                ? "#059669"
                                : status === "failed"
                                  ? "#dc2626"
                                  : isActive
                                    ? "#3b35c4"
                                    : "#9898b8",
                          }}
                        >
                          {step.label}
                        </p>
                        <span
                          className="text-[10px] sm:text-xs font-bold shrink-0"
                          style={{
                            color:
                              status === "verified"
                                ? "#059669"
                                : status === "failed"
                                  ? "#dc2626"
                                  : isActive
                                    ? "#3b35c4"
                                    : "#c0c0d8",
                          }}
                        >
                          {status === "verified"
                            ? "✓"
                            : status === "failed"
                              ? "Retry"
                              : isActive
                                ? step.kind === "quantity"
                                  ? "Confirm"
                                  : "Scan"
                                : failed && index > activeIndex
                                  ? "Locked"
                                  : "○"}
                        </span>
                      </div>

                      <p
                        className="text-xs sm:text-sm font-bold mt-0.5 break-all"
                        style={{
                          color: status === "waiting" ? "#c0c0d8" : "#1a1a2e",
                          fontFamily: "'JetBrains Mono', monospace",
                        }}
                      >
                        {step.id === "quantity"
                          ? `${DEMO_RECEIVING.quantity} ${DEMO_RECEIVING.uom}`
                          : step.displayValue}
                      </p>
                      <p className="text-[11px] mt-0.5" style={{ color: "#9898b8" }}>
                        {status === "verified" ? "Verified" : step.meaning}
                      </p>

                      {isActive && (
                        <p className="text-xs mt-1.5 font-semibold" style={{ color: "#7c7c99" }}>
                          Current step: {step.scanTitle}
                        </p>
                      )}

                      {isActive && (
                        <div className="mt-3 space-y-3">
                          {showFailure && (
                            <div
                              className="rounded-xl px-3 py-3"
                              style={{ background: "#fffbeb", border: "1.5px solid #fbbf24" }}
                            >
                              <div className="flex items-start gap-2">
                                <IconWarning />
                                <div className="min-w-0">
                                  <p className="text-xs sm:text-sm font-extrabold" style={{ color: "#92400e" }}>
                                    {workflow.failureKind === "unreadable"
                                      ? "Unable to read barcode."
                                      : step.kind === "quantity"
                                        ? quantityErrorMessage(workflow.failureKind)
                                        : step.mismatchTitle}
                                  </p>
                                  {workflow.failureKind !== "unreadable" && step.kind !== "quantity" && (
                                    <>
                                      <p className="text-xs font-semibold mt-1" style={{ color: "#92400e" }}>
                                        Expected:{" "}
                                        <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                                          {step.displayValue}
                                        </span>
                                      </p>
                                      {workflow.failedValue ? (
                                        <p className="text-xs font-semibold mt-0.5" style={{ color: "#92400e" }}>
                                          Scanned:{" "}
                                          <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                                            {workflow.failedValue}
                                          </span>
                                        </p>
                                      ) : null}
                                    </>
                                  )}
                                </div>
                              </div>
                              <div className="flex gap-2 mt-3">
                                <button
                                  onClick={() => {
                                    retryCurrentStep();
                                    if (step.kind === "scan") setScanning(true);
                                  }}
                                  className="flex-1 py-2.5 rounded-xl text-white text-xs font-bold"
                                  style={{ background: "#1a1a22", minHeight: "var(--touch-min)" }}
                                >
                                  {step.kind === "scan" ? "Retry Scan" : "Try Again"}
                                </button>
                                {step.kind === "scan" && (
                                  <button
                                    onClick={() => {
                                      setWorkflow((s) => clearReceivingFailure(s));
                                      setShowManual(true);
                                    }}
                                    className="flex-1 py-2.5 rounded-xl text-xs font-bold"
                                    style={{
                                      background: "#eeeeff",
                                      color: "#3b35c4",
                                      minHeight: "var(--touch-min)",
                                    }}
                                  >
                                    Enter Manually
                                  </button>
                                )}
                              </div>
                            </div>
                          )}

                          {!showFailure && step.kind === "scan" && (
                            <>
                              <button
                                onClick={() => setScanning(true)}
                                className="w-full py-3.5 rounded-xl text-white font-bold text-sm"
                                style={{ background: "#1a1a22", minHeight: "var(--touch-min)" }}
                              >
                                Scan with Camera
                              </button>
                              <div className="flex items-center gap-3">
                                <div className="flex-1 h-px" style={{ background: "#e0e0ec" }} />
                                <span className="text-[10px] font-bold tracking-widest" style={{ color: "#b0b0cc" }}>
                                  OR MANUAL ENTRY
                                </span>
                                <div className="flex-1 h-px" style={{ background: "#e0e0ec" }} />
                              </div>
                              <div>
                                <label className="text-xs font-semibold block mb-2" style={{ color: "#1a1a2e" }}>
                                  Manual Entry
                                </label>
                                <div
                                  className="flex items-center gap-3 rounded-xl px-3 py-3 bg-white"
                                  style={{
                                    border: "1.5px solid #e0e0ec",
                                    minHeight: "var(--touch-min)",
                                  }}
                                >
                                  <IconHash />
                                  <input
                                    type="text"
                                    value={inputValue}
                                    onChange={(e) => setInputValue(e.target.value)}
                                    autoFocus={showManual}
                                    className="flex-1 outline-none text-base font-semibold bg-transparent min-w-0"
                                    style={{
                                      color: "#1a1a2e",
                                      fontFamily: "'JetBrains Mono', monospace",
                                    }}
                                    placeholder={`Enter ${step.label}`}
                                  />
                                </div>
                              </div>
                              <button
                                onClick={() => submitRawValue(inputValue)}
                                className="w-full py-3.5 rounded-2xl text-white font-bold text-sm"
                                style={{
                                  background: inputValue.trim() ? "#26208a" : "#b0b0cc",
                                  minHeight: "var(--touch-min)",
                                }}
                              >
                                Continue
                              </button>
                            </>
                          )}

                          {!showFailure && step.kind === "quantity" && (
                            <>
                              <div>
                                <label className="text-xs font-semibold block mb-2" style={{ color: "#1a1a2e" }}>
                                  Expected Quantity
                                </label>
                                <p
                                  className="text-sm font-extrabold mb-3"
                                  style={{
                                    color: "#1a1a2e",
                                    fontFamily: "'JetBrains Mono', monospace",
                                  }}
                                >
                                  {DEMO_RECEIVING.quantity} {DEMO_RECEIVING.uom}
                                </p>
                                <label className="text-xs font-semibold block mb-2" style={{ color: "#1a1a2e" }}>
                                  Received Quantity
                                </label>
                                <div
                                  className="flex items-center gap-3 rounded-xl px-3 py-3 bg-white"
                                  style={{
                                    border: "1.5px solid #e0e0ec",
                                    minHeight: "var(--touch-min)",
                                  }}
                                >
                                  <IconHash />
                                  <input
                                    type="text"
                                    inputMode="numeric"
                                    value={inputValue}
                                    onChange={(e) => setInputValue(e.target.value)}
                                    className="flex-1 outline-none text-base font-semibold bg-transparent min-w-0"
                                    style={{
                                      color: "#1a1a2e",
                                      fontFamily: "'JetBrains Mono', monospace",
                                    }}
                                    placeholder="100"
                                  />
                                  <span
                                    className="text-xs font-bold shrink-0 px-2 py-1 rounded-lg"
                                    style={{ background: "#eeeeff", color: "#3b35c4" }}
                                  >
                                    {DEMO_RECEIVING.uom}
                                  </span>
                                </div>
                              </div>
                              <button
                                onClick={() => submitRawValue(inputValue)}
                                className="w-full py-3.5 rounded-2xl text-white font-bold text-sm"
                                style={{
                                  background: inputValue.trim() ? "#26208a" : "#b0b0cc",
                                  minHeight: "var(--touch-min)",
                                }}
                              >
                                Confirm Quantity
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {!complete && (
          <button
            onClick={onBack}
            className="w-full py-3.5 rounded-2xl font-bold text-sm mb-1"
            style={{ background: "#f4f4f8", color: "#5a5a7a", minHeight: "var(--touch-min)" }}
          >
            Cancel
          </button>
        )}
      </ScrollBody>

      <BottomNav active="scan" onNavigate={(tab) => tab === "home" && onBack()} />

      {scanning && activeStep.kind === "scan" && !complete && (
        <CameraScanOverlay
          title={activeStep.scanTitle}
          description={activeStep.helper}
          instruction={activeStep.meaning}
          stepId={
            activeStep.id === "po"
              ? "wo"
              : activeStep.id === "supplier"
                ? "batch"
                : activeStep.id === "product"
                  ? "product"
                  : activeStep.id === "batchSerial"
                    ? "batch"
                    : activeStep.id === "destination"
                      ? "destination"
                      : "product"
          }
          expectedValue={activeStep.displayValue}
          onCancel={() => {
            setScanning(false);
            setWorkflow((s) => cancelReceivingCameraScan(s));
          }}
          onEnterManually={() => {
            setScanning(false);
            setWorkflow((s) => clearReceivingFailure(s));
            setShowManual(true);
          }}
          onUnreadable={() => setWorkflow((s) => markReceivingUnreadable(s))}
          onScanCaptured={(scanned) => {
            setScanning(false);
            submitRawValue(scanned);
          }}
        />
      )}
    </ScreenShell>
  );
}

export function GoodsReceiptScreen({
  ui,
  onHome,
}: {
  ui: ReceivingSharedUi;
  onHome: () => void;
}) {
  const { ScreenShell, ScrollBody, TopBar, BottomNav, IconSuccess } = ui;
  const [done, setDone] = useState(false);

  const summary = [
    {
      label: RECEIVING_UI_TERMS.po.label,
      value: DEMO_RECEIVING.purchaseOrder,
      meaning: RECEIVING_UI_TERMS.po.meaning,
    },
    {
      label: RECEIVING_UI_TERMS.supplier.label,
      value: DEMO_RECEIVING.supplier,
      meaning: RECEIVING_UI_TERMS.supplier.meaning,
    },
    {
      label: RECEIVING_UI_TERMS.product.label,
      value: DEMO_RECEIVING.product,
      meaning: RECEIVING_UI_TERMS.product.meaning,
    },
    {
      label: "Batch",
      value: DEMO_RECEIVING.batchSerial,
      meaning: RECEIVING_UI_TERMS.batchSerial.meaning,
    },
    {
      label: RECEIVING_UI_TERMS.quantity.label,
      value: `${DEMO_RECEIVING.quantity} ${DEMO_RECEIVING.uom}`,
      meaning: RECEIVING_UI_TERMS.quantity.meaning,
    },
    {
      label: RECEIVING_UI_TERMS.destination.label,
      value: DEMO_RECEIVING.destinationBin,
      meaning: RECEIVING_UI_TERMS.destination.meaning,
    },
  ];

  return (
    <ScreenShell>
      <TopBar title="Goods Receipt" subtitle="Demo receiving confirmation" showBack onBack={onHome} />

      <ScrollBody className="space-y-3">
        <div className="bg-white rounded-2xl p-5 shadow-sm flex flex-col items-center gap-3 text-center">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center"
            style={{ background: "#d1fae5" }}
          >
            <IconSuccess />
          </div>
          {!done ? (
            <>
              <h2 className="text-xl font-extrabold" style={{ color: "#1a1a2e" }}>
                ✓ Ready for Goods Receipt
              </h2>
              <p className="text-xs font-semibold" style={{ color: "#059669" }}>
                Demo receiving completed
              </p>
              <p className="text-[10px] font-semibold" style={{ color: "#9898b8" }}>
                No SAP Goods Receipt was posted.
              </p>
            </>
          ) : (
            <>
              <h2 className="text-xl font-extrabold" style={{ color: "#1a1a2e" }}>
                ✓ Goods Receipt Complete
              </h2>
              <p className="text-xs font-semibold" style={{ color: "#059669" }}>
                Demo receiving process completed successfully.
              </p>
              <p className="text-[10px] font-semibold" style={{ color: "#9898b8" }}>
                No SAP inventory update was performed.
              </p>
            </>
          )}
        </div>

        <div className="bg-white rounded-2xl p-3.5 sm:p-4 shadow-sm">
          <h3
            className="text-[10px] sm:text-xs font-extrabold tracking-widest uppercase mb-3"
            style={{ color: "#1a1a2e" }}
          >
            Receiving Summary (Demo)
          </h3>
          {summary.map((row, i) => (
            <div
              key={row.label}
              className="flex justify-between items-start gap-3 py-2.5"
              style={{
                borderBottom: i < summary.length - 1 ? "1px solid #f0f0f8" : "none",
              }}
            >
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm font-semibold" style={{ color: "#1a1a2e" }}>
                  {row.label}
                </p>
                <p className="text-[11px] mt-0.5" style={{ color: "#9898b8" }}>
                  {row.meaning}
                </p>
              </div>
              <span
                className="text-xs sm:text-sm font-bold text-right break-all shrink-0 max-w-[45%]"
                style={{ color: "#1a1a2e", fontFamily: "'JetBrains Mono', monospace" }}
              >
                {row.value}
              </span>
            </div>
          ))}
        </div>

        {!done ? (
          <button
            onClick={() => setDone(true)}
            className="w-full py-3.5 rounded-2xl text-white font-bold text-sm"
            style={{ background: "#3b35c4", minHeight: "var(--touch-min)" }}
          >
            Complete Demo
          </button>
        ) : (
          <button
            onClick={onHome}
            className="w-full py-3.5 rounded-2xl text-white font-bold text-sm"
            style={{ background: "#059669", minHeight: "var(--touch-min)" }}
          >
            Back to Home
          </button>
        )}
      </ScrollBody>

      <BottomNav active="home" onNavigate={(tab) => tab === "home" && onHome()} />
    </ScreenShell>
  );
}
