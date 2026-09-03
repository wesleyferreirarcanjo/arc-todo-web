const START_BATCH_HINT =
  'Add at least 10 new names before starting a batch.';

export function BatchProgress(props: {
  position: number;
  total: number;
  remaining: number;
  championName: string | null;
  canManage: boolean;
  unbatchedCount: number;
  starting?: boolean;
  onStartBatch: () => void;
}) {
  const ratio = props.total > 0 ? Math.min(1, props.position / props.total) : 0;
  const canStart = props.unbatchedCount >= 10;

  return (
    <div className="names-batch-progress-block">
      <div className="names-batch-progress">
        <span>
          {props.total > 0
            ? `${props.position} of ${props.total}`
            : 'No open batch'}
        </span>
        <div className="names-batch-progress-track">
          <span style={{ width: `${Math.round(ratio * 100)}%` }} />
        </div>
        <span>
          {props.remaining} {props.remaining === 1 ? 'name' : 'names'} left
        </span>
      </div>
      {props.championName ? (
        <p className="names-batch-champion">
          Reigning champion: {props.championName}
        </p>
      ) : null}
      {props.canManage ? (
        <div className="names-batch-start">
          <button
            type="button"
            className="btn btn-secondary"
            disabled={!canStart || props.starting}
            onClick={props.onStartBatch}
          >
            Start batch
          </button>
          {!canStart ? <p>{START_BATCH_HINT}</p> : null}
        </div>
      ) : null}
    </div>
  );
}
