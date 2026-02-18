export interface BenchmarkStats {
  count: number;
  mean: number;
  median: number;
  p10: number;
  p90: number;
  stddev: number;
  min: number;
  max: number;
}

export function computeStats(values: number[]): BenchmarkStats {
  if (values.length === 0) {
    return { count: 0, mean: 0, median: 0, p10: 0, p90: 0, stddev: 0, min: 0, max: 0 };
  }

  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;

  const sum = sorted.reduce((a, b) => a + b, 0);
  const mean = sum / n;

  const median = n % 2 === 0 ? (sorted[n / 2 - 1]! + sorted[n / 2]!) / 2 : sorted[Math.floor(n / 2)]!;

  const p10 = sorted[Math.max(0, Math.floor(n * 0.1))]!;
  const p90 = sorted[Math.min(n - 1, Math.floor(n * 0.9))]!;

  const variance = sorted.reduce((acc, v) => acc + (v - mean) ** 2, 0) / n;
  const stddev = Math.sqrt(variance);

  return {
    count: n,
    mean,
    median,
    p10,
    p90,
    stddev,
    min: sorted[0]!,
    max: sorted[n - 1]!,
  };
}

export function formatStats(stats: BenchmarkStats, label: string): string {
  const fmt = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 1 });
  return `${label.padEnd(18)} mean=${fmt(stats.mean).padStart(12)} median=${fmt(stats.median).padStart(12)} p10=${fmt(stats.p10).padStart(12)} p90=${fmt(stats.p90).padStart(12)}`;
}
