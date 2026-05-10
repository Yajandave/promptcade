import type { GenerationMode } from "../game/types";

interface RemixControlsProps {
  disabled: boolean;
  onRemix: (mode: GenerationMode) => void;
  onRandom: () => void;
  onShare: () => void;
}

export function RemixControls({ disabled, onRemix, onRandom, onShare }: RemixControlsProps) {
  return (
    <div className="remix-controls" aria-label="Remix controls">
      <button type="button" disabled={disabled} onClick={() => onRemix("weirder")}>
        Make it weirder
      </button>
      <button type="button" disabled={disabled} onClick={() => onRemix("harder")}>
        Make it harder
      </button>
      <button type="button" disabled={disabled} onClick={() => onRemix("easier")}>
        Make it easier
      </button>
      <button type="button" disabled={disabled} onClick={() => onRemix("normal")}>
        New game from same prompt
      </button>
      <button type="button" onClick={onRandom}>
        Random nonsense
      </button>
      <button type="button" disabled={disabled} onClick={onShare}>
        Share seed
      </button>
    </div>
  );
}

