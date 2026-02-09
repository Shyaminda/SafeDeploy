export interface ErrorBudget {
	total: number;
	remaining: number;
	consumed: number;
	burnRate: number; // e.g., 0.01 for 1% burn rate
}

export function calculateErrorBudget(
	sloTarget: number,
	totalRequests: number,
	badEvents: number,
	timeWindowRatio: number
): ErrorBudget {
	const allowedErrors = totalRequests * (1 - sloTarget);
	const consumedErrors = badEvents;
	const remainingErrors = Math.max(allowedErrors - consumedErrors, 0);

	const burnRate = consumedErrors / (allowedErrors * timeWindowRatio);

	return {
		total: allowedErrors,
		remaining: remainingErrors,
		consumed: consumedErrors,
		burnRate: burnRate
	}
}