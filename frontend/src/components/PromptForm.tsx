import { FormEvent, useEffect, useState } from "react";

interface PromptFormProps {
  initialPrompt?: string;
  loading: boolean;
  onSubmit: (prompt: string) => void;
}

export function PromptForm({ initialPrompt = "", loading, onSubmit }: PromptFormProps) {
  const [prompt, setPrompt] = useState(initialPrompt);

  useEffect(() => {
    setPrompt(initialPrompt);
  }, [initialPrompt]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit(prompt.trim() || "a toaster argues with a spreadsheet");
  }

  return (
    <form className="prompt-form" onSubmit={handleSubmit}>
      <label htmlFor="prompt-input">Type anything...</label>
      <div className="prompt-row">
        <textarea
          id="prompt-input"
          value={prompt}
          maxLength={500}
          onChange={(event) => setPrompt(event.target.value)}
          placeholder="my boiler is gaslighting me"
          rows={3}
        />
        <button className="primary-button" type="submit" disabled={loading}>
          {loading ? "Warming cabinet..." : "Make it playable"}
        </button>
      </div>
    </form>
  );
}
