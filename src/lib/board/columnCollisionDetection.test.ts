import {
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
  collisionRect?: ReturnType<typeof rect>;
  extraContainers?: DroppableContainer[];
  extraRects?: Map<string, ReturnType<typeof rect>>;
}): Parameters<CollisionDetection>[0] {
  const extraContainers = overrides.extraContainers ?? [];
  const collisionRect = overrides.collisionRect ?? cardInDevTest;
  const rects = new Map(droppableRects);
  for (const [id, box] of overrides.extraRects ?? []) {
    rects.set(id, box);
  }

  return {
    active: {
      id: 'task-1',
      data: { current: undefined },
      rect: { current: { initial: cardInDevTest, translated: collisionRect } },
    },
    collisionRect,
    droppableRects: rects,
    droppableContainers: [...columnContainers, ...extraContainers],
    pointerCoordinates: overrides.pointer,
  };
}

function firstId(collisions: { id: string | number }[]) {
  return collisions[0]?.id ?? null;
}

describe('columnCollisionDetection', () => {
  it('picks QA Test when the overlay sits there even if the pointer is still in Dev Test', () => {
    // Screenshot: ghost mostly on QA Test (centerX 900), cursor still in Dev Test.
    const overlayOnQa = args({
      pointer: { x: 700, y: 160 },
      collisionRect: rect(780, 100, 240, 80),
    });

    expect(firstId(columnCollisionDetection(overlayOnQa))).toBe(
      columns.qaTest.id,
    );
  });

  it('picks Done when the overlay center is in the tall Done column', () => {
    expect(
      firstId(
        columnCollisionDetection(
          args({
            pointer: { x: 700, y: 200 },
            collisionRect: rect(1160, 80, 240, 80),
          }),
        ),
      ),
    ).toBe(columns.done.id);
  });

  it('picks To Do and In Progress from overlay center X', () => {
    expect(
      firstId(
        columnCollisionDetection(
          args({
            pointer: { x: 700, y: 200 },
            collisionRect: rect(20, 80, 240, 80),
          }),
        ),
      ),
    ).toBe(columns.todo.id);
    expect(
      firstId(
        columnCollisionDetection(
          args({
            pointer: { x: 700, y: 200 },
            collisionRect: rect(300, 80, 240, 80),
          }),
        ),
      ),
    ).toBe(columns.inProgress.id);
  });

  it('keeps the source column when the overlay stays in Dev Test', () => {
    expect(
      firstId(
        columnCollisionDetection(args({ pointer: { x: 700, y: 200 } })),
      ),
    ).toBe(columns.devTest.id);
  });

  it('resolves an overlay over a nested card rect to that column, not the card', () => {
    const cardId = 'task-other';
    const cardRect = rect(900, 80, 200, 60);
    const collisions = columnCollisionDetection(
      args({
        pointer: { x: 700, y: 110 },
        collisionRect: rect(880, 70, 240, 80),
        extraContainers: [container(cardId)],
        extraRects: new Map([[cardId, cardRect]]),
      }),
    );

    expect(firstId(collisions)).toBe(columns.qaTest.id);
    expect(collisions.some((hit) => hit.id === cardId)).toBe(false);
  });

  it('falls back to the closest column when the overlay sits in a gap', () => {
    expect(
      firstId(
        columnCollisionDetection(
          args({
            pointer: { x: 855, y: 200 },
            collisionRect: rect(842, 160, 16, 80),
          }),
        ),
      ),
    ).toBe(columns.qaTest.id);
  });
});
