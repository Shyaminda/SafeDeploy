export type ServiceHealthStatus =
  | "healthy"
  | "degraded"
  | "unhealthy"
  | "frozen";

export interface ServiceHealthState {
  service: string;
  status: ServiceHealthStatus;
  lastEvaluatedAt: string;
  lastExhaustedAt: string;
  freezeUntil?: string;
}
