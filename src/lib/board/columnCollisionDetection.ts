import {
  closestCorners,
  pointerWithin,
  rectIntersection,
  type CollisionDetection,
} from '@dnd-kit/core';

export const COLUMN_DROPPABLE_PREFIX = 'column:';

function isColumnDroppableId(id: string | number): boolean {
  return typeof id === 'string' && id.startsWith(COLUMN_DROPPABLE_PREFIX);
}

/**
 * Column under the pointer wins. Bare closestCorners keeps a tall source
 * (often Dev Test) as `over` while the overlay sits on a neighbor, so
 * handleDragEnd no-ops. Cards are not droppables; still ignore any
 * non-column id so a nested hit cannot become `over`.
 */
export const columnCollisionDetection: CollisionDetection = (args) => {
  const droppableContainers = args.droppableContainers.filter((container) =>
    isColumnDroppableId(container.id),
  );
  const columnArgs = { ...args, droppableContainers };

  const pointerHits = pointerWithin(columnArgs);
  if (pointerHits.length > 0) {
    return pointerHits;
  }

  const pointer = args.pointerCoordinates;
  if (pointer) {
    // Gap between columns: ignore the leftover card rect (still in source).
    return closestCorners({
      ...columnArgs,
      collisionRect: {
        width: 1,
        height: 1,
        top: pointer.y,
        left: pointer.x,
        right: pointer.x + 1,
        bottom: pointer.y + 1,
      },
    });
  }

  const intersections = rectIntersection(columnArgs);
  if (intersections.length > 0) {
    return intersections;
  }

  return closestCorners(columnArgs);
};
