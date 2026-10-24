import { cleanup, render } from '@testing-library/react';
import { createElement, type ReactElement } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import {
  AnalyticsIcon,
  MakeIcon,
  MetricsIcon,
  TasksIcon,
} from '../../components/icons';
import { primaryNav } from './primaryNav';

function geometry(node: ReactElement): string {
  const { container } = render(node);
  return [...container.querySelectorAll('path, rect, circle, ellipse')]
    .map((el) => el.outerHTML)
    .join('');
}

function linkByTo(to: string) {
  for (const entry of primaryNav) {
    if (entry.kind === 'link' && entry.to === to) return entry;
    if (entry.kind === 'group') {
      const child = entry.children.find((item) => item.to === to);
      if (child) return child;
    }
  }
  return undefined;
}

afterEach(cleanup);

describe('primaryNav destination glyphs', () => {
  it('keeps All tasks as four squares and Make as a different mark', () => {
    const allTasks = linkByTo('/board');
    const make = primaryNav.find((entry) => entry.kind === 'group' && entry.id === 'make');
    expect(allTasks?.icon).toBe(TasksIcon);
    expect(make && make.kind === 'group' ? make.icon : undefined).toBe(MakeIcon);

    const tasksGeom = geometry(createElement(TasksIcon));
    const makeGeom = geometry(createElement(MakeIcon));
    expect(tasksGeom).toContain('<rect');
    expect(tasksGeom).not.toEqual(makeGeom);
    expect(makeGeom).not.toContain('<rect');
  });

  it('keeps Analytics as rising bars and Metrics as a different mark', () => {
    const analytics = linkByTo('/analytics');
    const metrics = linkByTo('/metrics');
    expect(analytics?.icon).toBe(AnalyticsIcon);
    expect(metrics?.icon).toBe(MetricsIcon);

    const analyticsGeom = geometry(createElement(AnalyticsIcon));
    const metricsGeom = geometry(createElement(MetricsIcon));
    expect(analyticsGeom).toContain('M4.4 14.2');
    expect(analyticsGeom).not.toEqual(metricsGeom);
    expect(metricsGeom).not.toContain('M4.4 14.2');
  });
});
