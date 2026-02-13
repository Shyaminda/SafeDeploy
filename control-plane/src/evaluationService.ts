import { logger } from "../../lib/logger.js";
import { proposeRollback } from "./actions/proposeRollback.js";
import { evaluateBurnRate } from "./decisions/burnRate.js";
import { explainBurnDecision } from "./decisions/explain.js";
import type { Incident } from "./incidents/incident.js";
import { transitionIncident } from "./incidents/lifecycle.js";
import { loadIncidents, saveIncident } from "./incidents/store.js";
import { queryPrometheus } from "./observability/prometheus.js";
import { calculateErrorBudget } from "./slo/errorBudget.js";
import { DEMO_APP_SLIS } from "./slo/sli.js";
import { DEMO_APP_SLOS } from "./slo/slo.js";

export async function evaluateDemoService() {
  const latencyResult = await queryPrometheus(
    DEMO_APP_SLIS.find((s) => s.name === "request_latency_p95")!.promQuery,
  );

  const latencyValue = Number(latencyResult[0].value[1]);

  const latencyMs = latencyValue * 1000;

  const latencySLO = DEMO_APP_SLOS.find((s) => s.name.includes("latency"))!;
  const sloTarget = latencySLO.target;

  // Fake request counts for now (acceptable in Week 03)
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
}
