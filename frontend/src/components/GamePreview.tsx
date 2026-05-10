import type { GameSpec } from "../game/types";
import { RetroGameCanvas } from "./RetroGameCanvas";

interface GamePreviewProps {
  spec: GameSpec | null;
  loading: boolean;
}

export function GamePreview({ spec, loading }: GamePreviewProps) {
  return (
    <section className="game-preview" aria-label="Playable game preview">
      <div className="cabinet-top">
        <span>1UP</span>
        <span>{spec ? spec.title : "PROMPTCADE"}</span>
        <span>60 FPS-ish</span>
      </div>
      <RetroGameCanvas spec={spec} loading={loading} />
      <div className="control-hint">
        <span>Move: Arrow keys / WASD</span>
        <span>Action: Space</span>
      </div>
    </section>
  );
}

