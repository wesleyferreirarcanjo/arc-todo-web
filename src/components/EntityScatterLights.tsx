import { useMemo, type CSSProperties } from 'react';
import {
  scatterLightsFromId,
  type ScatterStage,
} from '../lib/ui/scatterLights';

export function EntityScatterLights({
  seed,
  stage = 'todo',
  loose = true,
}: {
  seed: string;
  stage?: ScatterStage;
  loose?: boolean;
}) {
  const lights = useMemo(
    () =>
      stage === 'done' ? [] : scatterLightsFromId(seed, stage, { loose }),
    [loose, seed, stage],
  );

  if (lights.length === 0) {
    return null;
  }

  return (
    <span className="task-card-scatter-lights" aria-hidden="true">
      {lights.map((light, index) => (
        <span
          key={index}
          className="task-card-scatter-light"
          style={
            {
              '--sx': `${light.x}%`,
              '--sy': `${light.y}%`,
              '--sw': `${light.w}rem`,
              '--sh': `${light.h}rem`,
              '--scatter-spot-opacity': String(light.o),
            } as CSSProperties
          }
        />
      ))}
    </span>
  );
}
