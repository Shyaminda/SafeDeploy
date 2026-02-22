import { loadCatalog } from "../catalog/catalogStore.js";
import { loadIncidents } from "../incidents/store.js";
import { loadBudgetWindow } from "../budget-state/store.js";
import { loadServiceHealthState } from "../health-state/store.js";
import { loadProposals } from "../actions/store.js";

export function generateReliabilityReport(): string {
  const services = loadCatalog();
  const incidents = loadIncidents();
  const proposals = loadProposals();

  return services
    .map((service) => {
      const budget = loadBudgetWindow(service.name);
      const health = loadServiceHealthState(service.name);

      const activeIncident = incidents.find(
        (i) =>
          i.service === service.name &&
          !["resolved", "postmortem-complete"].includes(i.currentState),
      );

      const activeProposals = proposals.filter(
        (p) =>
          p.status === "proposed" &&
          incidents.some(
            (i) => i.id === p.incidentId && i.service === service.name,
          ),
      );

      const remaining = budget
        ? (budget.allowed - budget.consumedSoFar).toFixed(2)
        : "N/A";

      const freezeActive =
        health?.freezeUntil &&
        new Date(health.freezeUntil).getTime() > Date.now();

      return `
==================================================
SERVICE: ${service.name}
Owner: ${service.owner}

Error Budget:
  Remaining: ${remaining} / ${budget?.allowed ?? "N/A"}
  Window Start: ${budget?.windowStart ?? "N/A"}

Burn Rate:
  (Cumulative) ${budget ? (budget.consumedSoFar / budget.allowed).toFixed(2) : "N/A"}

Freeze Status:
  ${freezeActive ? `Active until ${health?.freezeUntil}` : "Not frozen"}

Active Incident:
  ${
    activeIncident
      ? `${activeIncident.id} (${activeIncident.currentState}, severity: ${activeIncident.severity})`
      : "None"
  }

Active Proposals:
  ${
    activeProposals.length > 0
      ? activeProposals.map((p) => `- ${p.id} (${p.type})`).join("\n  ")
      : "None"
  }
==================================================
`;
    })
    .join("\n");
}
