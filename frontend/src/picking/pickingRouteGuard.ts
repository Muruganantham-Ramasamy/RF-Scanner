/**
 * Route guard for Picking-by-WO.
 * Flow: Scan Warehouse Order → Picking Details → remaining scanners.
 * Details and execution require a successfully verified Warehouse Order.
 */

export type PickingSessionGate = {
  woVerified: boolean;
  verifiedWo: string | null;
};

export function createPickingSessionGate(): PickingSessionGate {
  return { woVerified: false, verifiedWo: null };
}

export function markWoVerified(
  _gate: PickingSessionGate,
  wo: string,
): PickingSessionGate {
  return { woVerified: true, verifiedWo: wo };
}

export function clearPickingSessionGate(): PickingSessionGate {
  return createPickingSessionGate();
}

export function canEnterPickingDetails(gate: PickingSessionGate): boolean {
  return gate.woVerified === true && Boolean(gate.verifiedWo);
}

/** Screens that require WO verification before entry. */
export type WoGuardedScreen = "picking-details" | "picking-execution";

export function isWoGuardedScreen(screen: string): screen is WoGuardedScreen {
  return screen === "picking-details" || screen === "picking-execution";
}

/**
 * Resolve navigation for Picking-by-WO.
 * Unverified sessions are forced to the WO scanner.
 */
export function resolvePickingNavigation(
  target: string,
  gate: PickingSessionGate,
): string {
  if (isWoGuardedScreen(target) && !canEnterPickingDetails(gate)) {
    return "scan-wo";
  }
  return target;
}
