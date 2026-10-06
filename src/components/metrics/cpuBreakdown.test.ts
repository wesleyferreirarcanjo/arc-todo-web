import { describe, expect, it } from 'vitest';
import type { MetricsResource, MetricsSeries, MetricsSeriesPoint } from '../../types/metrics';
import { cpuBreakdown } from './cpuBreakdown';

function point(partial: Partial<MetricsSeriesPoint>): MetricsSeriesPoint {
  return {
    t: '2026-10-05T11:00:00.000Z',
    cpuMcores: null,
    memBytes: null,
    memLimitBytes: null,
    netRxBps: null,
    netTxBps: null,
    diskReadBps: null,
    diskWriteBps: null,
    diskUsedBytes: null,
    restarts: null,
    oomKills: null,
    cpuStealMcores: null,
    ...partial,
  };
}

function seriesFrom(
  points: Array<Partial<MetricsSeriesPoint> | Omit<MetricsSeriesPoint, 'cpuStealMcores'>>,
): MetricsSeries {
  return {
    resolutionSecs: 15,
    points: points.map((partial) => {
      if ('cpuStealMcores' in partial) {
        return point(partial);
      }
      const { cpuStealMcores: _drop, ...rest } = point(partial);
      return rest as MetricsSeriesPoint;
    }),
  };
}

function resource(project: string | null, avgMcores: number): MetricsResource {
  return {
    resourceId: 1,
    type: 'application',
    project,
    environment: null,
    resource: 'app',
    service: 'api',
    cpu: { avgMcores, p95Mcores: null, maxMcores: null },
    mem: { avgBytes: null, p95Bytes: null, maxBytes: null, limitBytes: null },
    cpuSharePct: null,
    memSharePct: null,
    net: { rxBps: null, txBps: null },
    disk: { readBps: null, writeBps: null },
    restarts: null,
    oomKills: null,
    lastSeenAt: null,
    cpuNowMcores: null,
    memNowBytes: null,
    cpuNowSharePct: null,
    memNowSharePct: null,
  };
}

const resources = [
  resource('arc-todo', 700),
  resource(null, 500),
];

describe('cpuBreakdown', () => {
  it('splits host CPU into apps, system, steal, and other as machine percent', () => {
    expect(
      cpuBreakdown({
        series: seriesFrom([
          { cpuMcores: 2000, cpuStealMcores: 600 },
          { cpuMcores: 1990, cpuStealMcores: 600 },
        ]),
        resources,
        cpuCount: 2,
      }),
    ).toEqual({
      hostPct: 99.75,
      appsPct: 35,
      systemPct: 25,
      stealPct: 30,
      otherPct: 9.75,
    });
  });

  it('puts steal remainder into other when cpuStealMcores is missing', () => {
    expect(
      cpuBreakdown({
        series: seriesFrom([{ cpuMcores: 2000 }, { cpuMcores: 1990 }]),
        resources,
        cpuCount: 2,
      }),
    ).toEqual({
      hostPct: 99.75,
      appsPct: 35,
      systemPct: 25,
      stealPct: null,
      otherPct: 39.75,
    });
  });

  it('clamps other to 0 when apps, system, and steal exceed host', () => {
    expect(
      cpuBreakdown({
        series: seriesFrom([{ cpuMcores: 1000, cpuStealMcores: 600 }]),
        resources: [resource('arc-todo', 700)],
        cpuCount: 2,
      }),
    ).toMatchObject({ otherPct: 0 });
  });

  it('returns null when series is missing, every cpuMcores is null, or cpuCount is unusable', () => {
    const withCpu = seriesFrom([{ cpuMcores: 2000, cpuStealMcores: 600 }]);
    expect(cpuBreakdown({ series: null, resources, cpuCount: 2 })).toBeNull();
    expect(
      cpuBreakdown({
        series: seriesFrom([{ cpuMcores: null }, { cpuMcores: null }]),
        resources,
        cpuCount: 2,
      }),
    ).toBeNull();
    expect(cpuBreakdown({ series: withCpu, resources, cpuCount: null })).toBeNull();
    expect(cpuBreakdown({ series: withCpu, resources, cpuCount: 0 })).toBeNull();
  });
});
