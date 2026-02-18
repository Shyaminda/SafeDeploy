import { loadCatalog } from "../catalog/catalogStore.js";
import { loadIncidents } from "../incidents/store.js";

export function generateReliabilityReport(): string {
  const services = loadCatalog();
  const incidents = loadIncidents();

  return services
    .map((service) => {
      const activeIncident = incidents.find(
        (i) =>
          i.service === service.name &&
          !["resolved", "postmortem-complete"].includes(i.currentState),
      );

      return `
## ${service.name}

Owner: ${service.owner}
Active Incident: ${activeIncident ? activeIncident.id : "None"}

`;
    })
    .join("\n");
}
