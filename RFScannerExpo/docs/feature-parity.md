# RF Scanner — Feature Parity Checklist

**Canonical original source:** `frontend/src/App.tsx` (+ `frontend/src/picking/*`, `frontend/src/receiving/*`).  
(Nested `frontend/frontend/src` is an older snapshot; do not prefer it over `frontend/src`.)

**Expo target:** `RFScannerExpo/`.

## Backend / API (critical)

| Finding | Detail |
|---|---|
| HTTP clients | **None** — no `fetch`, axios, or API base URL in the original frontend |
| Auth | Demo login only (non-empty warehouse / resource / password) — no token exchange |
| Picking / receiving data | Client demo documents (`DEMO_PICKING_DOCUMENT`, `DEMO_RECEIVING`) |
| Stats (Open WOs / Picked Today / Pending) | **Hardcoded display values** in HomeScreen (`14` / `38` / `6`) — not live |
| Activity log | Static demo rows |
| SAP posting | Explicitly **not** performed; complete screens show demo disclaimers |
| Expo `EXPO_PUBLIC_API_BASE_URL` | Optional future hook only — unused by original workflows |

Legend — Status: `missing` · `partial` · `parity` · `unreachable-in-original` · `intentional-locked`  
Verification: `unverified` · `logic-tested` · `android-device-required`

---

## Screens & modules

| # | Original feature | Original source | Expo route / component | API | Barcode | Status | Verification |
|---|---|---|---|---|---|---|---|
| 1 | Login | `LoginScreen` | `app/login.tsx` | Demo only | No | parity | logic-tested |
| 2 | Home dashboard | `HomeScreen` | `app/index.tsx` | Demo stats | No | parity | logic-tested |
| 3 | Production hub | `production` → `ModuleProcessesScreen` | `app/production.tsx` | None | Downstream | parity | logic-tested |
| 4 | Inbound hub | `inbound` → `ModuleProcessesScreen` | `app/inbound.tsx` | None | Downstream | parity (+ Receiving entry restored from `ReceivingScreens`) | logic-tested |
| 5 | Outbound hub | `outbound` → `ModuleProcessesScreen` | `app/outbound.tsx` | None | Downstream | parity | logic-tested |
| 6 | Physical Inventory hub | `physical-inventory` → hub | `app/physical-inventory.tsx` | None | Downstream | parity | logic-tested |
| 7 | Internal hub | `internal` → hub | `app/internal.tsx` | None | Downstream | parity | logic-tested |
| 8 | WO Selection hub | `wo-selection` → hub | `app/wo-selection.tsx` | None | Downstream | parity | logic-tested |
| 9 | Module ops: Picking | Unlocked → `picking-methods` | Module hub cards | None | Yes | parity | logic-tested |
| 10 | Module ops: Packing | Locked “Not implemented” | Module hub cards | None | No | intentional-locked | logic-tested |
| 11 | Module ops: Loading | Locked “Not implemented” | Module hub cards | None | No | intentional-locked | logic-tested |
| 12 | Picking Methods list | `PickingMethodsScreen` + `PICKING_METHODS` | `app/picking-methods.tsx` | None | No | parity | logic-tested |
| 13 | Picking System Guided | `continueWithMethod` → details (no WO gate) | methods → details | Demo doc | In execution | parity | logic-tested |
| 14 | System Guided by Queue | same pattern | methods → details | Demo doc | In execution | parity | logic-tested |
| 15 | Picking by WR | same pattern | methods → details | Demo doc | In execution | parity | logic-tested |
| 16 | Picking by WO | → `scan-wo` gate → details → execution | `scan-wo` → details → execution | Demo doc | Required | parity | logic-tested / camera android-device-required |
| 17 | Picking by HU | same as non-WO methods | methods → details | Demo doc | In execution | parity | logic-tested |
| 18 | Scan WO | `ScanWOScreen` + `warehouseOrderEntry` | `app/scan-wo.tsx` | Demo WO | Required | parity | camera android-device-required |
| 19 | Picking Details | `PickingDetailsScreen` | `app/picking-details.tsx` | Demo rows | No | parity | logic-tested |
| 20 | Picking Execution | `PickingExecutionScreen` | `app/picking-execution.tsx` | Demo validation | Required | parity | camera android-device-required |
| 21 | Verification Summary | Inside execution when complete | same | Demo | No | parity | logic-tested |
| 22 | Picking Complete + Print | `PickingCompleteScreen` (`window.print`) | `app/picking-complete.tsx` | None | No | parity (Print = native share/print sheet; no SAP) | logic-tested |
| 23 | Receiving Scan PO | `ScanPurchaseOrderScreen` | `app/scan-po.tsx` | Demo | Required | parity | camera android-device-required |
| 24 | Receiving Execution | `ReceivingExecutionScreen` | `app/receiving-execution.tsx` | Demo | Required | parity | camera android-device-required |
| 25 | Goods Receipt | `GoodsReceiptScreen` | `app/goods-receipt.tsx` | **No SAP GR** | No | parity | logic-tested |
| 26 | Scan tab | BottomNav → `scan-wo` | `BottomNav` | — | Yes | parity | logic-tested |
| 27 | Activity tab | `ActivityScreen` | `app/activity.tsx` | Static | No | parity | logic-tested |
| 28 | Profile tab | `ProfileScreen` | `app/profile.tsx` | None | No | parity | logic-tested |
| 29 | Legacy step screens | `scan-source-bin` … | Not primary path | — | — | documented legacy | — |
| 30 | Receiving from Inbound | **Orphaned** in canonical App (screens exist, no home link) | Inbound “Receiving by PO” | Demo | Yes | restored in Expo from `ReceivingScreens` | logic-tested |

---

## Picking method behavior (original)

From `continueWithMethod` in `frontend/src/App.tsx`:

| Method | Entry | WO gate | Execution start |
|---|---|---|---|
| `by-wo` | `scan-wo` → details → execution | Required (`pickingRouteGuard`) | WO already verified |
| `system-guided`, `queue`, `by-wr`, `by-hu` | details → execution | Skipped | Starts at first required step (`wo` in demo doc) |

All methods share `getActivePickingDocument()` demo document today. Titles use `getPickingMethodMeta(method).flowTitle`.

---

## Scanner

| Item | Original | Expo |
|---|---|---|
| Engine | `getUserMedia` + BarcodeDetector / ZXing | `expo-camera` `CameraView` |
| Formats | qr, code128/39/93, ean, upc, itf, codabar, data_matrix | Same except data_matrix (not in Expo BarcodeType) |
| Duplicate gate | `safeBarcodeScanner` session | Ported |
| Pause off-screen | stop tracks on unmount | `active` + `useIsFocused` |
| Runtime | Browser / Capacitor WebView | Expo Go includes `expo-camera` barcode APIs |

**Camera decode on a physical Android device remains unverified until manually tested.**

---

## Gaps closed in this pass

1. All six home modules open process hubs (not silent no-ops).
2. Non-WO picking methods no longer incorrectly force the dedicated Scan WO gate.
3. Picking session / flow title / WO gate aligned with original `pickingRouteGuard`.
4. Feature-parity doc rewritten against `frontend/src` (not the nested older copy).
