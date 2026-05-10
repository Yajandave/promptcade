import { useEffect, useState } from "react";

import { ErrorBanner } from "./components/ErrorBanner";
import { GamePreview } from "./components/GamePreview";
import { GameSpecCard } from "./components/GameSpecCard";
import { PromptForm } from "./components/PromptForm";
import { RemixControls } from "./components/RemixControls";
import type { GameSpec, GenerationMode } from "./game/types";
import { generateGame, makeShareUrl, readShareState } from "./services/api";

const randomPrompts = [
  "the printer knows my secrets",
  "a sandwich applies for middle management",
  "my inbox has developed weather",
  "a kettle starts a punk band",
  "the meeting could have been a tiny comet",
  "laundry day in a haunted laundromat",
];

function App() {
  const [prompt, setPrompt] = useState("");
  const [spec, setSpec] = useState<GameSpec | null>(null);
  const [source, setSource] = useState<"gemini" | "fallback" | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shareMessage, setShareMessage] = useState<string | null>(null);

  useEffect(() => {
    const shared = readShareState();
    if (shared) {
      setPrompt(shared.prompt);
      setSpec(shared.spec);
      setSource("fallback");
      setWarnings(["Loaded from a share seed. Remix it to regenerate through the backend."]);
    }
  }, []);

  async function handleGenerate(nextPrompt: string, mode: GenerationMode = "normal") {
    setLoading(true);
    setError(null);
    setShareMessage(null);
    setPrompt(nextPrompt);
    try {
      const result = await generateGame(nextPrompt, mode);
      setSpec(result.gameSpec);
      setSource(result.source);
      setWarnings(result.warnings);
    } catch {
      setError("Promptcade coughed up a token. Try again with a shorter sentence.");
    } finally {
      setLoading(false);
    }
  }

  function handleRandom() {
    const nextPrompt = randomPrompts[Math.floor(Math.random() * randomPrompts.length)];
    void handleGenerate(nextPrompt, "weirder");
  }

  async function handleShare() {
    if (!spec) {
      return;
    }
    const url = makeShareUrl(prompt, spec);
    try {
      await navigator.clipboard.writeText(url);
      setShareMessage("Share seed copied.");
    } catch {
      window.history.replaceState(null, "", url);
      setShareMessage("Share seed added to the address bar.");
    }
  }

  return (
    <main className="app-shell">
      <section className="intro-band">
        <div>
          <p className="eyebrow">Instant nonsense machine</p>
          <h1>Promptcade</h1>
          <p className="tagline">Turn any sentence into a tiny retro game.</p>
        </div>
        <PromptForm initialPrompt={prompt} loading={loading} onSubmit={(value) => void handleGenerate(value)} />
      </section>

      <ErrorBanner message={error ?? shareMessage} />

      <section className="play-layout">
        <GamePreview spec={spec} loading={loading} />
        <GameSpecCard spec={spec} source={source} warnings={warnings} />
      </section>

      <RemixControls
        disabled={!spec || loading}
        onRemix={(mode) => void handleGenerate(prompt || "a toaster argues with a spreadsheet", mode)}
        onRandom={handleRandom}
        onShare={handleShare}
      />
    </main>
  );
}

export default App;

