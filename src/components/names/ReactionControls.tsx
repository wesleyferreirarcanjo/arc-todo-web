export function ReactionControls(props: {
  canUndo: boolean;
  disabled?: boolean;
  onUndo: () => void;
  onPass: () => void;
  onLike: () => void;
  onLove: () => void;
}) {
  return (
    <div className="names-reaction-controls">
      <button
        type="button"
        disabled={!props.canUndo || props.disabled}
        onClick={props.onUndo}
      >
        Undo
      </button>
      <button
        type="button"
        className="is-pass"
        disabled={props.disabled}
        onClick={props.onPass}
      >
        Pass
      </button>
      <button
        type="button"
        className="is-like"
        disabled={props.disabled}
        onClick={props.onLike}
      >
        Like
      </button>
      <button
        type="button"
        className="is-love"
        disabled={props.disabled}
        onClick={props.onLove}
      >
        Love
      </button>
    </div>
  );
}
