/// <reference types="vite/client" />

declare module "jsfxr" {
  export const sfxr: {
    generate: (preset: string | Record<string, unknown>) => unknown;
    play: (sound: unknown) => void;
    toAudio?: (sound: unknown) => HTMLAudioElement;
  };
}

