interface BoardColumnShowMoreProps {
  hiddenCount: number;
  onShowMore: () => void;
}

export function BoardColumnShowMore({
  hiddenCount,
  onShowMore,
}: BoardColumnShowMoreProps) {
  if (hiddenCount <= 0) {
    return null;
  }

  return (
    <button
      type="button"
      className="board-column-show-more"
      onClick={(event) => {
        event.stopPropagation();
        onShowMore();
      }}
    >
      Show {hiddenCount} more
    </button>
  );
}
