import { ZodError } from "zod";
import { logger } from "../../../lib/logger.js";
import { proposeBlockPromotion } from "../actions/proposeBlockPromotion.js";
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
import { mapZodIssuesToPolicyViolations } from "../policy/zodToPolicyMapper.js";

export async function evaluateDemoService(): Promise<void> {
  let service;

  try {
    service = loadService("demo-app");
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      logger.error({
        message: "[GOVERNANCE] Catalog validation failed",
        issues: error.issues,
      });

      const violations = mapZodIssuesToPolicyViolations(
        error.issues,
        "demo-app",
      );

      const policyIncident = createPolicyViolationIncident(violations);
      proposeBlockPromotion(policyIncident.id, "demo-app", violations, {
        total: 0,
        remaining: 0,
        burnRate: 0,
        consumed: 0,
      });

      return;
    }

    throw error;
  }

  const latencySLI = DEMO_APP_SLIS.find(
    (s) => s.name === "request_latency_p95",
  );

  if (!latencySLI) {
    throw new Error("Latency SLI not found");
  }

  const latencySLO = DEMO_APP_SLOS.find((s) => s.name === "latency-p95-300ms");

  if (!latencySLO) {
    throw new Error("Latency SLO not found");
  }

  const latencyResult = await queryPrometheus(latencySLI.promQuery);
  //const latencyResult = 0.1;

  let latencyMs = 0;

  if (!latencyResult) {
    logger.warn({
      message: "No latency metrics returned from Prometheus",
    });
  } else {
    const latencyValue = Number(latencyResult[0].value[1]);
    latencyMs = latencyValue * 1000;

    logger.info({
      message: `Observed latency p95 = ${latencyMs}ms`,
    });
  }

  const availabilitySLO = DEMO_APP_SLOS.find(
    (s) => s.name === "availability-99.9",
  );

  if (!availabilitySLO) {
    throw new Error("Availability SLO not found");
  }

  const totalRequests = 10000;

  let simulatedFailures = 0;

  if (latencyMs > latencySLO.target) {
    const degradationFactor = latencyMs / latencySLO.target;

    if (degradationFactor > 2) {
      simulatedFailures = 200;
    } else if (degradationFactor > 1.5) {
      simulatedFailures = 50;
    } else {
      simulatedFailures = 10;
    }
  }

  const budget = calculateErrorBudget(
    availabilitySLO.target,
    totalRequests,
    simulatedFailures,
    1 / 6,
  );

  const severity = evaluateBurnRate(
    budget.burnRate,
    budget.remaining / budget.total,
  );

  const explanation = explainBurnDecision(severity);

  logger.info({
    message: `[DECISION] availability severity=${severity} | reason=${explanation}`,
  });

  const gate = evaluatePromotion(service, {
    total: budget.total,
    remaining: budget.remaining,
    burnRate: budget.burnRate,
  });

  if (!gate.allowed) {
    const policyIncident = createPolicyViolationIncident(gate.violations);
    proposeBlockPromotion(
      policyIncident.id,
      "demo-app",
      gate.violations,
      budget,
    );
    return;
  }

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

      saveIncident(investigating);

      saveEvidence(investigating.id, "decision.json", {
        burnRate: budget.burnRate,
        remainingBudget: budget.remaining,
        totalBudget: budget.total,
        severity,
        explanation,
        timestamp: new Date().toISOString(),
      });

      if (severity === "exhausted") {
        proposeRollback(investigating, budget, explanation);
      }
    } else {
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
        "Availability SLO returned to healthy state",
        "system",
      );

      saveIncident(resolved);

      saveEvidence(resolved.id, "resolution.json", {
        resolvedAt: new Date().toISOString(),
      });
    }
  }
}
