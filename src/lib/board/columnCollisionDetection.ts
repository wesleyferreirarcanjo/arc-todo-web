import type { Collision, CollisionDetection, UniqueIdentifier } from '@dnd-kit/core';

export const COLUMN_DROPPABLE_PREFIX = 'column:';

function isColumnDroppableId(id: UniqueIdentifier): boolean {
  return typeof id === 'string' && id.startsWith(COLUMN_DROPPABLE_PREFIX);
}

function hit(id: UniqueIdentifier): Collision[] {
  return [{ id }];
}

function horizontalOverlap(
  a: { left: number; right: number },
  b: { left: number; right: number },
): number {
  return Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left));
}

function distanceToSegment(x: number, left: number, right: number): number {
  if (x < left) return left - x;
  if (x > right) return x - right;
  return 0;
}

/**
 * Ghost overlay X wins. pointerWithin followed the cursor, so grabbing the
 * left of a card left the highlight on Dev Test while the overlay sat on
 * QA Test. closestCorners on the full card rect prefers a tall source.
 * Cards are not droppables; ignore non-column ids anyway.
 */
export const columnCollisionDetection: CollisionDetection = (args) => {
  const columns = args.droppableContainers.filter((container) =>
    isColumnDroppableId(container.id),
  );
  const overlay = args.collisionRect;
  const rects = args.droppableRects;

  if (overlay) {
    const centerX = overlay.left + overlay.width / 2;
    const containing = columns.find((column) => {
      const box = rects.get(column.id);
      return box != null && centerX >= box.left && centerX < box.right;
    });
    if (containing) {
      return hit(containing.id);
    }

    let bestId: UniqueIdentifier | null = null;
    let bestOverlap = 0;
    for (const column of columns) {
      const box = rects.get(column.id);
      if (!box) continue;
      const overlap = horizontalOverlap(overlay, box);
      if (overlap > bestOverlap) {
        bestOverlap = overlap;
        bestId = column.id;
      }
    }
    if (bestId != null && bestOverlap > 0) {
      return hit(bestId);
    }
  }

  const x =
    args.pointerCoordinates?.x ??
    (overlay ? overlay.left + overlay.width / 2 : null);
  if (x == null) {
    return [];
  }

  let bestId: UniqueIdentifier | null = null;
  let bestDist = Infinity;
  for (const column of columns) {
    const box = rects.get(column.id);
    if (!box) continue;
    const dist = distanceToSegment(x, box.left, box.right);
    if (dist < bestDist) {
      bestDist = dist;
      bestId = column.id;
    }
  }
  return bestId != null ? hit(bestId) : [];
};
