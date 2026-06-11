export const FLOW_SPEED_MIN  = 0.5;
export const FLOW_SPEED_MAX  = 5.0;
export const FLOW_SPEED_STEP = 0.25;

const STORAGE_KEY = 'zankyo.flowSpeed';

function clamp(v: number): number {
  return Math.min(FLOW_SPEED_MAX, Math.max(FLOW_SPEED_MIN, v));
}

let _flowSpeed: number = (() => {
  const stored = parseFloat(localStorage.getItem(STORAGE_KEY) ?? '');
  return isFinite(stored) ? clamp(stored) : 1.0;
})();

export function getFlowSpeed(): number { return _flowSpeed; }

export function adjustFlowSpeed(delta: number): number {
  _flowSpeed = clamp(Math.round((_flowSpeed + delta) / FLOW_SPEED_STEP) * FLOW_SPEED_STEP);
  localStorage.setItem(STORAGE_KEY, String(_flowSpeed));
  return _flowSpeed;
}
