export function isBurningFast(burnRate: number): boolean {
  return burnRate > 2;
}

export function isBurningSlow(burnRate: number): boolean {
  return burnRate > 1;
}