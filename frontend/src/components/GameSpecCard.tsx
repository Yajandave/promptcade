import type { GameSpec } from "../game/types";
import { resolvePalette } from "../game/palettes";

interface GameSpecCardProps {
  spec: GameSpec | null;
  source: "gemini" | "fallback" | null;
  warnings: string[];
}

export function GameSpecCard({ spec, source, warnings }: GameSpecCardProps) {
  if (!spec) {
    return (
      <aside className="spec-card empty-state">
        <p className="eyebrow">Cabinet idle</p>
        <h2>Waiting for nonsense</h2>
        <p>Type a sentence and Promptcade will snap it into a tiny fixed-template arcade game.</p>
      </aside>
    );
  }

  const palette = resolvePalette(spec.palette);

  return (
    <aside className="spec-card">
      <div className="spec-card__top">
        <p className="eyebrow">GameSpec</p>
        <span className={`source-pill source-pill--${source ?? "fallback"}`}>{source ?? "fallback"}</span>
      </div>
      <h2>{spec.title}</h2>
      <p>{spec.intro}</p>
      <dl className="spec-list">
        <div>
          <dt>Template</dt>
          <dd>{spec.template.replace("_", " ")}</dd>
        </div>
        <div>
          <dt>Difficulty</dt>
          <dd>{spec.difficulty}</dd>
        </div>
        <div>
          <dt>Hero</dt>
          <dd>{spec.hero}</dd>
        </div>
        <div>
          <dt>Enemy</dt>
          <dd>{spec.enemy}</dd>
        </div>
        <div>
          <dt>Collect</dt>
          <dd>{spec.collectible}</dd>
        </div>
        <div>
          <dt>Palette</dt>
          <dd>
            <span className="swatch" style={{ background: palette.accent }} />
            {palette.name}
          </dd>
        </div>
      </dl>
      {warnings.length > 0 ? (
        <div className="warning-stack">
          {warnings.map((warning) => (
            <p key={warning}>{warning}</p>
          ))}
        </div>
      ) : null}
    </aside>
  );
}

