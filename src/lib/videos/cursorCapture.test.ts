import { describe, expect, it } from 'vitest';
import { startCursorCapture } from './cursorCapture';

interface FakeWindow {
  innerWidth: number;
  innerHeight: number;
  target: EventTarget;
  listenerOptions: unknown[];
}

function makeFakeWindow(): FakeWindow {
  const target = new EventTarget();
  const listenerOptions: unknown[] = [];
  const addEventListener = target.addEventListener.bind(target);
  target.addEventListener = ((type: string, listener: unknown, options: unknown) => {
    listenerOptions.push(options);
    addEventListener(type, listener as EventListener, options);
  }) as EventTarget['addEventListener'];
  const fake: FakeWindow = { innerWidth: 1000, innerHeight: 500, target, listenerOptions };
  const win = target as EventTarget & { innerWidth: number; innerHeight: number };
  win.innerWidth = fake.innerWidth;
  win.innerHeight = fake.innerHeight;
  return fake;
}

function asWindow(fake: FakeWindow): Window {
  return fake.target as unknown as Window;
}

function pointer(
  target: EventTarget,
  type: 'pointermove' | 'pointerdown',
  x: number,
  y: number,
) {
  target.dispatchEvent(new MouseEvent(type, { clientX: x, clientY: y }));
}

describe('startCursorCapture', () => {
  it('throttles pointermove samples to minIntervalMs', () => {
    const fake = makeFakeWindow();
    let t = 0;
    const capture = startCursorCapture(0, {
      target: asWindow(fake),
      now: () => t,
      minIntervalMs: 33,
    });

    pointer(fake.target, 'pointermove', 500, 250);
    t = 10;
    pointer(fake.target, 'pointermove', 600, 300);
    t = 40;
    pointer(fake.target, 'pointermove', 700, 350);

    const track = capture.stop();
    expect(track.samples).toHaveLength(2);
    expect(track.samples[0]).toEqual([0, 0.5, 0.5]);
    expect(track.samples[1]).toEqual([40, 0.7, 0.7]);
  });

  it('normalizes to viewport, rounds to 4 decimals, and clamps to 0-1', () => {
    const fake = makeFakeWindow();
    let t = 0;
    const capture = startCursorCapture(0, {
      target: asWindow(fake),
      now: () => t,
      minIntervalMs: 0,
    });

    pointer(fake.target, 'pointermove', 333, 167);
    t = 5;
    pointer(fake.target, 'pointermove', 1200, -50);

    const track = capture.stop();
    expect(track.samples[0]).toEqual([0, 0.333, 0.334]);
    expect(track.samples[1]).toEqual([5, 1, 0]);
  });

  it('records pointerdown clicks without throttling', () => {
    const fake = makeFakeWindow();
    let t = 0;
    const capture = startCursorCapture(100, {
      target: asWindow(fake),
      now: () => t,
      minIntervalMs: 33,
    });

    pointer(fake.target, 'pointerdown', 100, 100);
    t = 1;
    pointer(fake.target, 'pointerdown', 200, 200);

    const track = capture.stop();
    expect(track.clicks).toEqual([
      [-100, 0.1, 0.2],
      [-99, 0.2, 0.4],
    ]);
  });

  it('removes listeners on stop and reports the viewport', () => {
    const fake = makeFakeWindow();
    let t = 0;
    const capture = startCursorCapture(0, {
      target: asWindow(fake),
      now: () => t,
    });

    const track = capture.stop();
    expect(track.viewport).toEqual({ width: 1000, height: 500 });
    expect(track.samples).toEqual([]);

    t = 100;
    pointer(fake.target, 'pointermove', 500, 250);
    pointer(fake.target, 'pointerdown', 500, 250);
    expect(track.samples).toEqual([]);
    expect(track.clicks).toEqual([]);
  });

  it('registers listeners with capture + passive on the window', () => {
    const fake = makeFakeWindow();
    const capture = startCursorCapture(0, {
      target: asWindow(fake),
      now: () => 0,
    });

    expect(fake.listenerOptions).toEqual([
      { capture: true, passive: true },
      { capture: true, passive: true },
    ]);
    capture.stop();
  });
});
