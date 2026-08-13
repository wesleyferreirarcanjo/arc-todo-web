import {
  closestCorners,
  type CollisionDetection,
  type DroppableContainer,
} from '@dnd-kit/core';
import { describe, expect, it } from 'vitest';
import { columnCollisionDetection } from './columnCollisionDetection';
import { getColumnDroppableId } from './useTaskBoardDnd';

function rect(left: number, top: number, width: number, height: number) {
  return {
    left,
    top,
    width,
    height,
    right: left + width,
    bottom: top + height,
  };
}

function container(id: string): DroppableContainer {
  return {
    id,
    key: id,
    disabled: false,
    data: { current: undefined },
    node: { current: null },
    rect: { current: null },
  };
}

const columns = {
  todo: { id: getColumnDroppableId('todo'), box: rect(0, 0, 280, 400) },
  inProgress: {
    id: getColumnDroppableId('in_progress'),
    box: rect(280, 0, 280, 400),
  },
  devTest: {
    id: getColumnDroppableId('dev_test'),
    box: rect(560, 0, 280, 800),
  },
  qaTest: {
    id: getColumnDroppableId('qa_test'),
    box: rect(860, 0, 280, 400),
  },
  done: { id: getColumnDroppableId('done'), box: rect(1140, 0, 280, 1200) },
};

const columnContainers = Object.values(columns).map(({ id }) => container(id));
const droppableRects = new Map(
  Object.values(columns).map(({ id, box }) => [id, box]),
);

const cardInDevTest = rect(580, 120, 240, 80);

function args(overrides: {
  pointer: { x: number; y: number } | null;
  extraContainers?: DroppableContainer[];
  extraRects?: Map<string, ReturnType<typeof rect>>;
}): Parameters<CollisionDetection>[0] {
  const extraContainers = overrides.extraContainers ?? [];
  const rects = new Map(droppableRects);
  for (const [id, box] of overrides.extraRects ?? []) {
    rects.set(id, box);
  }

  return {
    active: {
      id: 'task-1',
      data: { current: undefined },
      rect: { current: { initial: cardInDevTest, translated: cardInDevTest } },
    },
    collisionRect: cardInDevTest,
    droppableRects: rects,
    droppableContainers: [...columnContainers, ...extraContainers],
    pointerCoordinates: overrides.pointer,
  };
}

function firstId(collisions: { id: string | number }[]) {
  return collisions[0]?.id ?? null;
}

describe('columnCollisionDetection', () => {
  it('picks the column under the pointer, not a tall source (Dev Test)', () => {
    const pointerOnQa = args({ pointer: { x: 1000, y: 200 } });

    expect(firstId(closestCorners(pointerOnQa))).not.toBe(columns.qaTest.id);
    expect(firstId(columnCollisionDetection(pointerOnQa))).toBe(
      columns.qaTest.id,
    );
  });

  it('picks Done when the pointer is inside the tall Done column', () => {
    const pointerOnDone = args({ pointer: { x: 1280, y: 200 } });
    expect(firstId(columnCollisionDetection(pointerOnDone))).toBe(
      columns.done.id,
    );
  });

  it('picks To Do and In Progress the same way', () => {
    expect(
      firstId(
        columnCollisionDetection(args({ pointer: { x: 140, y: 200 } })),
      ),
    ).toBe(columns.todo.id);
    expect(
      firstId(
        columnCollisionDetection(args({ pointer: { x: 420, y: 200 } })),
      ),
    ).toBe(columns.inProgress.id);
  });

  it('keeps the source column when the pointer stays in Dev Test', () => {
    expect(
      firstId(
        columnCollisionDetection(args({ pointer: { x: 700, y: 200 } })),
      ),
    ).toBe(columns.devTest.id);
  });

  it('resolves a pointer over a nested card rect to that column, not the card', () => {
    const cardId = 'task-other';
    const cardRect = rect(900, 80, 200, 60);
    const collisions = columnCollisionDetection(
      args({
        pointer: { x: 980, y: 110 },
        extraContainers: [container(cardId)],
        extraRects: new Map([[cardId, cardRect]]),
      }),
    );

    expect(firstId(collisions)).toBe(columns.qaTest.id);
    expect(collisions.some((hit) => hit.id === cardId)).toBe(false);
  });

  it('falls back to the closest column when the pointer is in a gap', () => {
    expect(
      firstId(
        columnCollisionDetection(args({ pointer: { x: 850, y: 200 } })),
      ),
    ).toBe(columns.qaTest.id);
  });
});
