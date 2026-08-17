export type ScatterStage = 'todo' | 'in_progress' | 'dev_test' | 'qa_test' | 'done';

const SCATTER_STAGE = {
  todo: {
    focusX: 88,
    focusY: 32,
    spread: 0.66,
    bounceSpread: 0.52,
  },
  in_progress: {
    focusX: 90,
    focusY: 32,
    spread: 0.4,
    bounceSpread: 0.36,
  },
  dev_test: {
    focusX: 96,
    focusY: 92,
    spread: 0.24,
    bounceSpread: 0.2,
  },
  qa_test: {
    focusX: 97,
    focusY: 94,
    spread: 0.07,
    bounceSpread: 0.12,
  },
  done: {
    focusX: 96,
    focusY: 92,
    spread: 0,
    bounceSpread: 0.3,
  },
} as const;

function hashString(input: string): number {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function mulberryNext(seed: number): { seed: number; value: number } {
  const nextSeed = (Math.imul(1664525, seed) + 1013904223) >>> 0;
  return { seed: nextSeed, value: nextSeed / 4294967296 };
}

function clusterToward(
  x: number,
  y: number,
  focusX: number,
  focusY: number,
  spread: number,
) {
  return {
    x: focusX + (x - focusX) * spread,
    y: focusY + (y - focusY) * spread,
  };
}

export function scatterLightsFromId(
  id: string,
  stage: ScatterStage,
  options: { loose?: boolean } = {},
) {
  const preset = SCATTER_STAGE[stage];
  const loose = Boolean(options.loose);
  const focusX = loose ? 50 : preset.focusX;
  const focusY = loose ? 48 : preset.focusY;
  const spread = loose ? 0.94 : preset.spread;
  let seed = hashString(id);
  const next = () => {
    const step = mulberryNext(seed);
    seed = step.seed;
    return step.value;
  };

  return Array.from({ length: 6 }, () => {
    const raw = clusterToward(
      8 + next() * 84,
      10 + next() * 80,
      focusX,
      focusY,
      spread,
    );
    return {
      x: raw.x,
      y: raw.y,
      w: 1.7 + next() * 2.5,
      h: 1.3 + next() * 2.1,
      o: 0.62 + next() * 0.5,
    };
  });
}

export function scatterBounceFromId(id: string, stage: ScatterStage) {
  const { focusX, focusY, bounceSpread } = SCATTER_STAGE[stage];
  let seed = hashString(`${id}:bounce`);
  const next = () => {
    const step = mulberryNext(seed);
    seed = step.seed;
    return step.value;
  };

  const raw = clusterToward(
    10 + next() * 80,
    12 + next() * 76,
    focusX,
    focusY,
    bounceSpread,
  );

  return {
    x: raw.x,
    y: raw.y,
    o: 0.07 + next() * 0.09,
  };
}
