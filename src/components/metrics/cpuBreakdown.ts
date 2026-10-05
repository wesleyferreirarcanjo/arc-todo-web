import type { MetricsResource, MetricsSeries } from '../../types/metrics';
import { mcoresToMachinePct } from './format';

export type CpuBreakdown = {
  hostPct: number;
  appsPct: number;
  systemPct: number;
  otherPct: number;
  stealPct: number | null;
};

function meanNonNull(values: Array<number | null | undefined>): number | null {
  const nums = values.filter((value): value is number => value != null);
  if (nums.length === 0) {
    return null;
  }
  return nums.reduce((sum, value) => sum + value, 0) / nums.length;
}

export function cpuBreakdown({
  series,
  resources,
  cpuCount,
}: {
  series: MetricsSeries | null;
  resources: MetricsResource[];
  cpuCount: number | null | undefined;
}): CpuBreakdown | null {
  if (series == null || cpuCount == null || cpuCount <= 0) {
    return null;
  }
  // ponytail: window host average is the mean of bucket averages (unequal bucket
  // fill skews it slightly; upgrade path is a server-side window average).
  const host = meanNonNull(series.points.map((point) => point.cpuMcores));
  if (host == null) {
    return null;
  }
  const steal = meanNonNull(series.points.map((point) => point.cpuStealMcores ?? null));
  let apps = 0;
  let system = 0;
  for (const row of resources) {
    const mcores = row.cpu.avgMcores ?? 0;
    if (row.project != null) {
      apps += mcores;
    } else {
      system += mcores;
    }
  }
  const other = Math.max(0, host - (steal ?? 0) - apps - system);
  const hostPct = mcoresToMachinePct(host, cpuCount);
  const appsPct = mcoresToMachinePct(apps, cpuCount);
  const systemPct = mcoresToMachinePct(system, cpuCount);
  const otherPct = mcoresToMachinePct(other, cpuCount);
  if (hostPct == null || appsPct == null || systemPct == null || otherPct == null) {
    return null;
  }
  return {
    hostPct,
    appsPct,
    systemPct,
    otherPct,
    stealPct: steal == null ? null : mcoresToMachinePct(steal, cpuCount),
  };
}
