export function today() { return new Date().toISOString().split("T")[0]; }

export function toDisplayWeight(value: number | undefined, isImperial: boolean) {
  return value == null ? "" : String(isImperial ? value / 28.349523125 : value);
}