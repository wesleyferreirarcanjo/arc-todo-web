export const BOARD_COLUMN_MIN_WIDTH = 280;
export const BOARD_COLUMN_GAP_PX = 20;

export function getFullBoardWidth(columnCount: number): number {
  return (
    BOARD_COLUMN_MIN_WIDTH * columnCount +
    BOARD_COLUMN_GAP_PX * Math.max(0, columnCount - 1)
  );
}
