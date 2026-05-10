import { sfxr } from "jsfxr";

import type { SoundName } from "./types";

const presets: Record<SoundName, string> = {
  start: "blipSelect",
  coin: "pickupCoin",
  hit: "hitHurt",
  shoot: "laserShoot",
  win: "powerUp",
  lose: "explosion",
  jump: "jump",
};

export function playRetroSound(name: SoundName) {
  try {
    const sound = sfxr.generate(presets[name]);
    sfxr.play(sound);
  } catch {
    playBeep(name);
  }
}

function playBeep(name: SoundName) {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) {
    return;
  }

  try {
    const context = new AudioContextClass();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = name === "hit" || name === "lose" ? "sawtooth" : "square";
    oscillator.frequency.value = {
      start: 220,
      coin: 660,
      hit: 140,
      shoot: 520,
      win: 880,
      lose: 90,
      jump: 420,
    }[name];
    gain.gain.setValueAtTime(0.04, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.14);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.15);
  } catch {
    // Audio is optional browser seasoning.
  }
}

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}

