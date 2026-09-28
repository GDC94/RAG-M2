export function formatTimingMilliseconds(seconds: number): string {
  return `${Math.round(seconds * 1000)} ms`;
}
