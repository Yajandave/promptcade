import { useEffect, useMemo, useRef, useState } from "react";

import type { GameSpec, VirtualButton } from "../game/types";
import { createVirtualInput, mountPromptcadeGame } from "../game/engine";

interface RetroGameCanvasProps {
  spec: GameSpec | null;
  loading: boolean;
}

const directions: Array<{ key: VirtualButton; label: string }> = [
  { key: "up", label: "Up" },
  { key: "left", label: "Left" },
  { key: "down", label: "Down" },
  { key: "right", label: "Right" },
];

export function RetroGameCanvas({ spec, loading }: RetroGameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const inputRef = useRef(createVirtualInput());
  const [canvasError, setCanvasError] = useState<string | null>(null);
  const gameKey = useMemo(() => (spec ? JSON.stringify(spec) : "idle"), [spec]);

  useEffect(() => {
    if (!canvasRef.current || !spec) {
      return undefined;
    }

    setCanvasError(null);
    inputRef.current = createVirtualInput();
    try {
      const mounted = mountPromptcadeGame(canvasRef.current, spec, inputRef.current);
      return () => mounted.destroy();
    } catch {
      setCanvasError("The cabinet jammed, but the app is still alive. Try a remix.");
      return undefined;
    }
  }, [gameKey, spec]);

  function setButton(button: VirtualButton, value: boolean) {
    inputRef.current[button] = value;
    if (button === "action" && value) {
      inputRef.current.actionTap = true;
    }
  }

  return (
    <div className="screen-shell">
      <div className="screen-bezel">
        <canvas key={gameKey} ref={canvasRef} className="game-canvas" width={640} height={420} />
        {!spec || loading ? (
          <div className="screen-overlay">
            <span className="pixel-spinner" />
            <p>{loading ? "Converting thought into buttons..." : "Insert prompt to begin"}</p>
          </div>
        ) : null}
        {canvasError ? <div className="screen-overlay screen-overlay--error">{canvasError}</div> : null}
      </div>
      <div className="mobile-controls" aria-label="Touch controls">
        <div className="dpad">
          {directions.map((direction) => (
            <button
              key={direction.key}
              type="button"
              aria-label={direction.label}
              className={`dpad-button dpad-button--${direction.key}`}
              onPointerDown={() => setButton(direction.key, true)}
              onPointerUp={() => setButton(direction.key, false)}
              onPointerLeave={() => setButton(direction.key, false)}
            >
              {direction.label.slice(0, 1)}
            </button>
          ))}
        </div>
        <button
          type="button"
          className="action-button"
          aria-label="Action"
          onPointerDown={() => setButton("action", true)}
          onPointerUp={() => setButton("action", false)}
          onPointerLeave={() => setButton("action", false)}
        >
          A
        </button>
      </div>
    </div>
  );
}
