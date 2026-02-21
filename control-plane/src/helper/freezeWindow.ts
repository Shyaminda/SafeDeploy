import type { ServiceHealthState } from "../heath-state/serviceHealthState.js";
import {
  loadServiceHealthState,
  saveServiceHealthState,
} from "../heath-state/store.js";

export function updateFreezeWindow(
  service: string,
  freezeDurationMs: number,
): void {
  const now = Date.now();

  const existing = loadServiceHealthState(service);

  const newFreezeUntil = new Date(now + freezeDurationMs).toISOString();

  let freezeUntil = newFreezeUntil;

  // prevent shortening freeze window
  if (existing?.freezeUntil) {
    const existingTime = new Date(existing.freezeUntil).getTime();

    if (existingTime > now) {
      // keep longer freeze
      freezeUntil =
        existingTime > now + freezeDurationMs
          ? existing.freezeUntil
          : newFreezeUntil;
    }
  }

  const state: ServiceHealthState = {
    service,
    status: "frozen",
    lastEvaluatedAt: new Date().toISOString(),
    lastExhaustedAt: existing?.lastExhaustedAt ?? new Date().toISOString(),
    freezeUntil,
  };

  saveServiceHealthState(state);
}
