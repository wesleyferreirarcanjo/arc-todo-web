import { Modal } from '../Modal';

export function VariationPicker(props: {
  open: boolean;
  sourceName: string;
  variations: string[];
  busy: boolean;
  onPick: (name: string) => void;
  onClose: () => void;
}) {
  return (
    <Modal
      open={props.open}
      onClose={props.busy ? () => undefined : props.onClose}
      title={`More like ${props.sourceName}`}
      titleId="names-variation-title"
    >
      {props.variations.length === 0 ? (
        <p>No nearby variations for this name.</p>
      ) : (
        <ul className="names-variation-list">
          {props.variations.map((name) => (
            <li key={name}>
              <button
                type="button"
                className="btn btn-secondary"
                disabled={props.busy}
                onClick={() => props.onPick(name)}
              >
                {name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}
