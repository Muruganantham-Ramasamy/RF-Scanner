import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  CAMERA_ACTIVE_STATUS,
  PICKING_COMPLETE_UI,
  PICKING_UI_TERMS,
  UOM_UI,
  VERIFICATION_SUMMARY_UI,
  expectedValueLabel,
  movingToNextLabel,
  pickingDisplayValue,
  verifiedSuccessLabel,
} from "./picking/pickingUiTerms";
import {
  DEMO_PICK,
  EXPECTED_BY_STEP,
  cancelCameraScan,
  clearStepFailure,
  createInitialPickingState,
  formatVerifiedTimestamp,
  getVerifiedDisplayValue,
  markUnreadableFailure,
  verifyCurrentStep,
  type PickingStepId,
  type PickingWorkflowState,
} from "./picking/pickingWorkflowService";
import {
  PICKING_METHODS,
  getActivePickingDocument,
  getConsolidatedPickingDetailRows,
  getPickingMethodMeta,
  type PickingMethodId,
} from "./picking/pickingDataSource";
import { startLiveBarcodeDetection } from "./picking/cameraBarcodeDetector";
import { safeBarcodeScanner, createSafeScanSession } from "./picking/safeBarcodeScanner";
import { getScanContext, shouldAutoStartCamera } from "./picking/scanContext";
import { WarehouseOrderEntryController } from "./picking/warehouseOrderEntry";
import {
  GoodsReceiptScreen,
  ReceivingExecutionScreen,
  ScanPurchaseOrderScreen,
  type ReceivingSharedUi,
} from "./receiving/ReceivingScreens";

type NavTab = "home" | "scan" | "activity" | "profile";

type AppChromeValue = {
  navigateTab: (tab: NavTab) => void;
  logout: () => void;
  goProfile: () => void;
};

const AppChromeContext = createContext<AppChromeValue | null>(null);

function useAppChrome(): AppChromeValue {
  const ctx = useContext(AppChromeContext);
  if (!ctx) {
    return {
      navigateTab: () => {},
      logout: () => {},
      goProfile: () => {},
    };
  }
  return ctx;
}

// ─── Types ────────────────────────────────────────────────────────────────────
type Screen =
  | "login"
  | "home"
  | "production"
  | "inbound"
  | "outbound"
  | "physical-inventory"
  | "internal"
  | "wo-selection"
  | "scan-po"
  | "receiving-execution"
  | "goods-receipt"
  | "picking-methods"
  | "scan-wo"
  | "picking-details"
  | "picking-execution"
  | "scan-source-bin"
  | "scan-product"
  | "scan-batch"
  | "confirm-quantity"
  | "scan-destination-bin"
  | "picking-complete"
  | "activity"
  | "profile";

type ModuleHubScreen =
  | "production"
  | "inbound"
  | "outbound"
  | "physical-inventory"
  | "internal"
  | "wo-selection";

const MODULE_HUB_CONFIG: Record<ModuleHubScreen, { title: string; subtitle: string }> = {
  production: { title: "Production Processes", subtitle: "Select an operation" },
  inbound: { title: "Inbound Processes", subtitle: "Select an operation" },
  outbound: { title: "Outbound Processes", subtitle: "Select an operation" },
  "physical-inventory": { title: "Physical Inventory", subtitle: "Select an operation" },
  internal: { title: "Internal Processes", subtitle: "Select an operation" },
  "wo-selection": { title: "WO Selection", subtitle: "Select an operation" },
};

function isModuleHubScreen(screen: Screen): screen is ModuleHubScreen {
  return screen in MODULE_HUB_CONFIG;
}

type PickingMethod = PickingMethodId;

// ─── Icons ────────────────────────────────────────────────────────────────────
function IconHome({ active }: { active?: boolean }) {
  return (
    <svg width="24" height="24" fill="none" viewBox="0 0 24 24">
      <path
        d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H5a1 1 0 01-1-1V9.5z"
        stroke={active ? "#3b35c4" : "#9898b8"}
        strokeWidth="1.8"
        strokeLinejoin="round"
        fill={active ? "#eeeeff" : "none"}
      />
      <path
        d="M9 21V12h6v9"
        stroke={active ? "#3b35c4" : "#9898b8"}
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconScan({ active }: { active?: boolean }) {
  const c = active ? "#3b35c4" : "#9898b8";
  return (
    <svg width="24" height="24" fill="none" viewBox="0 0 24 24">
      <rect x="3" y="3" width="5" height="5" rx="1" stroke={c} strokeWidth="1.8" />
      <rect x="16" y="3" width="5" height="5" rx="1" stroke={c} strokeWidth="1.8" />
      <rect x="3" y="16" width="5" height="5" rx="1" stroke={c} strokeWidth="1.8" />
      <path d="M16 16h2v2h-2zM18 18h3v3h-3zM16 20h2" stroke={c} strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function IconActivity({ active }: { active?: boolean }) {
  const c = active ? "#3b35c4" : "#9898b8";
  return (
    <svg width="24" height="24" fill="none" viewBox="0 0 24 24">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconProfile({ active }: { active?: boolean }) {
  const c = active ? "#3b35c4" : "#9898b8";
  return (
    <svg width="24" height="24" fill="none" viewBox="0 0 24 24">
      <circle cx="12" cy="8" r="4" stroke={c} strokeWidth="1.8" />
      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke={c} strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function IconBox({ muted }: { muted?: boolean }) {
  const c = muted ? "#b0b0cc" : "#3b35c4";
  return (
    <svg width="28" height="28" fill="none" viewBox="0 0 24 24">
      <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" stroke={c} strokeWidth="1.8" strokeLinejoin="round" />
      <polyline points="3.27 6.96 12 12.01 20.73 6.96" stroke={c} strokeWidth="1.8" />
      <line x1="12" y1="22.08" x2="12" y2="12" stroke={c} strokeWidth="1.8" />
    </svg>
  );
}

function IconArchive({ muted }: { muted?: boolean }) {
  const c = muted ? "#b0b0cc" : "#3b35c4";
  return (
    <svg width="28" height="28" fill="none" viewBox="0 0 24 24">
      <rect x="2" y="3" width="20" height="5" rx="1" stroke={c} strokeWidth="1.8" />
      <path d="M4 8v11a2 2 0 002 2h12a2 2 0 002-2V8" stroke={c} strokeWidth="1.8" />
      <path d="M10 12h4" stroke={c} strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function IconTruck({ muted }: { muted?: boolean }) {
  const c = muted ? "#b0b0cc" : "#3b35c4";
  return (
    <svg width="28" height="28" fill="none" viewBox="0 0 24 24">
      <rect x="1" y="3" width="15" height="13" rx="1" stroke={c} strokeWidth="1.8" />
      <path d="M16 8h4l3 5v4h-7V8z" stroke={c} strokeWidth="1.8" strokeLinejoin="round" />
      <circle cx="5.5" cy="18.5" r="2.5" stroke={c} strokeWidth="1.8" />
      <circle cx="18.5" cy="18.5" r="2.5" stroke={c} strokeWidth="1.8" />
    </svg>
  );
}

function IconFactory({ muted }: { muted?: boolean }) {
  const c = muted ? "#b0b0cc" : "#3b35c4";
  return (
    <svg width="28" height="28" fill="none" viewBox="0 0 24 24">
      <path
        d="M3 20V9l6 4V9l6 4V4h6v16H3z"
        stroke={c}
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M7 20v-3M12 20v-3M17 20v-3" stroke={c} strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function IconInternal({ muted }: { muted?: boolean }) {
  const c = muted ? "#b0b0cc" : "#3b35c4";
  return (
    <svg width="28" height="28" fill="none" viewBox="0 0 24 24">
      <path d="M7 7h10v10H7V7z" stroke={c} strokeWidth="1.8" strokeLinejoin="round" />
      <path
        d="M3 12h4M17 12h4M12 3v4M12 17v4"
        stroke={c}
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconWarehouseOrder({ muted }: { muted?: boolean }) {
  const c = muted ? "#b0b0cc" : "#3b35c4";
  return (
    <svg width="28" height="28" fill="none" viewBox="0 0 24 24">
      <path
        d="M8 3h9a2 2 0 012 2v14l-3-1.5L13 19l-3-1.5L7 19V5a2 2 0 011-2z"
        stroke={c}
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path d="M10 8h6M10 12h6M10 16h3" stroke={c} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function IconLock() {
  return (
    <svg width="20" height="20" fill="none" viewBox="0 0 24 24">
      <rect x="5" y="11" width="14" height="10" rx="2" stroke="#c0c0d8" strokeWidth="1.8" />
      <path d="M8 11V7a4 4 0 018 0v4" stroke="#c0c0d8" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function IconChevronRight({ color = "#3b35c4" }: { color?: string }) {
  return (
    <svg width="20" height="20" fill="none" viewBox="0 0 24 24">
      <polyline points="9 18 15 12 9 6" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconBack() {
  return (
    <svg width="22" height="22" fill="none" viewBox="0 0 24 24">
      <polyline points="15 18 9 12 15 6" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconLogout() {
  return (
    <svg width="20" height="20" fill="none" viewBox="0 0 24 24">
      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
      <polyline points="16 17 21 12 16 7" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="21" y1="12" x2="9" y2="12" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function IconQR() {
  return (
    <svg width="56" height="56" fill="none" viewBox="0 0 24 24">
      <rect x="3" y="3" width="7" height="7" rx="1" stroke="#3b35c4" strokeWidth="1.6" />
      <rect x="5" y="5" width="3" height="3" fill="#3b35c4" />
      <rect x="14" y="3" width="7" height="7" rx="1" stroke="#3b35c4" strokeWidth="1.6" />
      <rect x="16" y="5" width="3" height="3" fill="#3b35c4" />
      <rect x="3" y="14" width="7" height="7" rx="1" stroke="#3b35c4" strokeWidth="1.6" />
      <rect x="5" y="16" width="3" height="3" fill="#3b35c4" />
      <path d="M14 14h3v3h-3zM17 17h3v3h-3zM14 20h3" stroke="#3b35c4" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function IconWarning() {
  return (
    <svg width="18" height="18" fill="none" viewBox="0 0 24 24">
      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" stroke="#d97706" strokeWidth="1.8" strokeLinejoin="round" />
      <line x1="12" y1="9" x2="12" y2="13" stroke="#d97706" strokeWidth="1.8" strokeLinecap="round" />
      <line x1="12" y1="17" x2="12.01" y2="17" stroke="#d97706" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

function IconPlay() {
  return (
    <svg width="22" height="22" fill="white" viewBox="0 0 24 24">
      <polygon points="5 3 19 12 5 21 5 3" stroke="white" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

function IconHash() {
  return (
    <svg width="18" height="18" fill="none" viewBox="0 0 24 24">
      <line x1="4" y1="9" x2="20" y2="9" stroke="#9898b8" strokeWidth="2" strokeLinecap="round" />
      <line x1="4" y1="15" x2="20" y2="15" stroke="#9898b8" strokeWidth="2" strokeLinecap="round" />
      <line x1="10" y1="3" x2="8" y2="21" stroke="#9898b8" strokeWidth="2" strokeLinecap="round" />
      <line x1="16" y1="3" x2="14" y2="21" stroke="#9898b8" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function IconSuccess() {
  return (
    <svg width="40" height="40" fill="none" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="9" stroke="#059669" strokeWidth="1.8" />
      <polyline
        points="8 12 11 15 16 9"
        stroke="#059669"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconClock() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="#9898b8" strokeWidth="2" />
      <path d="M12 7v5l3 2" stroke="#9898b8" strokeWidth="2" strokeLinecap="round" />
        </svg>
  );
}

/** Illustrated animated icons matching the warehouse scan reference. */
function StepFieldIcon({
  stepId,
  active = false,
  scanning = false,
  color: _color,
  size = 16,
  quantityValue,
}: {
  stepId: PickingStepId;
  active?: boolean;
  scanning?: boolean;
  color: string;
  size?: number;
  quantityValue?: string;
}) {
  const showScanLine = (scanning || active) && stepId !== "quantity";
  const isHero = size >= 48;
  const frame = isHero ? size + 28 : size + 8;
  const qty = quantityValue ?? DEMO_PICK.quantity;

  return (
    <span
      className={`relative inline-flex items-center justify-center overflow-hidden rounded-2xl ${
        active && stepId === "quantity" ? "hero-qty-pulse" : ""
      } ${active && stepId !== "quantity" ? "step-field-icon-active" : ""}`}
      style={{
        width: frame,
        height: frame,
        background:
          stepId === "quantity"
            ? "linear-gradient(160deg, #eeeeff 0%, #dcdcff 100%)"
            : stepId === "product" || stepId === "batch"
              ? "linear-gradient(160deg, #fff7ed 0%, #ffedd5 100%)"
              : "linear-gradient(160deg, #eef2ff 0%, #e0e7ff 100%)",
        border:
          stepId === "quantity"
            ? "2px solid #3b35c4"
            : "1.5px solid rgba(59,53,196,0.18)",
      }}
      aria-hidden
    >
      {stepId === "wo" && (
        <svg width={size} height={size} viewBox="0 0 64 64" fill="none">
          <rect x="14" y="8" width="36" height="48" rx="4" fill="#3b35c4" />
          <rect x="18" y="12" width="28" height="40" rx="2" fill="#ffffff" />
          <rect x="22" y="18" width="20" height="3" rx="1.5" fill="#c7d2fe" />
          <rect x="22" y="25" width="16" height="3" rx="1.5" fill="#c7d2fe" />
          <rect x="22" y="32" width="18" height="3" rx="1.5" fill="#c7d2fe" />
          <rect x="22" y="42" width="14" height="6" rx="1" fill="#1a1a2e" />
          <rect x="24" y="43.5" width="2" height="3" fill="#fff" />
          <rect x="28" y="43.5" width="1.5" height="3" fill="#fff" />
          <rect x="31.5" y="43.5" width="2.5" height="3" fill="#fff" />
        </svg>
      )}
      {stepId === "source" && (
        <svg width={size} height={size} viewBox="0 0 64 64" fill="none">
          <rect x="8" y="14" width="48" height="38" rx="3" fill="#3b35c4" />
          <rect x="12" y="18" width="40" height="8" rx="1.5" fill="#6366f1" />
          <rect x="12" y="29" width="40" height="8" rx="1.5" fill="#818cf8" />
          <rect x="12" y="40" width="40" height="8" rx="1.5" fill="#a5b4fc" />
          <rect x="16" y="20" width="8" height="4" rx="1" fill="#c7d2fe" />
          <rect x="28" y="20" width="8" height="4" rx="1" fill="#c7d2fe" />
          <rect x="40" y="31" width="8" height="4" rx="1" fill="#e0e7ff" />
          <rect x="16" y="42" width="10" height="4" rx="1" fill="#e0e7ff" />
        </svg>
      )}
      {stepId === "product" && (
        <svg width={size} height={size} viewBox="0 0 64 64" fill="none">
          <path d="M12 24l20-10 20 10v22l-20 10-20-10V24z" fill="#c2410c" />
          <path d="M12 24l20 10 20-10" fill="#ea580c" />
          <path d="M32 34v22" stroke="#9a3412" strokeWidth="2" />
          <path d="M12 24l20 10v22l-20-10V24z" fill="#fb923c" />
          <path d="M52 24l-20 10v22l20-10V24z" fill="#c2410c" />
          <rect x="22" y="38" width="12" height="8" rx="1" fill="#1a1a2e" />
          <rect x="24" y="40" width="1.5" height="4" fill="#fff" />
          <rect x="27" y="40" width="2" height="4" fill="#fff" />
          <rect x="30.5" y="40" width="1.2" height="4" fill="#fff" />
        </svg>
      )}
      {stepId === "batch" && (
        <svg width={size} height={size} viewBox="0 0 64 64" fill="none">
          <rect x="12" y="16" width="40" height="34" rx="3" fill="#c2410c" />
          <rect x="12" y="16" width="40" height="10" rx="3" fill="#ea580c" />
          <rect x="18" y="28" width="28" height="14" rx="2" fill="#ffffff" />
          <text
            x="32"
            y="38"
            textAnchor="middle"
            fill="#3b35c4"
            fontSize="8"
            fontWeight="800"
            fontFamily="Inter, sans-serif"
          >
            BATCH
          </text>
          <rect x="20" y="44" width="16" height="4" rx="1" fill="#1a1a2e" />
          <rect x="22" y="45" width="1.5" height="2" fill="#fff" />
          <rect x="25" y="45" width="2" height="2" fill="#fff" />
          <rect x="29" y="45" width="1.2" height="2" fill="#fff" />
        </svg>
      )}
      {stepId === "quantity" && (
        <span
          className="font-extrabold leading-none"
          style={{
            color: "#3b35c4",
            fontSize: Math.max(22, size * 0.72),
            fontFamily: "'JetBrains Mono', monospace",
          }}
        >
          {qty}
        </span>
      )}
      {stepId === "destination" && (
        <svg width={size} height={size} viewBox="0 0 64 64" fill="none">
          <path
            d="M32 8v18"
            stroke="#3b35c4"
            strokeWidth="4"
            strokeLinecap="round"
          />
          <path
            d="M22 18l10 10 10-10"
            stroke="#3b35c4"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
          <rect x="14" y="30" width="36" height="24" rx="4" fill="#3b35c4" />
          <rect x="18" y="34" width="28" height="16" rx="2" fill="#6366f1" />
          <rect x="22" y="38" width="8" height="8" rx="1" fill="#c7d2fe" />
          <rect x="34" y="38" width="8" height="8" rx="1" fill="#c7d2fe" />
        </svg>
      )}
      {showScanLine && <span className="hero-scan-beam" />}
    </span>
  );
}

/** Animated status glyph for the picking verification timeline. */
function StepStatusGlyph({
  status,
  cameraActive,
}: {
  status: "verified" | "current" | "waiting" | "failed";
  cameraActive?: boolean;
}) {
  const isActive = status === "current";
  const isFailed = status === "failed";
  const isVerified = status === "verified";

  return (
    <div
      className={[
        "w-7 h-7 rounded-full flex items-center justify-center text-xs font-extrabold relative",
        isVerified ? "step-glyph-verified" : "",
        isFailed ? "step-glyph-failed" : "",
        isActive && cameraActive ? "step-glyph-scanning" : "",
        isActive && !cameraActive ? "step-glyph-active" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      style={{
        background: isVerified
          ? "#d1fae5"
          : isFailed
            ? "#fee2e2"
            : isActive
              ? "#3b35c4"
              : "#f4f4f8",
        color: isVerified
          ? "#059669"
          : isFailed
            ? "#dc2626"
            : isActive
              ? "white"
              : "#c0c0d8",
      }}
      aria-hidden
    >
      {isVerified && (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
          <polyline
            points="5 12 10 17 19 7"
            stroke="#059669"
            strokeWidth="2.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
      {isFailed && <span>✕</span>}
      {isActive && cameraActive && (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="3" fill="white" />
          <path
            className="step-scan-arc"
            d="M12 4a8 8 0 018 8"
            stroke="white"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
        </svg>
      )}
      {isActive && !cameraActive && <span>→</span>}
      {status === "waiting" && <span>○</span>}
    </div>
  );
}

// ─── Layout components ────────────────────────────────────────────────────────

function TopBar({
  title,
  subtitle,
  onBack,
  onLogout,
  showBack = false,
  compact = false,
}: {
  title: string;
  subtitle: string;
  onBack?: () => void;
  onLogout?: () => void;
  showBack?: boolean;
  /** Slightly tighter padding for dense RF screens (e.g. Picking Details). */
  compact?: boolean;
}) {
  const chrome = useAppChrome();
  const handleLogout = onLogout ?? chrome.logout;

  return (
    <div
      style={{
        background: "#1a1a22",
        paddingTop: "max(0.5rem, var(--safe-top))",
        paddingLeft: "var(--app-pad-x)",
        paddingRight: "var(--app-pad-x)",
      }}
      className={compact ? "pb-2.5 shrink-0" : "pb-4 sm:pb-5 shrink-0"}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
          {showBack ? (
            <button
              onClick={onBack}
              aria-label="Go back"
              className="rounded-full flex items-center justify-center shrink-0 active:opacity-80"
              style={{
                background: "rgba(255,255,255,0.18)",
                width: "var(--touch-min)",
                height: "var(--touch-min)",
              }}
            >
              <IconBack />
            </button>
          ) : (
            <div className="shrink-0" style={{ width: "var(--touch-min)" }} />
          )}
          <span
            className={
              compact
                ? "text-white text-base sm:text-lg font-bold tracking-tight truncate"
                : "text-white text-lg sm:text-xl font-bold tracking-tight truncate"
            }
          >
            {title}
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            aria-label="Open profile"
            onClick={chrome.goProfile}
            className="rounded-full flex items-center justify-center text-white font-bold text-sm active:opacity-80"
            style={{ background: "#2e2e38", width: "var(--touch-min)", height: "var(--touch-min)" }}
          >
            M
          </button>
          <button
            aria-label="Log out"
            onClick={handleLogout}
            className="rounded-full flex items-center justify-center active:opacity-80"
            style={{
              background: "rgba(255,255,255,0.18)",
              width: "var(--touch-min)",
              height: "var(--touch-min)",
            }}
          >
            <IconLogout />
          </button>
        </div>
      </div>
      <p
        className={
          compact
            ? "text-gray-400 text-[11px] sm:text-xs mt-0.5 truncate"
            : "text-gray-400 text-xs sm:text-sm mt-1 truncate"
        }
        style={{ marginLeft: showBack ? "calc(var(--touch-min) + 0.5rem)" : 0 }}
      >
        {subtitle}
      </p>
    </div>
  );
}

function BottomNav({
  active,
  onNavigate,
}: {
  active: NavTab;
  onNavigate?: (tab: NavTab) => void;
}) {
  const chrome = useAppChrome();
  const tabs = [
    { key: "home" as const, label: "Home", Icon: IconHome },
    { key: "scan" as const, label: "Scan", Icon: IconScan },
    { key: "activity" as const, label: "Activity", Icon: IconActivity },
    { key: "profile" as const, label: "Profile", Icon: IconProfile },
  ];

  function handleTab(tab: NavTab) {
    if (onNavigate) {
      onNavigate(tab);
      return;
    }
    chrome.navigateTab(tab);
  }

  return (
    <nav
      className="flex items-stretch justify-around shrink-0"
      style={{
        background: "white",
        borderTop: "1px solid #e8e8f0",
        boxShadow: "0 -2px 12px rgba(0,0,0,0.06)",
        paddingLeft: "max(0.25rem, var(--safe-left))",
        paddingRight: "max(0.25rem, var(--safe-right))",
        paddingTop: "0.5rem",
        paddingBottom: "max(0.5rem, var(--safe-bottom))",
      }}
    >
      {tabs.map(({ key, label, Icon }) => (
        <button
          key={key}
          onClick={() => handleTab(key)}
          className="flex flex-1 flex-col items-center justify-center gap-0.5 min-w-0 py-1 active:opacity-80"
          style={{ minHeight: "var(--touch-min)" }}
          aria-current={active === key ? "page" : undefined}
        >
          <Icon active={active === key} />
          <span
            className="text-[10px] xs:text-xs font-medium truncate max-w-full px-0.5"
            style={{ color: active === key ? "#3b35c4" : "#9898b8" }}
          >
            {label}
          </span>
        </button>
      ))}
    </nav>
  );
}

function ScreenShell({ children }: { children: ReactNode }) {
  return <div className="relative flex flex-col h-full min-h-0 overflow-hidden">{children}</div>;
}

function ScrollBody({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`flex-1 min-h-0 overflow-y-auto overscroll-contain py-3 sm:py-4 space-y-3 ${className}`}
      style={{
        paddingLeft: "var(--app-pad-x)",
        paddingRight: "var(--app-pad-x)",
      }}
    >
      {children}
    </div>
  );
}

// ─── Demo expected values (mock RF document) ──────────────────────────────────
const DEMO = DEMO_PICK;

type VerifyStepId = PickingStepId;

function normalizeScanValue(value: string) {
  return value.trim().replace(/\s+/g, " ").toUpperCase();
}

function valuesMatch(scanned: string, expected: string) {
  return normalizeScanValue(scanned) === normalizeScanValue(expected);
}

function WorkflowProgress({
  current,
  complete = false,
  verified = [],
  stepOrder,
}: {
  current: VerifyStepId;
  complete?: boolean;
  verified?: readonly PickingStepId[];
  /** When provided, only required verification steps are shown. */
  stepOrder?: readonly PickingStepId[];
}) {
  const allSteps: { id: VerifyStepId; label: string }[] = [
    { id: "wo", label: PICKING_UI_TERMS.wo.shortLabel },
    { id: "source", label: PICKING_UI_TERMS.source.shortLabel },
    { id: "product", label: PICKING_UI_TERMS.product.shortLabel },
    { id: "batch", label: PICKING_UI_TERMS.batch.shortLabel },
    { id: "quantity", label: PICKING_UI_TERMS.quantity.shortLabel },
    { id: "destination", label: PICKING_UI_TERMS.destination.shortLabel },
  ];
  const steps = stepOrder
    ? stepOrder.map((id) => allSteps.find((s) => s.id === id)!).filter(Boolean)
    : allSteps;
  const currentIndex = steps.findIndex((s) => s.id === current);

  return (
    <div className="bg-white rounded-2xl p-3 shadow-sm">
      <div className="flex items-stretch justify-between gap-1 overflow-x-auto">
        {steps.map((step, index) => {
          const done = complete || verified.includes(step.id);
          const active = !complete && index === currentIndex;
          return (
            <div key={step.id} className="flex-1 min-w-0 flex flex-col items-center gap-1">
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-extrabold"
                style={{
                  background: done ? "#d1fae5" : active ? "#eeeeff" : "#f4f4f8",
                  color: done ? "#059669" : active ? "#3b35c4" : "#c0c0d8",
                  border: active ? "1.5px solid #3b35c4" : "1.5px solid transparent",
                  opacity: !done && !active ? 0.72 : 1,
                }}
              >
                {done ? "✓" : index + 1}
              </div>
              <span
                className="text-[9px] sm:text-[10px] font-bold text-center leading-tight truncate w-full"
                style={{
                  color: done ? "#059669" : active ? "#3b35c4" : "#c0c0d8",
                  opacity: !done && !active ? 0.72 : 1,
                }}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

type VerifyStatus = "waiting" | "verified" | "mismatch";

function VerificationStatusCard({
  status,
  verifiedLabel,
  mismatchTitle,
  mismatchHint,
  expectedValue,
  verifiedValue,
}: {
  status: VerifyStatus;
  verifiedLabel: string;
  mismatchTitle: string;
  mismatchHint?: string;
  expectedValue: string;
  verifiedValue?: string;
}) {
  if (status === "waiting") {
    return (
      <div
        className="rounded-2xl px-3 sm:px-4 py-3 flex items-center gap-3"
        style={{ background: "#f4f4f8", border: "1.5px solid #e0e0ec" }}
      >
        <span
          className="w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
          style={{ background: "white", color: "#9898b8", border: "1.5px solid #c8c8e0" }}
        >
          ○
        </span>
        <p className="text-xs sm:text-sm font-semibold" style={{ color: "#7c7c99" }}>
          Waiting for scan
        </p>
      </div>
    );
  }

  if (status === "verified") {
    return (
      <div
        className="rounded-2xl px-3 sm:px-4 py-3 flex items-start gap-3"
        style={{ background: "#d1fae5", border: "1.5px solid #6ee7b7" }}
      >
        <span
          className="w-7 h-7 rounded-full flex items-center justify-center text-sm font-extrabold shrink-0"
          style={{ background: "#059669", color: "white" }}
        >
          ✓
        </span>
        <div className="min-w-0">
          <p className="text-xs sm:text-sm font-extrabold" style={{ color: "#059669" }}>
            {verifiedLabel}
          </p>
          {verifiedValue && (
            <p
              className="text-xs sm:text-sm font-bold mt-0.5 break-all"
              style={{ color: "#065f46", fontFamily: "'JetBrains Mono', monospace" }}
            >
              {verifiedValue}
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className="rounded-2xl px-3 sm:px-4 py-3 flex items-start gap-3"
      style={{ background: "#fffbeb", border: "1.5px solid #fbbf24" }}
    >
      <span className="shrink-0 mt-0.5">
        <IconWarning />
      </span>
      <div className="min-w-0">
        <p className="text-xs sm:text-sm font-extrabold" style={{ color: "#92400e" }}>
          {mismatchTitle}
        </p>
        <p className="text-xs sm:text-sm font-semibold mt-0.5" style={{ color: "#92400e" }}>
          {mismatchHint ?? "Please scan the correct barcode."}
        </p>
        <p className="text-xs sm:text-sm font-semibold mt-1" style={{ color: "#92400e" }}>
          Expected:{" "}
          <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>{expectedValue}</span>
        </p>
      </div>
    </div>
  );
}

function CameraScanOverlay({
  title,
  description,
  instruction,
  expectedValue,
  onCancel,
  onEnterManually,
  onScanCaptured,
  onUnreadable,
  layout = "overlay",
  stepId,
  showStepGuide = true,
  fillAvailable = false,
}: {
  title: string;
  /** Plain-language line under the animated icon. */
  description?: string;
  /** Supporting meaning under the simple description. */
  instruction: string;
  expectedValue: string;
  onCancel: () => void;
  onEnterManually: () => void;
  /**
   * Return:
   * - true / void → close camera (success or parent handled close)
   * - false → keep camera open (wrong barcode; show mismatch cue)
   * - "ignore" → keep camera open quietly (duplicate / busy gate)
   */
  onScanCaptured: (value: string) => boolean | void | "ignore";
  onUnreadable?: () => void;
  /** overlay = fullscreen; embedded = in-page warehouse scanner panel */
  layout?: "overlay" | "embedded";
  /** Step icon with scan-line animation (WO, SBin, Product, …). */
  stepId?: PickingStepId;
  /** When false, parent already rendered title/icon/description. */
  showStepGuide?: boolean;
  /** Embedded camera grows to fill remaining viewport (no scroll). */
  fillAvailable?: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const stopDetectionRef = useRef<(() => void) | null>(null);
  const capturedRef = useRef(false);
  const [mode, setMode] = useState<"loading" | "scanning" | "detected" | "unavailable">(
    "loading",
  );
  const [detectedValue, setDetectedValue] = useState<string | null>(null);
  const [mismatchFlash, setMismatchFlash] = useState(false);
  const [cameraHint, setCameraHint] = useState(
    "Try again or enter the barcode manually.",
  );

  function stopDetection() {
    stopDetectionRef.current?.();
    stopDetectionRef.current = null;
  }

  function stopCamera() {
    stopDetection();
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }

  function acceptDetected(value: string) {
    if (capturedRef.current) return;
    capturedRef.current = true;
    stopDetection();
    setDetectedValue(value);
    setMode("detected");
    window.setTimeout(() => {
      const disposition = onScanCaptured(value);
      if (disposition === "ignore") {
        capturedRef.current = false;
        setDetectedValue(null);
        setMode("scanning");
        return;
      }
      if (disposition === false) {
        capturedRef.current = false;
        setDetectedValue(null);
        setMismatchFlash(true);
        window.setTimeout(() => setMismatchFlash(false), 1400);
        setMode("scanning");
        return;
      }
      stopCamera();
    }, 280);
  }

  async function startCamera() {
    stopCamera();
    capturedRef.current = false;
    setDetectedValue(null);
    setMode("loading");

    if (typeof window !== "undefined" && !window.isSecureContext) {
      setCameraHint("Camera needs HTTPS or localhost. Try again or enter manually.");
      onUnreadable?.();
      setMode("unavailable");
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraHint("Try again or enter the barcode manually.");
      onUnreadable?.();
      setMode("unavailable");
      return;
    }

    try {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        });
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: true,
        });
      }
      streamRef.current = stream;
      setMode("scanning");
    } catch {
      setCameraHint("Try again or enter the barcode manually.");
      onUnreadable?.();
      setMode("unavailable");
    }
  }

  useEffect(() => {
    void startCamera();
    return () => stopCamera();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    const stream = streamRef.current;
    if (!video || !stream) return;
    if (mode !== "scanning" && mode !== "loading") return;
    video.srcObject = stream;
    void video.play().catch(() => undefined);
  }, [mode]);

  useEffect(() => {
    if (mode !== "scanning") {
      stopDetection();
      return;
    }
    const video = videoRef.current;
    if (!video) return;

    let cancelled = false;
    let stop: (() => void) | null = null;

    const begin = () => {
      if (cancelled || capturedRef.current) return;
      stopDetection();
      stop = startLiveBarcodeDetection(video, (value) => {
        acceptDetected(value);
      });
      stopDetectionRef.current = stop;
    };

    if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
      begin();
    } else {
      video.addEventListener("loadeddata", begin, { once: true });
    }

    return () => {
      cancelled = true;
      video.removeEventListener("loadeddata", begin);
      stop?.();
      if (stopDetectionRef.current === stop) stopDetectionRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  const simpleDescription = description ?? instruction;
  const supportingMeaning =
    description && description !== instruction ? instruction : undefined;
  const iconScanning = mode === "scanning" || mode === "loading";

  const titleBlock = (tone: "dark" | "light") => {
    const titleColor = tone === "dark" ? "#ffffff" : "#1a1a2e";
    const descColor = tone === "dark" ? "#d1d5db" : "#5a5a7a";
    const meaningColor = tone === "dark" ? "#9ca3af" : "#9898b8";

    return (
      <div className="min-w-0 flex-1 text-center px-1">
        {stepId && (
          <div className="flex justify-center mb-3">
            <StepFieldIcon
              stepId={stepId}
              active
              scanning={iconScanning && stepId !== "quantity"}
              color="#3b35c4"
              size={56}
              quantityValue={DEMO_PICK.quantity}
            />
          </div>
        )}
        <p className="text-base sm:text-lg font-bold leading-snug" style={{ color: titleColor }}>
          {title}
        </p>
        <p
          className="text-xs sm:text-sm mt-2 font-semibold leading-snug"
          style={{ color: descColor }}
        >
          {simpleDescription}
        </p>
        {supportingMeaning && (
          <p
            className="text-[10px] sm:text-xs mt-1.5 leading-snug"
            style={{ color: meaningColor }}
          >
            {supportingMeaning}
          </p>
        )}
      </div>
    );
  };

  const header = (
    <div
      className="flex items-start justify-between gap-3 shrink-0"
      style={{
        paddingTop: "max(0.75rem, var(--safe-top))",
        paddingLeft: "var(--app-pad-x)",
        paddingRight: "var(--app-pad-x)",
        paddingBottom: "0.75rem",
      }}
    >
      <button
        onClick={() => {
          stopCamera();
          onCancel();
        }}
        aria-label="Cancel scan"
        className="rounded-full flex items-center justify-center shrink-0 mt-0.5"
        style={{
          background: "rgba(255,255,255,0.18)",
          width: "var(--touch-min)",
          height: "var(--touch-min)",
        }}
      >
        <IconBack />
      </button>
      {titleBlock("dark")}
      <div className="shrink-0" style={{ width: "var(--touch-min)" }} />
    </div>
  );

  const frameBorder = mode === "detected" ? "#059669" : "#3b35c4";

  const videoFrame = (
    <div
      className={`relative w-full overflow-hidden ${
        layout === "embedded"
          ? fillAvailable
            ? "h-full min-h-[160px] rounded-xl"
            : "aspect-[4/3] rounded-xl"
          : "max-w-[320px] aspect-[3/4] sm:aspect-[4/3] rounded-2xl"
      }`}
      style={{
        border: `2px solid ${frameBorder}`,
        boxShadow: layout === "overlay" ? "0 0 0 9999px rgba(0,0,0,0.55)" : "none",
        background: "#12121a",
      }}
    >
      <video
        ref={videoRef}
        playsInline
        muted
        autoPlay
        className="absolute inset-0 h-full w-full object-cover"
      />
          {mode === "loading" && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-20">
              <p className="text-white text-sm font-semibold">{CAMERA_ACTIVE_STATUS}</p>
            </div>
          )}
          {mode === "detected" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/55 z-20 gap-2 px-4">
              <p className="text-emerald-400 text-sm font-bold">✓ Verified</p>
              <p className="text-white text-xs font-mono text-center break-all">{detectedValue}</p>
            </div>
          )}
          {mismatchFlash && mode === "scanning" && (
            <div className="absolute inset-x-0 bottom-0 z-20 px-3 py-3 bg-amber-500/95">
              <p className="text-center text-xs font-extrabold text-amber-950">
                Incorrect barcode — scan again
              </p>
            </div>
          )}
      {mode === "scanning" && (
        <div
          className="absolute left-0 right-0 h-0.5 z-10"
          style={{
            background: "#3b35c4",
            top: "20%",
            animation: "scanline 1.5s ease-in-out infinite",
          }}
        />
      )}
      {/* Scan guide frame */}
      <div
        className="absolute left-[12%] right-[12%] top-[28%] bottom-[28%] z-10 pointer-events-none"
        style={{ border: `1.5px solid ${frameBorder}`, borderRadius: 8, background: "transparent" }}
      />
      <div
        className="absolute top-2 left-2 w-5 h-5 border-t-2 border-l-2 rounded-tl-md z-10"
        style={{ borderColor: frameBorder }}
      />
      <div
        className="absolute top-2 right-2 w-5 h-5 border-t-2 border-r-2 rounded-tr-md z-10"
        style={{ borderColor: frameBorder }}
      />
      <div
        className="absolute bottom-2 left-2 w-5 h-5 border-b-2 border-l-2 rounded-bl-md z-10"
        style={{ borderColor: frameBorder }}
      />
      <div
        className="absolute bottom-2 right-2 w-5 h-5 border-b-2 border-r-2 rounded-br-md z-10"
        style={{ borderColor: frameBorder }}
      />
    </div>
  );

  if (layout === "embedded") {
    if (mode === "unavailable") {
      return (
        <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm space-y-3">
          <div className="flex items-start gap-3">
            <IconWarning />
          <div>
              <p className="text-sm font-extrabold" style={{ color: "#1a1a2e" }}>
                Camera unavailable
              </p>
              <p className="text-xs mt-1" style={{ color: "#7c7c99" }}>
                {cameraHint}
              </p>
          </div>
          </div>
          <button
            type="button"
            onClick={() => {
              void startCamera();
            }}
            className="w-full py-3.5 rounded-xl text-white font-bold text-sm"
            style={{ background: "#3b35c4", minHeight: "var(--touch-min)" }}
          >
            Try Again
          </button>
          <button
            type="button"
            onClick={() => {
              stopCamera();
              onEnterManually();
            }}
            className="w-full py-3.5 rounded-xl font-bold text-sm"
            style={{ background: "#f4f4f8", color: "#3b35c4", minHeight: "var(--touch-min)" }}
          >
            Enter Manually
          </button>
        </div>
      );
    }

    return (
      <div
        className={`bg-white rounded-2xl shadow-sm ${
          fillAvailable
            ? "h-full min-h-0 flex flex-col p-2.5 gap-2"
            : "p-3.5 sm:p-4 space-y-3"
        }`}
      >
        {showStepGuide && titleBlock("light")}
        {showStepGuide && expectedValue ? (
          <div
            className="rounded-xl px-3 py-2.5 text-center shrink-0"
            style={{ background: "#f8f8fc", border: "1.5px solid #e0e0ec" }}
          >
            <p className="text-[10px] font-extrabold tracking-widest uppercase" style={{ color: "#9898b8" }}>
              {stepId ? expectedValueLabel(stepId) : "Expected"}
            </p>
            <p
              className="text-sm font-extrabold mt-1 break-all"
              style={{ color: "#1a1a2e", fontFamily: "'JetBrains Mono', monospace" }}
            >
              {expectedValue}
            </p>
            </div>
        ) : null}
        <div className={fillAvailable ? "flex-1 min-h-0" : undefined}>{videoFrame}</div>
        <p
          className={`text-center font-semibold shrink-0 ${fillAvailable ? "text-[11px]" : "text-xs sm:text-sm"}`}
          style={{ color: "#1a1a2e" }}
        >
          {mode === "detected"
            ? "✓ Verified"
            : mode === "scanning"
              ? CAMERA_ACTIVE_STATUS
              : "Starting camera…"}
        </p>
        <p className="text-center text-[11px] shrink-0" style={{ color: "#9898b8" }}>
          Can&apos;t scan?
        </p>
            <button
          type="button"
          onClick={() => {
            stopCamera();
            onEnterManually();
          }}
          disabled={mode === "detected"}
          className="w-full py-3 rounded-xl font-bold text-sm disabled:opacity-50 shrink-0"
          style={{ background: "#f4f4f8", color: "#3b35c4", minHeight: "var(--touch-min)" }}
        >
          Enter Manually
            </button>
          </div>
    );
  }

  if (mode === "unavailable") {
    return (
      <div
        className="absolute inset-0 z-50 flex flex-col"
        style={{ background: "#0c0c12" }}
      >
        {header}
        <div className="flex-1 flex flex-col items-center justify-center px-6 gap-4">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center"
            style={{ background: "#fffbeb" }}
          >
            <IconWarning />
        </div>
          <h2 className="text-white text-xl font-extrabold text-center">Camera unavailable</h2>
          <p className="text-gray-400 text-sm text-center leading-relaxed">{cameraHint}</p>
      </div>
        <div
          className="shrink-0 space-y-2"
          style={{
            paddingLeft: "var(--app-pad-x)",
            paddingRight: "var(--app-pad-x)",
            paddingBottom: "max(1rem, var(--safe-bottom))",
            paddingTop: "0.75rem",
          }}
        >
          <button
            onClick={() => {
              void startCamera();
            }}
            className="w-full py-3.5 sm:py-4 rounded-xl text-white font-bold text-sm sm:text-base"
            style={{ background: "#3b35c4", minHeight: "var(--touch-min)" }}
          >
            Try Again
          </button>
          <button
            onClick={() => {
              stopCamera();
              onEnterManually();
            }}
            className="w-full py-3.5 sm:py-4 rounded-xl text-white font-bold text-sm sm:text-base"
            style={{ background: "rgba(255,255,255,0.18)", minHeight: "var(--touch-min)" }}
          >
            Enter Manually
          </button>
          <button
            onClick={() => {
              stopCamera();
              onCancel();
            }}
            className="w-full py-3 rounded-xl font-bold text-sm"
            style={{ background: "transparent", color: "#9898b8", minHeight: "var(--touch-min)" }}
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="absolute inset-0 z-50 flex flex-col"
      style={{ background: "#0c0c12" }}
    >
      {header}
      {expectedValue ? (
        <div className="px-6 pb-2 shrink-0">
          <div
            className="rounded-xl px-3 py-2 text-center"
            style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }}
          >
            <p className="text-[10px] font-bold tracking-widest uppercase text-gray-400">
              {stepId ? expectedValueLabel(stepId) : "Expected"}
            </p>
            <p
              className="text-sm font-bold mt-0.5 text-white break-all"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              {expectedValue}
            </p>
          </div>
        </div>
      ) : null}
      <div className="flex-1 relative min-h-0 flex items-center justify-center px-6">
        <div className="absolute inset-0" style={{ background: "#0c0c12" }} />
        {videoFrame}
      </div>

      <div
        className="shrink-0 space-y-2"
        style={{
          paddingLeft: "var(--app-pad-x)",
          paddingRight: "var(--app-pad-x)",
          paddingBottom: "max(1rem, var(--safe-bottom))",
          paddingTop: "0.75rem",
        }}
      >
        <p className="text-center text-xs sm:text-sm font-semibold text-white px-2">
          {mode === "detected"
            ? "✓ Verified"
            : mode === "scanning"
              ? CAMERA_ACTIVE_STATUS
              : instruction}
        </p>
        <p className="text-center text-[11px] text-gray-500 px-2">Can't scan?</p>
        <button
          onClick={() => {
            stopCamera();
            onEnterManually();
          }}
          disabled={mode === "detected"}
          className="w-full py-3.5 sm:py-4 rounded-xl text-white font-bold text-sm sm:text-base disabled:opacity-50"
          style={{ background: "rgba(255,255,255,0.18)", minHeight: "var(--touch-min)" }}
        >
          Enter Manually
        </button>
        <button
          onClick={() => {
            stopCamera();
            onCancel();
          }}
          disabled={mode === "detected"}
          className="w-full py-3 rounded-xl font-bold text-sm disabled:opacity-50"
          style={{ background: "transparent", color: "#9898b8", minHeight: "var(--touch-min)" }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

function RfVerifyScanScreen({
  title,
  subtitle,
  heading,
  instruction,
  expectedLabel,
  expectedValue,
  fieldLabel,
  placeholder,
  verifiedLabel,
  mismatchTitle,
  mismatchHint,
  progressStep,
  continueLabel = "Continue",
  onBack,
  onContinue,
}: {
  title: string;
  subtitle: string;
  heading: string;
  instruction: string;
  expectedLabel: string;
  expectedValue: string;
  fieldLabel: string;
  placeholder: string;
  verifiedLabel: string;
  mismatchTitle: string;
  mismatchHint?: string;
  progressStep: VerifyStepId;
  continueLabel?: string;
  onBack: () => void;
  onContinue: () => void;
}) {
  const [value, setValue] = useState("");
  const [scanning, setScanning] = useState(false);
  const [status, setStatus] = useState<VerifyStatus>("waiting");
  const [verifiedValue, setVerifiedValue] = useState("");
  const [blankError, setBlankError] = useState(false);

  function applyValue(raw: string) {
    const trimmed = raw.trim();
    if (!trimmed) {
      setBlankError(true);
      setStatus("waiting");
      return;
    }
    setBlankError(false);
    setValue(trimmed);
    if (valuesMatch(trimmed, expectedValue)) {
      setVerifiedValue(trimmed);
      setStatus("verified");
    } else {
      setStatus("mismatch");
      setVerifiedValue("");
    }
  }

  return (
    <ScreenShell>
      <TopBar title={title} subtitle={subtitle} showBack onBack={onBack} />

      <ScrollBody className="space-y-3">
        <WorkflowProgress current={progressStep} />

            <div>
          <h2 className="text-lg sm:text-xl font-extrabold" style={{ color: "#1a1a2e" }}>
            {heading}
          </h2>
          <p className="text-xs sm:text-sm mt-1" style={{ color: "#7c7c99" }}>
            {instruction}
          </p>
        </div>

        <div className="bg-white rounded-2xl p-3.5 sm:p-4 shadow-sm">
          <p className="text-[10px] sm:text-xs font-extrabold tracking-widest uppercase" style={{ color: "#9898b8" }}>
            {expectedLabel}
          </p>
          <p
            className="text-base sm:text-lg font-extrabold mt-1 break-all"
            style={{ color: "#1a1a2e", fontFamily: "'JetBrains Mono', monospace" }}
          >
            {expectedValue}
          </p>
          <p className="text-xs mt-1" style={{ color: "#7c7c99" }}>
            {instruction}
          </p>
        </div>

        <VerificationStatusCard
          status={status}
          verifiedLabel={verifiedLabel}
          mismatchTitle={mismatchTitle}
          mismatchHint={mismatchHint}
          expectedValue={expectedValue}
          verifiedValue={verifiedValue}
        />

        {blankError && (
          <div
            className="rounded-2xl px-3 sm:px-4 py-3 flex items-start gap-3"
            style={{ background: "#fffbeb", border: "1.5px solid #fbbf24" }}
          >
            <IconWarning />
            <p className="text-xs sm:text-sm font-semibold" style={{ color: "#92400e" }}>
              Enter a barcode value or scan with camera
            </p>
          </div>
        )}

        {status !== "verified" && (
          <>
            <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm flex flex-col items-center gap-3 sm:gap-4">
              <div
                className="w-20 h-20 sm:w-24 sm:h-24 rounded-full flex items-center justify-center"
                style={{ background: "#eeeeff" }}
              >
                <IconQR />
              </div>
              <p className="text-sm sm:text-base font-semibold text-center px-2" style={{ color: "#1a1a2e" }}>
                Use camera to identify barcode
              </p>
              <button
                onClick={() => {
                  setBlankError(false);
                  setScanning(true);
                }}
                className="w-full py-3.5 sm:py-4 rounded-xl text-white font-bold text-sm sm:text-base"
                style={{ background: "#1a1a22", minHeight: "var(--touch-min)" }}
              >
                Scan with Camera
              </button>
              <p className="text-[10px] sm:text-xs text-center px-2" style={{ color: "#b0b0cc" }}>
                Camera unavailable? Enter barcode manually.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex-1 h-px" style={{ background: "#e0e0ec" }} />
              <span className="text-[10px] sm:text-xs font-bold tracking-widest shrink-0" style={{ color: "#b0b0cc" }}>
                OR MANUAL ENTRY
                </span>
              <div className="flex-1 h-px" style={{ background: "#e0e0ec" }} />
              </div>

            <div>
              <label className="text-xs sm:text-sm font-semibold block mb-2" style={{ color: "#1a1a2e" }}>
                {fieldLabel}
              </label>
              <div
                className="flex items-center gap-3 rounded-xl px-3 sm:px-4 py-3 bg-white"
                style={{ border: "1.5px solid #e0e0ec", minHeight: "var(--touch-min)" }}
              >
                <IconHash />
                <input
                  type="text"
                  value={value}
                  onChange={(e) => {
                    setValue(e.target.value);
                    setBlankError(false);
                    if (status === "mismatch") setStatus("waiting");
                  }}
                  className="flex-1 outline-none text-base font-semibold bg-transparent min-w-0"
                  style={{ color: "#1a1a2e", fontFamily: "'JetBrains Mono', monospace" }}
                  placeholder={placeholder}
                />
            </div>
            </div>

            <button
              onClick={() => applyValue(value)}
              className="w-full py-3.5 sm:py-4 rounded-2xl text-white font-bold text-sm sm:text-base"
              style={{
                background: value.trim() ? "#26208a" : "#b0b0cc",
                minHeight: "var(--touch-min)",
              }}
            >
              Continue with Manual Entry
            </button>
          </>
        )}

        {status === "verified" && (
          <button
            onClick={onContinue}
            className="w-full py-3.5 sm:py-4 rounded-2xl text-white font-bold text-sm sm:text-base"
            style={{ background: "#059669", minHeight: "var(--touch-min)" }}
          >
            {continueLabel}
          </button>
        )}

        <button
          onClick={onBack}
          className="w-full py-3.5 sm:py-4 rounded-2xl font-bold text-sm sm:text-base mb-1"
          style={{ background: "#f4f4f8", color: "#5a5a7a", minHeight: "var(--touch-min)" }}
        >
          Cancel
        </button>
      </ScrollBody>

      <BottomNav active="scan" />

      {scanning && (
        <CameraScanOverlay
          title={heading}
          description={instruction}
          instruction={PICKING_UI_TERMS[progressStep].meaning}
          stepId={progressStep}
          expectedValue={expectedValue}
          onCancel={() => setScanning(false)}
          onEnterManually={() => setScanning(false)}
          onScanCaptured={(scanned) => {
            setScanning(false);
            applyValue(scanned);
          }}
        />
      )}
    </ScreenShell>
  );
}

// ─── Screen: Login ────────────────────────────────────────────────────────────
function LoginScreen({ onLogin }: { onLogin: () => void }) {
  const [warehouse, setWarehouse] = useState("");
  const [resource, setResource] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleLogin() {
    if (!warehouse.trim() || !resource.trim() || !password.trim()) {
      setError("Enter warehouse, resource, and password to continue.");
      return;
    }
    setError(null);
    onLogin();
  }

  return (
    <ScreenShell>
      <div
        className="flex-1 min-h-0 flex flex-col"
        style={{
          background: "linear-gradient(180deg, #1a1a22 0%, #1a1a22 22%, #eef0f5 22%, #eef0f5 100%)",
        }}
      >
        <div
          className="flex-1 min-h-0 flex flex-col justify-center"
          style={{
            paddingLeft: "var(--app-pad-x)",
            paddingRight: "var(--app-pad-x)",
            paddingTop: "max(1rem, var(--safe-top))",
            paddingBottom: "max(1.5rem, var(--safe-bottom))",
          }}
        >
          <div className="login-card-enter bg-white rounded-2xl shadow-sm overflow-hidden">
            <div
              className="h-1.5 w-full"
              style={{
                background: "linear-gradient(90deg, #3b35c4 0%, #6366f1 50%, #3b35c4 100%)",
              }}
            />

            <div className="p-5 sm:p-6 space-y-4">
              <div className="flex flex-col items-center text-center gap-3 pb-1">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center"
              style={{ background: "#eeeeff" }}
            >
                  <IconScan active />
            </div>
                <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight" style={{ color: "#1a1a2e" }}>
                  Login
                </h2>
              </div>

              <div>
                <label className="text-xs sm:text-sm font-semibold block mb-2" style={{ color: "#1a1a2e" }}>
                  Warehouse
                </label>
                <div
                  className="login-field flex items-center gap-3 rounded-xl px-3 sm:px-4 py-3 transition-all duration-200"
                  style={{ border: "1.5px solid #e0e0ec", minHeight: "var(--touch-min)", background: "#fafafa" }}
                >
                  <IconHash />
                  <input
                    type="text"
                    value={warehouse}
                    onChange={(e) => {
                      setWarehouse(e.target.value);
                      setError(null);
                    }}
                    className="flex-1 outline-none text-base font-semibold bg-transparent min-w-0"
                    style={{ color: "#1a1a2e", fontFamily: "'JetBrains Mono', monospace" }}
                    placeholder="e.g. WH01"
                    autoComplete="organization"
                  />
          </div>
        </div>

              <div>
                <label className="text-xs sm:text-sm font-semibold block mb-2" style={{ color: "#1a1a2e" }}>
                  Resource
                </label>
                <div
                  className="login-field flex items-center gap-3 rounded-xl px-3 sm:px-4 py-3 transition-all duration-200"
                  style={{ border: "1.5px solid #e0e0ec", minHeight: "var(--touch-min)", background: "#fafafa" }}
                >
                  <IconProfile active />
                  <input
                    type="text"
                    value={resource}
                    onChange={(e) => {
                      setResource(e.target.value);
                      setError(null);
                    }}
                    className="flex-1 outline-none text-base font-semibold bg-transparent min-w-0"
                    style={{ color: "#1a1a2e" }}
                    placeholder="Resource / user"
                    autoComplete="username"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs sm:text-sm font-semibold block mb-2" style={{ color: "#1a1a2e" }}>
                  Password
                </label>
                <div
                  className="login-field flex items-center gap-3 rounded-xl px-3 sm:px-4 py-3 transition-all duration-200"
                  style={{ border: "1.5px solid #e0e0ec", minHeight: "var(--touch-min)", background: "#fafafa" }}
                >
                  <IconLock />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setError(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleLogin();
                    }}
                    className="flex-1 outline-none text-base font-semibold bg-transparent min-w-0"
                    style={{ color: "#1a1a2e" }}
                    placeholder="Enter password"
                    autoComplete="current-password"
                  />
                </div>
              </div>

              {error && (
                <div
                  className="rounded-xl px-3 py-3 flex items-start gap-2"
          style={{ background: "#fffbeb", border: "1.5px solid #fbbf24" }}
        >
          <IconWarning />
                  <p className="text-xs sm:text-sm font-semibold" style={{ color: "#92400e" }}>
                    {error}
                  </p>
                </div>
              )}

              <button
                onClick={handleLogin}
                disabled={!(warehouse.trim() && resource.trim() && password.trim())}
                className={[
                  "w-full py-3.5 sm:py-4 rounded-2xl text-white font-bold text-sm sm:text-base transition-all duration-200 disabled:opacity-70",
                  warehouse.trim() && resource.trim() && password.trim() ? "login-btn-ready" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                style={{
                  background:
                    warehouse.trim() && resource.trim() && password.trim()
                      ? "linear-gradient(135deg, #3b35c4 0%, #26208a 100%)"
                      : "#b0b0cc",
                  minHeight: "var(--touch-min)",
                }}
              >
                Login
              </button>
            </div>
          </div>
        </div>
      </div>
    </ScreenShell>
  );
}

// ─── Screen: Home ─────────────────────────────────────────────────────────────
function HomeScreen({
  onNavigate,
  onLogout,
}: {
  onNavigate: (s: Screen) => void;
  onLogout: () => void;
}) {
  const chrome = useAppChrome();
  return (
    <ScreenShell>
      <div
        style={{
          background: "#1a1a22",
          paddingTop: "max(0.5rem, var(--safe-top))",
          paddingLeft: "var(--app-pad-x)",
          paddingRight: "var(--app-pad-x)",
        }}
        className="pb-5 sm:pb-6 shrink-0"
      >
        <div className="flex items-center justify-end gap-2 shrink-0">
            <button
              type="button"
              aria-label="Open profile"
              onClick={chrome.goProfile}
              className="rounded-full flex items-center justify-center text-white font-bold active:opacity-80"
              style={{ background: "#2e2e38", width: "var(--touch-min)", height: "var(--touch-min)" }}
            >
              M
            </button>
            <button
              aria-label="Log out"
              onClick={onLogout}
              className="rounded-full flex items-center justify-center active:opacity-80"
              style={{
                background: "rgba(255,255,255,0.18)",
                width: "var(--touch-min)",
                height: "var(--touch-min)",
              }}
            >
              <IconLogout />
            </button>
        </div>
      </div>

      <ScrollBody>
        {/* User card */}
        <div className="bg-white rounded-2xl p-3.5 sm:p-4 shadow-sm">
          <p className="text-xs sm:text-sm" style={{ color: "#9898b8" }}>Logged in user</p>
          <div className="flex items-center justify-between mt-1 gap-3">
            <div className="min-w-0">
              <h2 className="text-xl sm:text-2xl font-extrabold truncate" style={{ color: "#1a1a2e" }}>
                Muruga
              </h2>
              <div className="mt-2">
                <span
                  className="inline-block text-xs sm:text-sm font-bold px-2.5 sm:px-3 py-1 rounded-lg"
                  style={{ background: "#eeeeff", color: "#3b35c4" }}
                >
                  Warehouse: WH01
                </span>
              </div>
            </div>
            <div
              className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center shrink-0"
              style={{ background: "#eeeeff" }}
            >
              <IconHome active />
            </div>
          </div>
        </div>

        {/* Available Modules */}
        <div>
          <h3 className="text-sm sm:text-base font-bold mb-3 px-1" style={{ color: "#1a1a2e" }}>
            Available Modules
          </h3>
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            {[
              {
                code: "01",
                label: "Production",
                Icon: IconFactory,
                screen: "production" as Screen,
                locked: false,
              },
              {
                code: "02",
                label: "Inbound",
                Icon: IconTruck,
                screen: "inbound" as Screen,
                locked: false,
              },
              {
                code: "03",
                label: "Outbound",
                Icon: IconBox,
                screen: "outbound" as Screen,
                locked: false,
              },
              {
                code: "04",
                label: "Physical Inv.",
                Icon: IconArchive,
                screen: "physical-inventory" as Screen,
                locked: false,
              },
              {
                code: "05",
                label: "Internal",
                Icon: IconInternal,
                screen: "internal" as Screen,
                locked: false,
              },
              {
                code: "06",
                label: "WO Selection",
                Icon: IconWarehouseOrder,
                screen: "wo-selection" as Screen,
                locked: false,
              },
            ].map(({ code, label, Icon, screen: target, locked }) => (
              <button
                key={code}
                onClick={() => {
                  if (locked) return;
                  if (target) onNavigate(target);
                }}
                disabled={locked}
                className="bg-white rounded-2xl py-3.5 sm:py-5 px-1 flex flex-col items-center gap-1.5 shadow-sm transition-opacity active:opacity-70 min-w-0"
                style={{ opacity: locked ? 0.5 : 1, minHeight: "var(--touch-min)" }}
              >
                <div
                  className="w-11 h-11 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center"
                  style={{ background: locked ? "#f4f4f8" : "#eeeeff" }}
                >
                  <Icon muted={locked} />
                </div>
                <span
                  className="text-[9px] sm:text-[10px] font-bold tracking-wide"
                  style={{ color: locked ? "#c0c0d8" : "#9898b8" }}
                >
                  {code}
                </span>
                <span
                  className="text-[11px] sm:text-xs font-bold text-center leading-tight px-0.5"
                  style={{ color: locked ? "#9898b8" : "#1a1a2e" }}
                >
                  {label}
                </span>
                {locked && (
                  <span className="text-[10px] sm:text-xs" style={{ color: "#c0c0d8", marginTop: "-2px" }}>
                    Locked
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3 pt-1 pb-1">
          {[
            { label: "Open WOs", value: "14", color: "#3b35c4" },
            { label: "Picked Today", value: "38", color: "#059669" },
            { label: "Pending", value: "6", color: "#d97706" },
          ].map((stat) => (
            <div key={stat.label} className="bg-white rounded-2xl p-2.5 sm:p-3 shadow-sm text-center min-w-0">
              <p className="text-xl sm:text-2xl font-extrabold" style={{ color: stat.color }}>
                {stat.value}
              </p>
              <p
                className="text-[10px] sm:text-xs mt-0.5 font-medium leading-tight"
                style={{ color: "#9898b8" }}
              >
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </ScrollBody>

      <BottomNav active="home" />
    </ScreenShell>
  );
}

// ─── Screen: Module Processes (shared hub — same flow as Outbound) ─────────────
function ModuleProcessesScreen({
  title,
  subtitle,
  onBack,
  onNavigate,
}: {
  title: string;
  subtitle: string;
  onBack: () => void;
  onNavigate: (s: Screen) => void;
}) {
  const operations = [
    {
      id: "picking",
      label: "Picking",
      desc: "Pick products for warehouse orders",
      Icon: IconArchive,
      locked: false,
    },
    {
      id: "packing",
      label: "Packing",
      desc: "Not implemented",
      Icon: IconBox,
      locked: true,
    },
    {
      id: "loading",
      label: "Loading",
      desc: "Not implemented",
      Icon: IconTruck,
      locked: true,
    },
  ];

  return (
    <ScreenShell>
      <TopBar title={title} subtitle={subtitle} showBack onBack={onBack} />

      <ScrollBody>
        {operations.map((op) => (
          <button
            key={op.id}
            onClick={() => !op.locked && onNavigate("picking-methods")}
            disabled={op.locked}
            className="w-full bg-white rounded-2xl p-3.5 sm:p-4 shadow-sm flex items-center gap-3 sm:gap-4 transition-opacity mb-3 last:mb-0"
            style={{ opacity: op.locked ? 0.65 : 1, minHeight: "var(--touch-min)" }}
          >
            <div
              className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center shrink-0"
              style={{ background: op.locked ? "#f4f4f8" : "#eeeeff" }}
            >
              <op.Icon muted={op.locked} />
            </div>
            <div className="flex-1 text-left min-w-0">
              <p
                className="font-bold text-sm sm:text-base truncate"
                style={{ color: op.locked ? "#9898b8" : "#1a1a2e" }}
              >
                {op.label}
              </p>
              <p className="text-xs sm:text-sm mt-0.5 line-clamp-2" style={{ color: "#b0b0cc" }}>
                {op.desc}
              </p>
            </div>
            <span className="shrink-0">{op.locked ? <IconLock /> : <IconChevronRight />}</span>
          </button>
        ))}
      </ScrollBody>

      <BottomNav active="home" />
    </ScreenShell>
  );
}

// ─── Screen: Picking Methods ──────────────────────────────────────────────────
function PickingMethodsScreen({
  onBack,
  onContinue,
}: {
  onBack: () => void;
  onContinue: (method: PickingMethod) => void;
}) {
  const [selected, setSelected] = useState<PickingMethod>("by-wo");

  const methods = PICKING_METHODS;

  return (
    <ScreenShell>
      <TopBar
        title="Picking Methods"
        subtitle="How would you like to pick?"
        showBack
        onBack={onBack}
      />

      <ScrollBody>
        {methods.map((m) => {
          const isSelected = selected === m.id;
          return (
            <button
              key={m.id}
              onClick={() => setSelected(m.id)}
              className="w-full bg-white rounded-2xl p-3.5 sm:p-4 shadow-sm flex items-center gap-3 sm:gap-4 transition-all"
              style={{
                border: isSelected ? "2px solid #3b35c4" : "2px solid transparent",
                minHeight: "var(--touch-min)",
              }}
            >
              <div
                className="w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-all"
                style={{
                  borderColor: isSelected ? "#3b35c4" : "#c8c8e0",
                  background: isSelected ? "#3b35c4" : "white",
                }}
              >
                {isSelected && (
                  <div className="w-2.5 h-2.5 rounded-full bg-white" />
                )}
              </div>
              <div className="flex-1 text-left min-w-0">
                <p
                  className="font-semibold text-sm sm:text-base truncate"
                  style={{ color: isSelected ? "#1a1a2e" : "#5a5a7a" }}
                >
                  {m.label}
                </p>
                {m.sub && (
                  <p
                    className="text-[10px] sm:text-xs font-bold mt-0.5 tracking-wide truncate"
                    style={{ color: "#3b35c4" }}
                  >
                    {m.sub}
                  </p>
                )}
              </div>
              <span className="shrink-0">
              <IconChevronRight color={isSelected ? "#3b35c4" : "#c8c8e0"} />
              </span>
            </button>
          );
        })}

          <button
          onClick={() => onContinue(selected)}
          className="w-full py-3.5 sm:py-4 rounded-2xl text-white font-bold text-sm sm:text-base transition-opacity active:opacity-80 mt-2 px-3"
          style={{ background: "#1a1a22", minHeight: "var(--touch-min)" }}
        >
          <span className="line-clamp-2">
            Continue with {methods.find((m) => m.id === selected)?.label}
          </span>
          </button>
      </ScrollBody>

      <BottomNav active="home" />
    </ScreenShell>
  );
}

// ─── Screen: Scan WO ─────────────────────────────────────────────────────────
function ScanWOScreen({
  onBack,
  onNavigate,
  flowTitle = "Picking by WO",
}: {
  onBack: () => void;
  onNavigate: (s: Screen) => void;
  flowTitle?: string;
}) {
  const [entryMode, setEntryMode] = useState<"camera" | "manual">("camera");
  const [woNumber, setWoNumber] = useState(WarehouseOrderEntryController.emptyManualValue);
  const [status, setStatus] = useState<VerifyStatus>("waiting");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [cameraFailed, setCameraFailed] = useState(false);
  const scanSessionRef = useRef(createSafeScanSession());
  const verified = status === "verified";
  const showCamera = WarehouseOrderEntryController.shouldAutoStartCamera({
    verified,
    showManual: entryMode === "manual",
  });

  useEffect(() => {
    if (!verified) return;
    const timer = window.setTimeout(() => {
      onNavigate("picking-details");
    }, 900);
    return () => window.clearTimeout(timer);
  }, [verified, onNavigate]);

  function applyWo(raw: string): boolean {
    const session = scanSessionRef.current;
    const gated = session.submit(raw);
    if (gated.type === "ScanBusy" || gated.type === "ScanDuplicate") {
      return false;
    }
    if (gated.type !== "ScanSuccess") {
      session.release();
      setErrorMessage("Warehouse Order is required.");
      setStatus("waiting");
      return false;
    }

    const result = WarehouseOrderEntryController.validate(gated.value);
    session.release();

    if (result.ok) {
      setWoNumber(result.value);
      setErrorMessage(null);
      setCameraFailed(false);
      setStatus("verified");
      session.resetDuplicateMemory();
      return true;
    }

    setWoNumber(result.value ?? gated.value);
    setErrorMessage(result.message);
    setStatus("mismatch");
    return false;
  }

  function switchToManual() {
    scanSessionRef.current.cancel();
    setEntryMode("manual");
    setWoNumber(WarehouseOrderEntryController.emptyManualValue());
    setErrorMessage(null);
    if (status === "mismatch") setStatus("waiting");
    setCameraFailed(false);
  }

  function switchToCamera() {
    scanSessionRef.current.cancel();
    scanSessionRef.current.resetDuplicateMemory();
    setEntryMode("camera");
    setWoNumber(WarehouseOrderEntryController.emptyManualValue());
    setErrorMessage(null);
    if (status !== "verified") setStatus("waiting");
    setCameraFailed(false);
  }

  return (
    <ScreenShell>
      <TopBar
        title={flowTitle}
        subtitle="Scan warehouse picking order"
        showBack
        onBack={onBack}
      />

      {!verified && showCamera ? (
        <div
          className="flex-1 min-h-0 flex flex-col gap-2 py-2"
          style={{
            paddingLeft: "var(--app-pad-x)",
            paddingRight: "var(--app-pad-x)",
          }}
        >
          <div className="shrink-0">
            <WorkflowProgress current="wo" />
          </div>

          <div className="shrink-0 flex items-center gap-3">
            <StepFieldIcon
              stepId="wo"
              active
              scanning
              color="#3b35c4"
              size={36}
            />
            <div className="min-w-0 flex-1">
              <h2 className="text-sm sm:text-base font-extrabold leading-tight" style={{ color: "#1a1a2e" }}>
                {PICKING_UI_TERMS.wo.scanTitle}
          </h2>
              <p className="text-[11px] sm:text-xs font-semibold mt-0.5 leading-snug" style={{ color: "#5a5a7a" }}>
                {PICKING_UI_TERMS.wo.scanHelper}
          </p>
            </div>
        </div>

          <div
            className="shrink-0 rounded-xl px-3 py-2 flex items-center justify-between gap-2"
            style={{ background: "#fff", border: "1.5px solid #e0e0ec" }}
          >
            <p className="text-[10px] font-extrabold tracking-widest uppercase" style={{ color: "#9898b8" }}>
              Expected WO
            </p>
            <p
              className="text-sm font-extrabold"
              style={{ color: "#1a1a2e", fontFamily: "'JetBrains Mono', monospace" }}
            >
              {WarehouseOrderEntryController.expectedWo}
            </p>
          </div>

          {status === "mismatch" && (
            <div className="shrink-0">
              <VerificationStatusCard
                status={status}
                verifiedLabel="✓ Warehouse Order Verified"
                mismatchTitle={PICKING_UI_TERMS.wo.mismatchTitle}
                mismatchHint={PICKING_UI_TERMS.wo.mismatchHint}
                expectedValue={WarehouseOrderEntryController.expectedWo}
              />
            </div>
          )}

          <div className="flex-1 min-h-0">
            <CameraScanOverlay
              key="wo-embedded-camera"
              layout="embedded"
              fillAvailable
              title={PICKING_UI_TERMS.wo.scanTitle}
              description={PICKING_UI_TERMS.wo.scanHelper}
              instruction={PICKING_UI_TERMS.wo.meaning}
              stepId="wo"
              expectedValue={WarehouseOrderEntryController.expectedWo}
              showStepGuide={false}
              onCancel={switchToManual}
              onEnterManually={switchToManual}
              onUnreadable={() => {
                setCameraFailed(true);
              }}
              onScanCaptured={(scanned) => {
                const session = scanSessionRef.current;
                const gated = session.submit(scanned);
                if (gated.type === "ScanBusy" || gated.type === "ScanDuplicate") {
                  return "ignore";
                }
                if (gated.type !== "ScanSuccess") {
                  session.release();
                  return "ignore";
                }

                const result = WarehouseOrderEntryController.validate(gated.value);
                session.release();

                if (result.ok) {
                  setWoNumber(result.value);
                  setErrorMessage(null);
                  setStatus("verified");
                  session.resetDuplicateMemory();
                  return true;
                }

                setWoNumber(result.value ?? gated.value);
                setErrorMessage(result.message);
                setStatus("mismatch");
                return false;
              }}
            />
              </div>
          </div>
      ) : (
        <ScrollBody className="space-y-4">
          <WorkflowProgress current="wo" />

          <div className="text-center space-y-3">
            <div className="flex justify-center">
              <StepFieldIcon
                stepId="wo"
                active={false}
                scanning={false}
                color="#3b35c4"
                size={56}
              />
            </div>
            <h2 className="text-lg sm:text-xl font-extrabold" style={{ color: "#1a1a2e" }}>
              {PICKING_UI_TERMS.wo.scanTitle}
            </h2>
            <p className="text-xs sm:text-sm font-semibold" style={{ color: "#5a5a7a" }}>
              {PICKING_UI_TERMS.wo.scanHelper}
            </p>
            <p className="text-[11px] sm:text-xs" style={{ color: "#9898b8" }}>
              {PICKING_UI_TERMS.wo.meaning}
            </p>
          </div>

          <VerificationStatusCard
            status={status}
            verifiedLabel="✓ Warehouse Order Verified"
            mismatchTitle={PICKING_UI_TERMS.wo.mismatchTitle}
            mismatchHint={PICKING_UI_TERMS.wo.mismatchHint}
            expectedValue={WarehouseOrderEntryController.expectedWo}
            verifiedValue={verified ? woNumber : undefined}
          />

          {errorMessage === "Warehouse Order is required." && (
            <div
              className="rounded-2xl px-3 sm:px-4 py-3 flex items-start gap-3"
              style={{ background: "#fffbeb", border: "1.5px solid #fbbf24" }}
            >
              <IconWarning />
              <p className="text-xs sm:text-sm font-semibold" style={{ color: "#92400e" }}>
                Warehouse Order is required.
              </p>
            </div>
          )}

          {cameraFailed && entryMode === "manual" && (
            <div
              className="rounded-2xl px-3 sm:px-4 py-3 flex items-start gap-3"
              style={{ background: "#fffbeb", border: "1.5px solid #fbbf24" }}
            >
              <IconWarning />
              <p className="text-xs sm:text-sm font-semibold" style={{ color: "#92400e" }}>
                Camera unavailable — enter the Warehouse Order manually.
          </p>
        </div>
          )}

          {!verified && entryMode === "manual" && (
            <>
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px" style={{ background: "#e0e0ec" }} />
                <span
                  className="text-[10px] sm:text-xs font-bold tracking-widest shrink-0"
                  style={{ color: "#b0b0cc" }}
                >
            OR MANUAL ENTRY
          </span>
          <div className="flex-1 h-px" style={{ background: "#e0e0ec" }} />
        </div>

        <div>
                <label className="text-xs sm:text-sm font-semibold block mb-2" style={{ color: "#1a1a2e" }}>
                  Warehouse Order (WO)
          </label>
          <div
                  className="flex items-center gap-3 rounded-xl px-3 sm:px-4 py-3 bg-white"
                  style={{ border: "1.5px solid #e0e0ec", minHeight: "var(--touch-min)" }}
          >
            <IconHash />
            <input
              type="text"
                    inputMode="numeric"
              value={woNumber}
                    onChange={(e) => {
                      setWoNumber(e.target.value);
                      setErrorMessage(null);
                      if (status === "mismatch") setStatus("waiting");
                    }}
                    className="flex-1 outline-none text-base font-semibold bg-transparent min-w-0"
              style={{ color: "#1a1a2e", fontFamily: "'JetBrains Mono', monospace" }}
                    placeholder="Enter Warehouse Order"
                    autoComplete="off"
            />
          </div>
                <p className="text-[11px] mt-1.5" style={{ color: "#9898b8" }}>
                  Example: {WarehouseOrderEntryController.expectedWo}
                </p>
        </div>

        <button
                type="button"
                onClick={() => {
                  applyWo(woNumber);
                }}
                className="w-full py-3.5 sm:py-4 rounded-2xl text-white font-bold text-sm sm:text-base transition-opacity active:opacity-80"
          style={{
                  background: woNumber.trim() ? "#26208a" : "#b0b0cc",
                  minHeight: "var(--touch-min)",
          }}
        >
          Continue with Manual Entry
        </button>

              <button
                type="button"
                onClick={switchToCamera}
                className="w-full py-3.5 rounded-2xl font-bold text-sm"
                style={{ background: "#f4f4f8", color: "#3b35c4", minHeight: "var(--touch-min)" }}
              >
                Use Camera Scanner
              </button>
            </>
          )}

          {verified && (
            <p className="text-center text-xs font-semibold" style={{ color: "#059669" }}>
              Continuing to Picking Details…
            </p>
          )}
        </ScrollBody>
      )}

      <BottomNav active="scan" />
    </ScreenShell>
  );
}

// ─── Screen: Picking Details ──────────────────────────────────────────────────
function PickingDetailsScreen({
  onBack,
  onNavigate,
  method,
}: {
  onBack: () => void;
  onNavigate: (s: Screen) => void;
  method: PickingMethod;
}) {
  const methodMeta = getPickingMethodMeta(method);
  const document = getActivePickingDocument(method);
  const detailRows = getConsolidatedPickingDetailRows(document);

  return (
    <ScreenShell>
      <TopBar
        title="Picking Details"
        subtitle={`${methodMeta.label} · Review then Start`}
        showBack
        onBack={onBack}
        compact
      />

      <div
        className="flex-1 min-h-0 flex flex-col gap-1.5"
        style={{
          paddingLeft: "var(--app-pad-x)",
          paddingRight: "var(--app-pad-x)",
          paddingTop: "0.35rem",
          paddingBottom: "0.35rem",
        }}
      >
        {/* Table fills remaining height between header and Start Picking */}
        <div className="flex-1 min-h-0 flex flex-col bg-white rounded-2xl px-2.5 py-1.5 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between gap-2 shrink-0 pb-1">
            <h3
              className="text-[10px] font-extrabold tracking-widest uppercase min-w-0"
              style={{ color: "#1a1a2e" }}
            >
              Picking Details
            </h3>
            <span
              className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0"
              style={{ background: "#d1fae5", color: "#059669" }}
            >
              Active
            </span>
          </div>

          <div className="flex-1 min-h-0 flex flex-col overflow-y-auto overscroll-contain">
            {detailRows.map((row, i) => (
              <div
                key={row.key}
                className="flex justify-between items-center gap-2 flex-[1_1_0%] min-h-[1.35rem]"
                style={{
                  borderBottom: i < detailRows.length - 1 ? "1px solid #f0f0f8" : "none",
                }}
              >
                <p
                  className="text-[11px] sm:text-xs font-semibold min-w-0 flex-1 leading-tight truncate"
                  style={{ color: "#1a1a2e" }}
                >
                  {row.label}
                </p>
                <span
                  className="text-[11px] sm:text-xs font-bold text-right shrink-0 max-w-[50%] leading-tight truncate"
                  style={{
                    color: "#1a1a2e",
                    fontFamily: "'JetBrains Mono', monospace",
                  }}
                  title={row.value}
                >
                  {row.value}
                </span>
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={() => onNavigate("picking-execution")}
          className="w-full shrink-0 py-2.5 rounded-2xl text-white font-bold text-sm flex items-center justify-center gap-2 transition-all active:opacity-80"
          style={{
            background: "#3b35c4",
            minHeight: "var(--touch-min)",
          }}
        >
          <IconPlay />
          Start Picking
        </button>
      </div>

      <BottomNav active="scan" />
    </ScreenShell>
  );
}

// ─── Screen: Picking Execution (sequential scan → verify → next) ─────────────
const SUCCESS_FLASH_MS = 900;

function buildExecSteps(stepOrder: readonly PickingStepId[]) {
  return stepOrder.map((id) => {
    const term = PICKING_UI_TERMS[id];
    return {
      id,
      label: term.label,
      expected: EXPECTED_BY_STEP[id],
      displayValue: pickingDisplayValue(id),
      meaning: term.meaning,
      kind: (id === "quantity" ? "quantity" : "scan") as "scan" | "quantity",
      scanTitle: term.scanTitle,
      helper: term.scanHelper,
      mismatchTitle: term.mismatchTitle,
      mismatchHint: term.mismatchHint,
    };
  });
}

function PickingExecutionScreen({
  onBack,
  onFinish,
  flowTitle,
}: {
  onBack: () => void;
  onFinish: () => void;
  flowTitle: string;
}) {
  const [workflow, setWorkflow] = useState<PickingWorkflowState>(createInitialPickingState);
  const EXEC_STEPS = buildExecSteps(workflow.stepOrder);
  const [inputValue, setInputValue] = useState("");
  const [scanning, setScanning] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [justVerified, setJustVerified] = useState<{
    stepId: PickingStepId;
    value: string;
  } | null>(null);
  const scanSessionRef = useRef(createSafeScanSession());
  const workflowRef = useRef(workflow);
  const successTimerRef = useRef<number | null>(null);
  workflowRef.current = workflow;

  const activeStep = EXEC_STEPS.find((s) => s.id === workflow.current) ?? EXEC_STEPS[0];
  const complete = workflow.complete;
  const failed = workflow.failureKind !== null;
  const scanContext = getScanContext(workflow.current);
  const showSuccessFlash = justVerified !== null;
  const showSummary = complete && !showSuccessFlash;
  const cameraActive =
    !showSuccessFlash &&
    !showSummary &&
    activeStep.kind === "scan" &&
    scanning &&
    !showManual;

  useEffect(() => {
    return () => {
      if (successTimerRef.current !== null) {
        window.clearTimeout(successTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (showSuccessFlash || showSummary || activeStep.kind !== "scan") {
      setScanning(false);
      return;
    }
    setScanning(
      shouldAutoStartCamera(workflow.current, {
        complete: showSummary,
        showManual,
      }),
    );
  }, [workflow.current, showSummary, showManual, showSuccessFlash, activeStep.kind]);

  /** Prefill editable quantity with the required AQty when the Quantity step opens. */
  useEffect(() => {
    if (workflow.current !== "quantity") return;
    if (showSuccessFlash || complete) return;
    setInputValue(DEMO.quantity);
  }, [workflow.current, showSuccessFlash, complete]);

  function flashSuccess(stepId: PickingStepId, value: string) {
    if (successTimerRef.current !== null) {
      window.clearTimeout(successTimerRef.current);
    }
    setJustVerified({ stepId, value });
    setScanning(false);
    setShowManual(false);
    setInputValue("");
    successTimerRef.current = window.setTimeout(() => {
      setJustVerified(null);
      successTimerRef.current = null;
    }, SUCCESS_FLASH_MS);
  }

  function applyVerifyResult(result: ReturnType<typeof verifyCurrentStep>, completedStepId: PickingStepId) {
    setWorkflow(result.state);
    workflowRef.current = result.state;

    if (result.ok) {
      const value =
        result.state.verifiedValues?.[completedStepId] ??
        pickingDisplayValue(completedStepId);
      flashSuccess(completedStepId, value);
      scanSessionRef.current.resetDuplicateMemory();
      return true;
    }
    return false;
  }

  function submitRawValue(raw: string): boolean {
    const completedStepId = workflowRef.current.current;
    const session = scanSessionRef.current;
    const gated = session.submit(raw);
    if (gated.type === "ScanBusy" || gated.type === "ScanDuplicate") {
      return false;
    }
    if (gated.type !== "ScanSuccess") {
      setWorkflow((s) => ({
        ...s,
        failureKind: "blank",
        failedValue: "",
      }));
      session.release();
      return false;
    }

    const result = verifyCurrentStep(workflowRef.current, gated.value);
    session.release();
    return applyVerifyResult(result, completedStepId);
  }

  function enterManuallyAfterFailure() {
    setScanning(false);
    setWorkflow((s) => clearStepFailure(s));
    setShowManual(true);
    setInputValue("");
  }

  if (showSummary) {
    const summaryRows = workflow.stepOrder.map((id) => ({
      id,
      label: PICKING_UI_TERMS[id].label,
      value: getVerifiedDisplayValue(workflow, id) ?? pickingDisplayValue(id),
    }));

    return (
      <ScreenShell>
        <TopBar
          title={flowTitle}
          subtitle={VERIFICATION_SUMMARY_UI.title}
          showBack
          onBack={onBack}
        />
        <ScrollBody className="space-y-3">
          <WorkflowProgress
            current={workflow.current}
            complete
            verified={workflow.verified}
                  stepOrder={workflow.stepOrder}
          />
          <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm space-y-3">
            <div className="flex flex-col items-center gap-2 text-center">
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center hero-success-pop"
                style={{ background: "#d1fae5" }}
              >
                <IconSuccess />
              </div>
              <h2 className="text-lg sm:text-xl font-extrabold" style={{ color: "#1a1a2e" }}>
                {VERIFICATION_SUMMARY_UI.title}
              </h2>
              <p className="text-xs sm:text-sm font-semibold" style={{ color: "#059669" }}>
                {VERIFICATION_SUMMARY_UI.description}
              </p>
            </div>

            <div className="space-y-0 pt-1">
              {summaryRows.map((row, i) => {
                const verifiedAt = workflow.verifiedAt?.[row.id];
                return (
                  <div
                    key={row.id}
                    className="flex justify-between items-start gap-3 py-2.5"
                    style={{
                      borderBottom: i < summaryRows.length - 1 ? "1px solid #f0f0f8" : "none",
                    }}
                  >
                    <div className="flex items-start gap-2 min-w-0 flex-1">
                      <span
                        className="step-glyph-verified shrink-0 w-7 h-7 rounded-lg flex items-center justify-center mt-0.5"
                        style={{ background: "#d1fae5" }}
                      >
                        <StepFieldIcon stepId={row.id} color="#059669" quantityValue={DEMO.quantity} />
                      </span>
                      <div className="min-w-0">
                        <p className="text-xs sm:text-sm font-extrabold" style={{ color: "#059669" }}>
                          {row.label}
                        </p>
                        <p
                          className="text-sm font-extrabold mt-0.5 break-all"
                          style={{
                            color: "#1a1a2e",
                            fontFamily: "'JetBrains Mono', monospace",
                          }}
                        >
                          {row.value}
                        </p>
                        <p
                          className="text-[11px] mt-1 inline-flex items-center gap-1"
                          style={{ color: "#9898b8" }}
                        >
                          {verifiedAt !== undefined ? (
                            <>
                              <IconClock />
                              ✓ Verified at {formatVerifiedTimestamp(verifiedAt)}
                            </>
                          ) : (
                            "✓ Verified"
                          )}
                        </p>
                      </div>
                    </div>
                    <span
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] sm:text-xs font-bold shrink-0"
                      style={{ background: "#d1fae5", color: "#059669" }}
                    >
                      ✓ Verified
                    </span>
                  </div>
                );
              })}
            </div>

            <button
              onClick={onFinish}
              className="w-full py-3.5 sm:py-4 rounded-2xl text-white font-bold text-sm sm:text-base"
              style={{ background: "#3b35c4", minHeight: "var(--touch-min)" }}
            >
              {VERIFICATION_SUMMARY_UI.continueLabel}
            </button>
          </div>
        </ScrollBody>
        <BottomNav active="scan" />
      </ScreenShell>
    );
  }

  if (showSuccessFlash && justVerified) {
    return (
      <ScreenShell>
        <TopBar
          title={flowTitle}
          subtitle="Verified — continuing"
          showBack
          onBack={onBack}
        />
        <ScrollBody className="space-y-3">
          <WorkflowProgress
            current={workflow.current}
            complete={complete}
            verified={workflow.verified}
                  stepOrder={workflow.stepOrder}
          />
          <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm flex flex-col items-center gap-3 text-center hero-success-pop">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center"
              style={{ background: "#d1fae5" }}
            >
              <IconSuccess />
            </div>
            <StepFieldIcon
              stepId={justVerified.stepId}
              color="#059669"
              size={48}
              quantityValue={DEMO.quantity}
            />
            <h2 className="text-lg sm:text-xl font-extrabold" style={{ color: "#059669" }}>
              {verifiedSuccessLabel(justVerified.stepId)}
            </h2>
            <p
              className="text-base sm:text-lg font-extrabold break-all"
              style={{ color: "#1a1a2e", fontFamily: "'JetBrains Mono', monospace" }}
            >
              {justVerified.value}
            </p>
            <p className="text-xs sm:text-sm font-semibold" style={{ color: "#5a5a7a" }}>
              {movingToNextLabel(justVerified.stepId, workflow.stepOrder)}
            </p>
          </div>
        </ScrollBody>
        <BottomNav active="scan" />
      </ScreenShell>
    );
  }

  const scanLayout = activeStep.kind === "scan" && !showManual;

  return (
    <ScreenShell>
      <TopBar
        title={flowTitle}
        subtitle={activeStep.scanTitle}
        showBack
        onBack={onBack}
      />

      {scanLayout ? (
        <div
          className="flex-1 min-h-0 flex flex-col gap-2 py-2"
          style={{
            paddingLeft: "var(--app-pad-x)",
            paddingRight: "var(--app-pad-x)",
          }}
        >
          <div className="shrink-0">
            <WorkflowProgress
              current={workflow.current}
              verified={workflow.verified}
                    stepOrder={workflow.stepOrder}
          />
          </div>

          <div className="shrink-0 flex items-center gap-3">
            <StepFieldIcon
              stepId={activeStep.id}
              active
              scanning={cameraActive}
              color="#3b35c4"
              size={36}
            />
            <div className="min-w-0 flex-1">
              <h2 className="text-sm sm:text-base font-extrabold leading-tight" style={{ color: "#1a1a2e" }}>
                {activeStep.scanTitle}
              </h2>
              <p className="text-[11px] sm:text-xs font-semibold mt-0.5 leading-snug" style={{ color: "#5a5a7a" }}>
                {activeStep.helper}
              </p>
            </div>
          </div>

          <div
            className="shrink-0 rounded-xl px-3 py-2"
            style={{ background: "#fff", border: "1.5px solid #e0e0ec" }}
          >
            <p className="text-[10px] font-extrabold tracking-widest uppercase" style={{ color: "#9898b8" }}>
              {expectedValueLabel(activeStep.id)}
            </p>
            <p
              className="text-sm font-extrabold mt-0.5 break-all"
              style={{ color: "#1a1a2e", fontFamily: "'JetBrains Mono', monospace" }}
            >
              {activeStep.displayValue}
            </p>
            <p className="text-[10px] font-semibold mt-1.5" style={{ color: "#7c7c99" }}>
              Scan the barcode, or use Enter Manually and type this value.
            </p>
          </div>

          {failed && (
            <div
              className="shrink-0 rounded-xl px-3 py-3"
              style={{ background: "#fffbeb", border: "1.5px solid #fbbf24" }}
            >
              <div className="flex items-start gap-2">
                <IconWarning />
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm font-extrabold" style={{ color: "#92400e" }}>
                    {workflow.failureKind === "unreadable"
                      ? "Camera unavailable"
                      : activeStep.mismatchTitle}
                  </p>
                  {workflow.failureKind === "unreadable" ? (
                    <p className="text-xs font-semibold mt-1" style={{ color: "#92400e" }}>
                      Enter the barcode manually to continue.
                    </p>
                  ) : (
                    <>
                      <p className="text-xs font-semibold mt-1" style={{ color: "#92400e" }}>
                        {activeStep.mismatchHint}
                      </p>
                      {workflow.failedValue ? (
                        <p className="text-xs font-semibold mt-0.5" style={{ color: "#92400e" }}>
                          Scanned:{" "}
                          <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                            {workflow.failedValue}
                          </span>
                        </p>
                      ) : null}
                      <p className="text-xs font-semibold mt-1" style={{ color: "#92400e" }}>
                        Camera ready — scan again.
                      </p>
                    </>
                  )}
                </div>
              </div>
              {workflow.failureKind === "unreadable" && (
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => {
                      setWorkflow((s) => clearStepFailure(s));
                      setShowManual(false);
                      setScanning(true);
                    }}
                    className="flex-1 py-2.5 rounded-xl text-white text-xs font-bold"
                    style={{ background: "#1a1a22", minHeight: "var(--touch-min)" }}
                  >
                    Try Again
                  </button>
                  <button
                    onClick={enterManuallyAfterFailure}
                    className="flex-1 py-2.5 rounded-xl text-xs font-bold"
                    style={{
                      background: "#eeeeff",
                      color: "#3b35c4",
                      minHeight: "var(--touch-min)",
                    }}
                  >
                    Enter Manually
                  </button>
                </div>
              )}
            </div>
          )}

          <div className="flex-1 min-h-0">
            {cameraActive && (
              <CameraScanOverlay
                key={workflow.current}
                layout="embedded"
                fillAvailable
                title={scanContext.title}
                description={scanContext.instruction}
                instruction={activeStep.meaning}
                stepId={workflow.current}
                expectedValue={activeStep.expected}
                showStepGuide={false}
                onCancel={() => {
                  scanSessionRef.current.cancel();
                  setScanning(false);
                  setShowManual(true);
                  setInputValue("");
                  setWorkflow((s) => cancelCameraScan(s));
                }}
                onEnterManually={() => {
                  scanSessionRef.current.cancel();
                  setScanning(false);
                  setWorkflow((s) => clearStepFailure(s));
                  setShowManual(true);
                  setInputValue("");
                }}
                onUnreadable={() => {
                  setWorkflow((s) => markUnreadableFailure(s));
                }}
                onScanCaptured={(scanned) => {
                  const completedStepId = workflowRef.current.current;
                  const session = scanSessionRef.current;
                  const gated = session.submit(scanned);
                  if (gated.type === "ScanBusy" || gated.type === "ScanDuplicate") {
                    return "ignore";
                  }
                  if (gated.type !== "ScanSuccess") {
                    session.release();
                    return "ignore";
                  }

                  const result = verifyCurrentStep(workflowRef.current, gated.value);
                  session.release();
                  const ok = applyVerifyResult(result, completedStepId);
                  return ok ? true : false;
                }}
              />
            )}
          </div>

          {!failed && (
            <button
              onClick={() => {
                setScanning(false);
                setShowManual(true);
                setInputValue("");
              }}
              className="w-full py-2.5 rounded-xl text-xs font-bold shrink-0"
              style={{
                background: "#f4f4f8",
                color: "#5a5a7a",
                minHeight: "var(--touch-min)",
              }}
            >
              Can't scan? Enter Manually
            </button>
          )}
        </div>
      ) : (
        <ScrollBody className="space-y-3">
          <WorkflowProgress
            current={workflow.current}
            verified={workflow.verified}
                  stepOrder={workflow.stepOrder}
          />

          <div className="flex flex-col items-center gap-2 text-center">
            <StepFieldIcon
              stepId={activeStep.id}
              active
              scanning={false}
              color="#3b35c4"
              size={52}
              quantityValue={DEMO.quantity}
            />
            <h2 className="text-lg sm:text-xl font-extrabold" style={{ color: "#1a1a2e" }}>
              {activeStep.scanTitle}
            </h2>
            <p className="text-xs sm:text-sm font-semibold" style={{ color: "#5a5a7a" }}>
              {activeStep.helper}
            </p>
            <p className="text-[11px] sm:text-xs" style={{ color: "#9898b8" }}>
              {activeStep.meaning}
            </p>
          </div>

          {activeStep.kind === "scan" && (
            <div
              className="rounded-xl px-3 py-2"
              style={{ background: "#fff", border: "1.5px solid #e0e0ec" }}
            >
              <p className="text-[10px] font-extrabold tracking-widest uppercase" style={{ color: "#9898b8" }}>
                {expectedValueLabel(activeStep.id)}
              </p>
              <p
                className="text-sm font-extrabold mt-0.5 break-all"
                style={{ color: "#1a1a2e", fontFamily: "'JetBrains Mono', monospace" }}
              >
                {activeStep.displayValue}
              </p>
            </div>
          )}

          {failed && (
            <div
              className="rounded-xl px-3 py-3"
              style={{ background: "#fffbeb", border: "1.5px solid #fbbf24" }}
            >
              <div className="flex items-start gap-2">
                <IconWarning />
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm font-extrabold" style={{ color: "#92400e" }}>
                    {activeStep.mismatchTitle}
                  </p>
                  <p className="text-xs font-semibold mt-1" style={{ color: "#92400e" }}>
                    {activeStep.mismatchHint}
                  </p>
                  {workflow.failedValue ? (
                    <p className="text-xs font-semibold mt-0.5" style={{ color: "#92400e" }}>
                      Entered:{" "}
                      <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                        {workflow.failedValue}
                      </span>
                    </p>
                  ) : null}
                </div>
              </div>
              {activeStep.kind === "quantity" && (
                <button
                  onClick={() => {
                    setWorkflow((s) => clearStepFailure(s));
                    setInputValue(DEMO.quantity);
                  }}
                  className="w-full mt-3 py-2.5 rounded-xl text-white text-xs font-bold"
                  style={{ background: "#1a1a22", minHeight: "var(--touch-min)" }}
                >
                  Try Again
                </button>
              )}
            </div>
          )}

          {activeStep.kind === "scan" && showManual && (
            <>
              <p className="text-xs font-semibold" style={{ color: "#7c7c99" }}>
                Enter barcode manually
              </p>
              <div>
                <label className="text-xs font-semibold block mb-2" style={{ color: "#1a1a2e" }}>
                  Barcode
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
                    autoFocus
                    className="flex-1 outline-none text-base font-semibold bg-transparent min-w-0"
                    style={{
                      color: "#1a1a2e",
                      fontFamily: "'JetBrains Mono', monospace",
                    }}
                    placeholder={`Enter ${activeStep.label}`}
                  />
                </div>
              </div>
              <button
                onClick={() => {
                  submitRawValue(inputValue);
                }}
                disabled={!inputValue.trim()}
                className="w-full py-3.5 rounded-2xl text-white font-bold text-sm disabled:opacity-70 active:opacity-90"
                style={{
                  background: inputValue.trim() ? "#26208a" : "#b0b0cc",
                  minHeight: "var(--touch-min)",
                }}
              >
                Continue
              </button>
              <button
                onClick={() => {
                  setShowManual(false);
                  setInputValue("");
                  setWorkflow((s) => clearStepFailure(s));
                  setScanning(true);
                }}
                className="w-full py-2.5 rounded-xl text-xs font-bold"
                style={{
                  background: "#f4f4f8",
                  color: "#5a5a7a",
                  minHeight: "var(--touch-min)",
                }}
              >
                Back to Camera
              </button>
            </>
          )}

          {activeStep.kind === "quantity" && !failed && (
            <>
              <div
                className="rounded-xl px-3 py-3"
                style={{ background: "#f8f8fc", border: "1.5px solid #e0e0ec" }}
              >
                <p className="text-xs font-semibold" style={{ color: "#7c7c99" }}>
                  Required Quantity
                </p>
                <p
                  className="text-lg font-extrabold mt-0.5"
                  style={{ color: "#1a1a2e", fontFamily: "'JetBrains Mono', monospace" }}
                >
                  {DEMO.quantity}
                </p>
                <p className="text-xs font-semibold mt-2" style={{ color: "#7c7c99" }}>
                  {UOM_UI.label}
                </p>
                <p
                  className="text-sm font-extrabold mt-0.5"
                  style={{ color: "#3b35c4", fontFamily: "'JetBrains Mono', monospace" }}
                >
                  {DEMO.uom}
                </p>
              </div>
              <div>
                <label className="text-xs font-semibold block mb-2" style={{ color: "#1a1a2e" }}>
                  Enter quantity picked
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
                    aria-label="Quantity picked"
                  />
                  <span
                    className="text-xs font-bold shrink-0 px-2 py-1 rounded-lg"
                    style={{ background: "#eeeeff", color: "#3b35c4" }}
                  >
                    {DEMO.uom}
                  </span>
                </div>
              </div>
              <button
                onClick={() => submitRawValue(inputValue)}
                disabled={!inputValue.trim()}
                className="w-full py-3.5 rounded-2xl text-white font-bold text-sm disabled:opacity-70 active:opacity-90"
                style={{
                  background: inputValue.trim() ? "#26208a" : "#b0b0cc",
                  minHeight: "var(--touch-min)",
                }}
              >
                Confirm Quantity
              </button>
            </>
          )}

          <button
            onClick={onBack}
            className="w-full py-3.5 rounded-2xl font-bold text-sm mb-1"
            style={{ background: "#f4f4f8", color: "#5a5a7a", minHeight: "var(--touch-min)" }}
          >
            Cancel
          </button>
        </ScrollBody>
      )}

      <BottomNav active="scan" />
    </ScreenShell>
  );
}

// ─── Screen: Scan Source Bin ──────────────────────────────────────────────────
function ScanSourceBinScreen({
  onBack,
  onNavigate,
}: {
  onBack: () => void;
  onNavigate: (s: Screen) => void;
}) {
  return (
    <RfVerifyScanScreen
      title={PICKING_UI_TERMS.source.scanTitle}
      subtitle={PICKING_UI_TERMS.source.meaning}
      heading={PICKING_UI_TERMS.source.scanTitle}
      instruction={PICKING_UI_TERMS.source.scanHelper}
      expectedLabel={`Expected ${PICKING_UI_TERMS.source.label}`}
      expectedValue={DEMO.sourceBin}
      fieldLabel={PICKING_UI_TERMS.source.label}
      placeholder="Enter source bin"
      verifiedLabel={`✓ ${PICKING_UI_TERMS.source.label} — Verified`}
      mismatchTitle={PICKING_UI_TERMS.source.mismatchTitle}
      mismatchHint="Please scan the correct Source Bin (SBin)."
      progressStep="source"
      continueLabel="Continue to Product"
      onBack={onBack}
      onContinue={() => onNavigate("scan-product")}
    />
  );
}

// ─── Screen: Scan Product ─────────────────────────────────────────────────────
function ScanProductScreen({
  onBack,
  onNavigate,
}: {
  onBack: () => void;
  onNavigate: (s: Screen) => void;
}) {
  return (
    <RfVerifyScanScreen
      title={PICKING_UI_TERMS.product.scanTitle}
      subtitle={PICKING_UI_TERMS.product.meaning}
      heading={PICKING_UI_TERMS.product.scanTitle}
      instruction={PICKING_UI_TERMS.product.scanHelper}
      expectedLabel={`Expected ${PICKING_UI_TERMS.product.label}`}
      expectedValue={DEMO.product}
      fieldLabel={PICKING_UI_TERMS.product.label}
      placeholder="Enter product number"
      verifiedLabel={`✓ ${PICKING_UI_TERMS.product.label} — Verified`}
      mismatchTitle={PICKING_UI_TERMS.product.mismatchTitle}
      mismatchHint="Please scan the correct Product (Prod.)."
      progressStep="product"
      continueLabel="Continue to Batch"
      onBack={onBack}
      onContinue={() => onNavigate("scan-batch")}
    />
  );
}

// ─── Screen: Scan Batch ───────────────────────────────────────────────────────
function ScanBatchScreen({
  onBack,
  onNavigate,
}: {
  onBack: () => void;
  onNavigate: (s: Screen) => void;
}) {
  return (
    <RfVerifyScanScreen
      title={PICKING_UI_TERMS.batch.scanTitle}
      subtitle={PICKING_UI_TERMS.batch.meaning}
      heading={PICKING_UI_TERMS.batch.scanTitle}
      instruction={PICKING_UI_TERMS.batch.scanHelper}
      expectedLabel={`Expected ${PICKING_UI_TERMS.batch.label}`}
      expectedValue={DEMO.batch}
      fieldLabel={PICKING_UI_TERMS.batch.label}
      placeholder="Enter batch"
      verifiedLabel={`✓ ${PICKING_UI_TERMS.batch.label} — Verified`}
      mismatchTitle={PICKING_UI_TERMS.batch.mismatchTitle}
      mismatchHint="Please scan the correct Batch."
      progressStep="batch"
      continueLabel="Continue to Quantity"
      onBack={onBack}
      onContinue={() => onNavigate("confirm-quantity")}
    />
  );
}

// ─── Screen: Confirm Quantity ─────────────────────────────────────────────────
function ConfirmQuantityScreen({
  onBack,
  onNavigate,
}: {
  onBack: () => void;
  onNavigate: (s: Screen) => void;
}) {
  const [qty, setQty] = useState<string>(DEMO.quantity);
  const [status, setStatus] = useState<VerifyStatus>("waiting");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function handleConfirm() {
    const trimmed = qty.trim();
    if (!trimmed) {
      setStatus("waiting");
      setErrorMessage("Quantity is blank — enter the confirmed quantity");
      return;
    }
    if (!/^\d+(\.\d+)?$/.test(trimmed)) {
      setStatus("mismatch");
      setErrorMessage("Invalid quantity — enter a numeric value");
      return;
    }
    if (Number(trimmed) !== Number(DEMO.quantity)) {
      setStatus("mismatch");
      setErrorMessage(
        Number(trimmed) < Number(DEMO.quantity)
          ? `Partial quantity — expected ${DEMO.quantity} ${DEMO.uom}`
          : `Excess quantity — expected ${DEMO.quantity} ${DEMO.uom}`
      );
      return;
    }
    setErrorMessage(null);
    setStatus("verified");
  }

  return (
    <ScreenShell>
      <TopBar
        title={PICKING_UI_TERMS.quantity.scanTitle}
        subtitle={PICKING_UI_TERMS.quantity.meaning}
        showBack
        onBack={onBack}
      />

      <ScrollBody>
        <WorkflowProgress current="quantity" />

        <div className="bg-white rounded-2xl p-3.5 sm:p-4 shadow-sm">
          <p className="text-[10px] sm:text-xs font-extrabold tracking-widest uppercase" style={{ color: "#9898b8" }}>
            Expected {PICKING_UI_TERMS.quantity.label}
          </p>
          <p
            className="text-base sm:text-lg font-extrabold mt-1"
            style={{ color: "#1a1a2e", fontFamily: "'JetBrains Mono', monospace" }}
          >
            {DEMO.quantity} {DEMO.uom}
          </p>
          <p className="text-xs mt-1" style={{ color: "#7c7c99" }}>
            {PICKING_UI_TERMS.quantity.meaning}
          </p>
        </div>

        <div className="bg-white rounded-2xl p-3.5 sm:p-4 shadow-sm">
          <h3
            className="text-[10px] sm:text-xs font-extrabold tracking-widest uppercase mb-3"
            style={{ color: "#3b35c4" }}
          >
            Task Information
          </h3>
          <div className="space-y-0">
            {[
              {
                label: PICKING_UI_TERMS.product.label,
                value: DEMO.product,
                meaning: PICKING_UI_TERMS.product.meaning,
              },
              {
                label: PICKING_UI_TERMS.batch.label,
                value: DEMO.batch,
                meaning: PICKING_UI_TERMS.batch.meaning,
              },
              {
                label: PICKING_UI_TERMS.quantity.label,
                value: `${DEMO.quantity} ${DEMO.uom}`,
                meaning: PICKING_UI_TERMS.quantity.meaning,
              },
              {
                label: UOM_UI.label,
                value: UOM_UI.value,
                meaning: UOM_UI.meaning,
              },
            ].map((row, i, arr) => (
              <div
                key={row.label}
                className="flex justify-between items-start gap-3 py-2.5"
                style={{
                  borderBottom: i < arr.length - 1 ? "1px solid #f0f0f8" : "none",
                }}
              >
                <div className="min-w-0">
                  <span className="text-xs sm:text-sm font-semibold" style={{ color: "#1a1a2e" }}>
                    {row.label}
                  </span>
                  <p className="text-[11px] mt-0.5" style={{ color: "#9898b8" }}>
                    {row.meaning}
                  </p>
                </div>
                <span
                  className="text-xs sm:text-sm font-bold text-right break-all"
                  style={{
                    color: "#1a1a2e",
                    fontFamily: "'JetBrains Mono', monospace",
                  }}
                >
                  {row.value}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div
          className="rounded-2xl px-3 sm:px-4 py-3 flex items-start sm:items-center gap-3"
          style={{ background: "#eeeeff", border: "1.5px solid #c7c4f5" }}
        >
          <p className="text-xs sm:text-sm font-semibold leading-snug" style={{ color: "#3b35c4" }}>
            Quantity (AQty) is confirmed manually — not scanned from a barcode
          </p>
        </div>

        <VerificationStatusCard
          status={status}
          verifiedLabel={`✓ ${PICKING_UI_TERMS.quantity.label} — Verified`}
          mismatchTitle={PICKING_UI_TERMS.quantity.mismatchTitle}
          mismatchHint="Please confirm the correct Quantity (AQty)."
          expectedValue={`${DEMO.quantity} ${DEMO.uom}`}
          verifiedValue={status === "verified" ? `${qty} ${DEMO.uom}` : undefined}
        />

        {errorMessage && status !== "verified" && (
          <div
            className="rounded-2xl px-3 sm:px-4 py-3 flex items-start gap-3"
            style={{ background: "#fffbeb", border: "1.5px solid #fbbf24" }}
          >
            <IconWarning />
            <p className="text-xs sm:text-sm font-semibold" style={{ color: "#92400e" }}>
              {errorMessage}
            </p>
          </div>
        )}

        {status !== "verified" && (
          <div className="bg-white rounded-2xl p-3.5 sm:p-4 shadow-sm space-y-3">
            <div>
              <label className="text-xs sm:text-sm font-semibold block mb-2" style={{ color: "#1a1a2e" }}>
                Confirm Quantity
              </label>
              <div
                className="flex items-center gap-3 rounded-xl px-3 sm:px-4 py-3 bg-white"
                style={{ border: "1.5px solid #e0e0ec", minHeight: "var(--touch-min)" }}
              >
                <IconHash />
                <input
                  type="text"
                  inputMode="numeric"
                  value={qty}
                  onChange={(e) => {
                    setQty(e.target.value);
                    setErrorMessage(null);
                    if (status === "mismatch") setStatus("waiting");
                  }}
                  className="flex-1 outline-none text-base font-semibold bg-transparent min-w-0"
                  style={{ color: "#1a1a2e", fontFamily: "'JetBrains Mono', monospace" }}
                  placeholder="Enter quantity"
                />
                <span
                  className="text-xs sm:text-sm font-bold shrink-0 px-2 py-1 rounded-lg"
                  style={{ background: "#eeeeff", color: "#3b35c4" }}
                >
                  {DEMO.uom}
                </span>
              </div>
            </div>
          </div>
        )}

        {status !== "verified" ? (
        <button
            onClick={handleConfirm}
            className="w-full py-3.5 sm:py-4 rounded-2xl text-white font-bold text-sm sm:text-base transition-opacity active:opacity-80"
          style={{
              background: qty.trim() ? "#26208a" : "#b0b0cc",
              minHeight: "var(--touch-min)",
            }}
          >
            Confirm Quantity
          </button>
        ) : (
          <button
            onClick={() => onNavigate("scan-destination-bin")}
            className="w-full py-3.5 sm:py-4 rounded-2xl text-white font-bold text-sm sm:text-base"
            style={{ background: "#059669", minHeight: "var(--touch-min)" }}
          >
            Continue to Destination Bin
          </button>
        )}

        <button
          onClick={onBack}
          className="w-full py-3.5 sm:py-4 rounded-2xl font-bold text-sm sm:text-base mb-1"
          style={{ background: "#f4f4f8", color: "#5a5a7a", minHeight: "var(--touch-min)" }}
        >
          Cancel
        </button>
      </ScrollBody>

      <BottomNav active="scan" />
    </ScreenShell>
  );
}

// ─── Screen: Scan Destination Bin ─────────────────────────────────────────────
function ScanDestinationBinScreen({
  onBack,
  onNavigate,
}: {
  onBack: () => void;
  onNavigate: (s: Screen) => void;
}) {
  return (
    <RfVerifyScanScreen
      title={PICKING_UI_TERMS.destination.scanTitle}
      subtitle={PICKING_UI_TERMS.destination.meaning}
      heading={PICKING_UI_TERMS.destination.scanTitle}
      instruction={PICKING_UI_TERMS.destination.scanHelper}
      expectedLabel={`Expected ${PICKING_UI_TERMS.destination.label}`}
      expectedValue={DEMO.destinationBin}
      fieldLabel={PICKING_UI_TERMS.destination.label}
      placeholder="Enter destination bin"
      verifiedLabel={`✓ ${PICKING_UI_TERMS.destination.label} — Verified`}
      mismatchTitle={PICKING_UI_TERMS.destination.mismatchTitle}
      mismatchHint="Please scan the correct Destination Bin (DstBin)."
      progressStep="destination"
      continueLabel="Continue to Picking Complete"
      onBack={onBack}
      onContinue={() => onNavigate("picking-complete")}
    />
  );
}

// ─── Screen: Picking Complete ─────────────────────────────────────────────────
function PickingCompleteScreen({
  onHome,
  onBackToPicking,
  flowTitle,
}: {
  onHome: () => void;
  onBackToPicking: () => void;
  flowTitle: string;
}) {
  const pickDocument = getActivePickingDocument();
  const detailRows = getConsolidatedPickingDetailRows(pickDocument);
  const required = new Set(pickDocument.requiredVerificationSteps);

  function handlePrint() {
    const doc = window.document;
    const previousTitle = doc.title;
    doc.title = " ";
    const restoreTitle = () => {
      doc.title = previousTitle;
      window.removeEventListener("afterprint", restoreTitle);
    };
    window.addEventListener("afterprint", restoreTitle);
    window.print();
    window.setTimeout(restoreTitle, 1000);
  }

  return (
    <ScreenShell>
      <TopBar
        title={PICKING_COMPLETE_UI.title}
        subtitle={flowTitle}
        showBack
        onBack={onHome}
      />

      <ScrollBody>
        <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-sm flex flex-col items-center gap-3 text-center print:hidden">
          <div
            className="w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center step-glyph-verified"
            style={{ background: "#d1fae5" }}
          >
            <IconSuccess />
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold" style={{ color: "#1a1a2e" }}>
            {PICKING_COMPLETE_UI.title}
          </h2>
          <span
            className="text-[10px] sm:text-xs font-bold px-3 py-1 rounded-full"
            style={{ background: "#d1fae5", color: "#059669" }}
          >
            {PICKING_COMPLETE_UI.description}
          </span>
        </div>

        <div
          id="picking-complete-print"
          className="bg-white rounded-2xl p-3.5 sm:p-4 shadow-sm"
        >
          <div className="picking-print-header mb-3">
            <h3
              className="text-[10px] sm:text-xs font-extrabold tracking-widest uppercase"
              style={{ color: "#1a1a2e" }}
            >
              Picking Details
            </h3>
            <p className="picking-print-meta">
              {flowTitle} · WO {pickDocument.wo}
            </p>
          </div>

          <table className="picking-print-table w-full border-collapse">
            <thead>
              <tr>
                <th scope="col">Field</th>
                <th scope="col">Value</th>
                <th scope="col">Status</th>
              </tr>
            </thead>
            <tbody>
              {detailRows.map((row) => {
                const wasVerified = row.stepId != null && required.has(row.stepId);
                return (
                  <tr key={row.key}>
                    <td className="picking-print-label">{row.label}</td>
                    <td className="picking-print-value">{row.value}</td>
                    <td className="picking-print-status">
                      {wasVerified ? (
                        <span className="picking-status-verified">Verified</span>
                      ) : (
                        <span className="picking-status-na">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <button
          onClick={handlePrint}
          className="w-full py-3.5 sm:py-4 rounded-2xl text-white font-bold text-sm sm:text-base transition-opacity active:opacity-80 print:hidden"
          style={{ background: "#059669", minHeight: "var(--touch-min)" }}
        >
          {PICKING_COMPLETE_UI.printLabel}
        </button>

        <button
          onClick={onBackToPicking}
          className="w-full py-3.5 sm:py-4 rounded-2xl text-white font-bold text-sm sm:text-base transition-opacity active:opacity-80 print:hidden"
          style={{ background: "#3b35c4", minHeight: "var(--touch-min)" }}
        >
          Back to Picking
        </button>

        <button
          onClick={onHome}
          className="w-full py-3.5 sm:py-4 rounded-2xl text-white font-bold text-sm sm:text-base transition-opacity active:opacity-80 mb-1 print:hidden"
          style={{ background: "#1a1a22", minHeight: "var(--touch-min)" }}
        >
          Return to Home
        </button>
      </ScrollBody>

      <BottomNav active="home" />
    </ScreenShell>
  );
}

// ─── Screen: Activity ─────────────────────────────────────────────────────────
function ActivityScreen({ onBack }: { onBack: () => void }) {
  const chrome = useAppChrome();
  const activities = [
    { time: "14:32", action: "WO 200028 started", user: "Muruga", status: "active", color: "#3b35c4" },
    { time: "13:15", action: "WO 200021 completed", user: "Muruga", status: "done", color: "#059669" },
    { time: "12:48", action: "WO 200019 picked", user: "Muruga", status: "done", color: "#059669" },
    { time: "11:20", action: "WO 200015 cancelled", user: "Muruga", status: "cancel", color: "#dc2626" },
    { time: "10:05", action: "WO 200010 completed", user: "Muruga", status: "done", color: "#059669" },
  ];

  return (
    <ScreenShell>
      <div
        style={{
          background: "#1a1a22",
          paddingTop: "max(0.5rem, var(--safe-top))",
          paddingLeft: "var(--app-pad-x)",
          paddingRight: "var(--app-pad-x)",
        }}
        className="pb-5 sm:pb-6 shrink-0"
      >
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-white text-xl sm:text-2xl font-extrabold tracking-tight truncate min-w-0">
            Activity Log
          </h1>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              aria-label="Open profile"
              onClick={chrome.goProfile}
              className="rounded-full flex items-center justify-center text-white font-bold text-sm active:opacity-80"
              style={{ background: "#2e2e38", width: "var(--touch-min)", height: "var(--touch-min)" }}
            >
              M
            </button>
            <button
              aria-label="Log out"
              onClick={chrome.logout}
              className="rounded-full flex items-center justify-center active:opacity-80"
              style={{
                background: "rgba(255,255,255,0.18)",
                width: "var(--touch-min)",
                height: "var(--touch-min)",
              }}
            >
              <IconLogout />
            </button>
          </div>
        </div>
        <p className="text-gray-400 text-xs sm:text-sm mt-0.5">Recent warehouse operations</p>
      </div>

      <ScrollBody>
        {/* Summary row */}
        <div className="grid grid-cols-2 gap-2 sm:gap-3">
          <div className="bg-white rounded-2xl p-3.5 sm:p-4 shadow-sm min-w-0">
            <p className="text-2xl sm:text-3xl font-extrabold" style={{ color: "#3b35c4" }}>38</p>
            <p className="text-[10px] sm:text-xs font-medium mt-1" style={{ color: "#9898b8" }}>Picks Today</p>
          </div>
          <div className="bg-white rounded-2xl p-3.5 sm:p-4 shadow-sm min-w-0">
            <p className="text-2xl sm:text-3xl font-extrabold" style={{ color: "#059669" }}>94%</p>
            <p className="text-[10px] sm:text-xs font-medium mt-1" style={{ color: "#9898b8" }}>Accuracy Rate</p>
          </div>
        </div>

        <h3 className="text-xs sm:text-sm font-bold px-1" style={{ color: "#9898b8" }}>TODAY'S OPERATIONS</h3>

        {activities.map((act, i) => (
          <div key={i} className="bg-white rounded-2xl p-3.5 sm:p-4 shadow-sm flex items-center gap-3 sm:gap-4">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: act.color + "18" }}
            >
              <IconActivity active={act.status === "active"} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm font-semibold truncate" style={{ color: "#1a1a2e" }}>{act.action}</p>
              <p className="text-[10px] sm:text-xs mt-0.5" style={{ color: "#9898b8" }}>
                {act.user} · {act.time}
              </p>
            </div>
            <span
              className="text-[10px] sm:text-xs font-bold px-2 sm:px-2.5 py-1 rounded-full shrink-0"
              style={{
                background: act.color + "18",
                color: act.color,
              }}
            >
              {act.status}
            </span>
          </div>
        ))}
      </ScrollBody>

      <BottomNav active="activity" />
    </ScreenShell>
  );
}

// ─── Screen: Profile ──────────────────────────────────────────────────────────
function ProfileScreen({ onBack, onLogout }: { onBack: () => void; onLogout: () => void }) {
  const [notice, setNotice] = useState<string | null>(null);

  const menuItems: { label: string; message: string }[] = [
    {
      label: "App Settings",
      message: "Terminal settings are managed by your warehouse administrator.",
    },
    {
      label: "Notification Preferences",
      message: "Push and scan alerts can be configured when connected to SAP.",
    },
    {
      label: "About",
      message: "RF Scanner · Warehouse picking demo · Version 1.0",
    },
  ];

  return (
    <ScreenShell>
      <div
        style={{
          background: "#1a1a22",
          paddingTop: "max(0.5rem, var(--safe-top))",
          paddingLeft: "var(--app-pad-x)",
          paddingRight: "var(--app-pad-x)",
        }}
        className="pb-8 sm:pb-10 shrink-0"
      >
        <div className="flex items-center justify-between">
          <h1 className="text-white text-xl sm:text-2xl font-extrabold tracking-tight">Profile</h1>
        </div>
      </div>

      <ScrollBody className="-mt-5 sm:-mt-6">
        <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm flex flex-col items-center gap-2">
          <div
            className="w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center text-white text-2xl sm:text-3xl font-extrabold"
            style={{ background: "#1a1a22" }}
          >
            M
          </div>
          <h2 className="text-lg sm:text-xl font-extrabold" style={{ color: "#1a1a2e" }}>Muruga</h2>
          <span
            className="text-xs sm:text-sm font-bold px-3 py-1 rounded-lg"
            style={{ background: "#eeeeff", color: "#3b35c4" }}
          >
            Warehouse: WH01
          </span>
        </div>

        <div className="bg-white rounded-2xl p-3.5 sm:p-4 shadow-sm space-y-0">
          {[
            { label: "Role", value: "Warehouse Operator" },
            { label: "Terminal", value: "RF-TERMINAL-01" },
            { label: "Shift", value: "Morning (06:00 - 14:00)" },
            { label: "Session", value: "WRF-2026-0821" },
          ].map((row, i, arr) => (
            <div
              key={row.label}
              className="flex justify-between items-start gap-3 py-3"
              style={{ borderBottom: i < arr.length - 1 ? "1px solid #f0f0f8" : "none" }}
            >
              <span className="text-xs sm:text-sm shrink-0" style={{ color: "#9898b8" }}>{row.label}</span>
              <span className="text-xs sm:text-sm font-semibold text-right break-words" style={{ color: "#1a1a2e" }}>
                {row.value}
              </span>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl p-3.5 sm:p-4 shadow-sm space-y-0">
          {menuItems.map((item, i, arr) => (
            <button
              key={item.label}
              type="button"
              onClick={() => setNotice(item.message)}
              className="w-full flex justify-between items-center gap-3 py-3 active:opacity-80"
              style={{
                borderBottom: i < arr.length - 1 ? "1px solid #f0f0f8" : "none",
                minHeight: "var(--touch-min)",
              }}
            >
              <span className="text-xs sm:text-sm font-semibold text-left" style={{ color: "#1a1a2e" }}>{item.label}</span>
              <IconChevronRight color="#c8c8e0" />
            </button>
          ))}
        </div>

        {notice && (
          <div
            className="rounded-2xl px-3.5 py-3 flex items-start gap-2"
            style={{ background: "#eeeeff", border: "1.5px solid #c8c8f0" }}
          >
            <div className="min-w-0 flex-1">
              <p className="text-xs sm:text-sm font-semibold" style={{ color: "#1a1a2e" }}>
                {notice}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setNotice(null)}
              className="text-xs font-bold shrink-0 active:opacity-80"
              style={{ color: "#3b35c4" }}
            >
              Dismiss
            </button>
          </div>
        )}

        <button
          onClick={onLogout}
          className="w-full py-3.5 sm:py-4 rounded-2xl font-bold text-sm sm:text-base mb-2 active:opacity-90"
          style={{ background: "#fff0f0", color: "#dc2626", minHeight: "var(--touch-min)" }}
        >
          Sign Out
        </button>
      </ScrollBody>

      <BottomNav active="profile" />
    </ScreenShell>
  );
}

// ─── App root ─────────────────────────────────────────────────────────────────
export default function App() {
  const [screen, setScreen] = useState<Screen>("login");
  const [history, setHistory] = useState<Screen[]>([]);
  const [pickingMethod, setPickingMethod] = useState<PickingMethod>("by-wo");
  const flowTitle = getPickingMethodMeta(pickingMethod).flowTitle;

  const receivingUi: ReceivingSharedUi = {
    ScreenShell,
    ScrollBody,
    TopBar,
    BottomNav,
    CameraScanOverlay,
    IconQR,
    IconHash,
    IconWarning,
    IconSuccess,
    IconChevronRight,
  };

  function navigate(to: Screen) {
    setHistory((h) => [...h, screen]);
    setScreen(to);
  }

  function goBack() {
    const prev = history[history.length - 1] ?? "home";
    setHistory((h) => h.slice(0, -1));
    setScreen(prev === "login" ? "home" : prev);
  }

  function goHome() {
    setHistory([]);
    setScreen("home");
  }

  function goToPicking() {
    setHistory([]);
    setScreen("picking-methods");
  }

  function continueWithMethod(method: PickingMethod) {
    setPickingMethod(method);
    navigate("picking-details");
  }

  function logout() {
    setHistory([]);
    setScreen("login");
  }

  function navTab(tab: NavTab) {
    const map: Record<NavTab, Screen> = {
      home: "home",
      scan: "scan-wo",
      activity: "activity",
      profile: "profile",
    };
    setHistory([]);
    setScreen(map[tab]);
  }

  function goProfile() {
    setHistory((h) => (screen === "profile" ? h : [...h, screen]));
    setScreen("profile");
  }

  const chrome: AppChromeValue = {
    navigateTab: navTab,
    logout,
    goProfile,
  };

  return (
    <AppChromeContext.Provider value={chrome}>
    <div
      className="flex items-stretch justify-center min-h-dvh w-full"
      style={{ background: "#1a1a2e" }}
    >
      <div
        className="relative overflow-hidden flex flex-col w-full h-dvh max-w-md mx-auto md:max-h-[min(100dvh,900px)] md:my-auto md:rounded-[28px] md:shadow-[0_24px_64px_rgba(0,0,0,0.45)]"
        style={{ background: "#eef0f5" }}
      >
        {screen === "login" && <LoginScreen onLogin={goHome} />}
        {screen === "home" && <HomeScreen onNavigate={navigate} onLogout={logout} />}
        {isModuleHubScreen(screen) && (
          <ModuleProcessesScreen
            title={MODULE_HUB_CONFIG[screen].title}
            subtitle={MODULE_HUB_CONFIG[screen].subtitle}
            onBack={goBack}
            onNavigate={navigate}
          />
        )}
        {screen === "scan-po" && (
          <ScanPurchaseOrderScreen
            ui={receivingUi}
            onBack={goBack}
            onPoVerified={() => navigate("receiving-execution")}
          />
        )}
        {screen === "receiving-execution" && (
          <ReceivingExecutionScreen
            ui={receivingUi}
            onBack={goBack}
            onComplete={() => navigate("goods-receipt")}
          />
        )}
        {screen === "goods-receipt" && (
          <GoodsReceiptScreen ui={receivingUi} onHome={goHome} />
        )}
        {screen === "picking-methods" && (
          <PickingMethodsScreen onBack={goBack} onContinue={continueWithMethod} />
        )}
        {screen === "scan-wo" && (
          <ScanWOScreen onBack={goBack} onNavigate={navigate} flowTitle={flowTitle} />
        )}
        {screen === "picking-details" && (
          <PickingDetailsScreen
            onBack={goBack}
            onNavigate={navigate}
            method={pickingMethod}
          />
        )}
        {screen === "picking-execution" && (
          <PickingExecutionScreen
            onBack={goBack}
            onFinish={() => navigate("picking-complete")}
            flowTitle={flowTitle}
          />
        )}
        {screen === "scan-source-bin" && (
          <ScanSourceBinScreen onBack={goBack} onNavigate={navigate} />
        )}
        {screen === "scan-product" && (
          <ScanProductScreen onBack={goBack} onNavigate={navigate} />
        )}
        {screen === "scan-batch" && (
          <ScanBatchScreen onBack={goBack} onNavigate={navigate} />
        )}
        {screen === "confirm-quantity" && (
          <ConfirmQuantityScreen onBack={goBack} onNavigate={navigate} />
        )}
        {screen === "scan-destination-bin" && (
          <ScanDestinationBinScreen onBack={goBack} onNavigate={navigate} />
        )}
        {screen === "picking-complete" && (
          <PickingCompleteScreen
            onHome={goHome}
            onBackToPicking={goToPicking}
            flowTitle={flowTitle}
          />
        )}
        {screen === "activity" && <ActivityScreen onBack={goBack} />}
        {screen === "profile" && <ProfileScreen onBack={goBack} onLogout={logout} />}
      </div>
    </div>
    </AppChromeContext.Provider>
  );
}
