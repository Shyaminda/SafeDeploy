import { logger } from "../../../lib/logger.js";
import { proposeRollback } from "../actions/proposeRollback.js";
import { loadService } from "../catalog/catalogStore.js";
import { evaluateBurnRate } from "../decisions/burnRate.js";
import { explainBurnDecision } from "../decisions/explain.js";
import { saveEvidence } from "../evidence/store.js";
import { createPolicyViolationIncident } from "../helper/createPolicyViolation.js";
import type { Incident } from "../incidents/incident.js";
import { transitionIncident } from "../incidents/lifecycle.js";
import { loadIncidents, saveIncident } from "../incidents/store.js";
import { queryPrometheus } from "../observability/prometheus.js";
import { evaluatePromotion } from "../policy/promotionGate.js";
import { calculateErrorBudget } from "../slo/errorBudget.js";
import { DEMO_APP_SLIS } from "../slo/sli.js";
import { DEMO_APP_SLOS } from "../slo/slo.js";

export async function evaluateDemoService(): Promise<void> {
  const latencySLI = DEMO_APP_SLIS.find(
    (s) => s.name === "request_latency_p95",
  );
  if (!latencySLI) {
    throw new Error("SLI 'request_latency_p95' not found in configuration");
  }

  const latencyResult = await queryPrometheus(latencySLI.promQuery);
  if (!latencyResult?.length) {
    throw new Error("No metrics data returned from Prometheus");
  }

  const latencyValue = Number(latencyResult[0].value[1]);
  const latencyMs = latencyValue * 1000;

  const latencySLO = DEMO_APP_SLOS.find((s) => s.name.includes("latency"));
  if (!latencySLO) {
    throw new Error("SLO for latency not found in configuration");
  }
  const sloTarget = latencySLO.target;

  const totalRequests = 10000;
  const badEvents = latencyMs > sloTarget ? 50 : 0;

  const budget = calculateErrorBudget(0.999, totalRequests, badEvents, 1 / 30);

  const severity = evaluateBurnRate(
    budget.burnRate,
    budget.remaining / budget.total,
  );

  const explanation = explainBurnDecision(severity);

  logger.info({
    message: `[DECISION] severity=${severity} | reason=${explanation}`,
  });

  const incidents = loadIncidents();

  const activeIncident = incidents.find(
    (i) =>
      i.service === "demo-app" &&
      !["resolved", "postmortem-complete"].includes(i.currentState),
  );

  if (severity === "fast-burn" || severity === "exhausted") {
    if (!activeIncident) {
      const incident: Incident = {
        id: `incident-${Date.now()}`,
        service: "demo-app",
        severity,
        currentState: "detected",
        timeline: [],
        createdAt: new Date().toISOString(),
      };

      const investigating = transitionIncident(
        incident,
        "investigating",
        explanation,
        "system",
      );

      logger.info({
        message: `[INCIDENT] ${investigating.id} transitioned to investigating`,
      });

      saveIncident(investigating);

      saveEvidence(investigating.id, "decision.json", {
        burnRate: budget.burnRate,
        remainingBudget: budget.remaining,
        totalBudget: budget.total,
        severity,
        explanation,
        timestamp: new Date().toISOString(),
      });

      saveEvidence(investigating.id, "slo.json", {
        metric: "request_latency_p95",
        observedLatencyMs: latencyMs,
        targetMs: sloTarget,
        timestamp: new Date().toISOString(),
      });

      saveEvidence(investigating.id, "budget.json", {
        total: budget.total,
        remaining: budget.remaining,
        consumed: budget.consumed,
        burnRate: budget.burnRate,
        timestamp: new Date().toISOString(),
      });

      if (severity === "exhausted") {
        proposeRollback(investigating, budget, explanation);
      }
    } else {
      logger.info({
        message: `[INCIDENT] ${activeIncident.id} already active — continuing investigation`,
      });

      if (severity === "exhausted") {
        proposeRollback(activeIncident, budget, explanation);
      }
    }
  }

  if (severity === "normal") {
    const mitigatedIncident = incidents.find(
      (i) => i.service === "demo-app" && i.currentState === "mitigated",
    );

    if (mitigatedIncident) {
      const resolved = transitionIncident(
        mitigatedIncident,
        "resolved",
        "SLO returned to healthy state after mitigation",
        "system",
      );

      saveIncident(resolved);

      saveEvidence(resolved.id, "resolution.json", {
        resolvedAt: new Date().toISOString(),
        reason: "SLO returned to healthy state after mitigation",
      });

      logger.info({
        message: `[INCIDENT] ${resolved.id} resolved`,
      });
    }
  }
  const service = loadService("demo-app");
  const isBudgetHealthy = severity !== "fast-burn" && severity !== "exhausted";

  const promotionGate = evaluatePromotion(service, isBudgetHealthy);

  if (!promotionGate.allowed) {
    logger.warn({
      message: "[GOVERNANCE] Promotion blocked",
      violations: promotionGate.violations,
    });

    createPolicyViolationIncident(promotionGate.violations);

    // Optionally create policy violation incident here

    return;
  }
}
