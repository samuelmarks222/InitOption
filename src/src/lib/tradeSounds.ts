const TRADE_SOUND_EFFECTS_KEY = "trade_sound_effects_enabled";

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}

type TradeSoundKind = "open" | "close";

type ToneStep = {
  delay: number;
  duration: number;
  frequency: number;
  endFrequency?: number;
  volume: number;
  type?: OscillatorType;
};

let audioContext: AudioContext | null = null;
let masterGain: GainNode | null = null;
const lastPlaybackAt: Partial<Record<TradeSoundKind, number>> = {};

const getAudioContextConstructor = () => {
  if (typeof window === "undefined") {
    return null;
  }

  return window.AudioContext ?? window.webkitAudioContext ?? null;
};

const getAudioNodes = () => {
  const AudioContextConstructor = getAudioContextConstructor();
  if (!AudioContextConstructor) {
    return null;
  }

  if (!audioContext) {
    audioContext = new AudioContextConstructor();
    masterGain = audioContext.createGain();
    masterGain.gain.value = 0.7;
    masterGain.connect(audioContext.destination);
  }

  if (!masterGain) {
    return null;
  }

  return { audioContext, masterGain };
};

const scheduleTone = (
  context: AudioContext,
  destination: GainNode,
  step: ToneStep,
  originTime: number,
) => {
  const oscillator = context.createOscillator();
  const gainNode = context.createGain();
  const startTime = originTime + step.delay;
  const peakTime = startTime + Math.min(0.03, step.duration * 0.35);
  const endTime = startTime + step.duration;

  oscillator.type = step.type ?? "sine";
  oscillator.frequency.setValueAtTime(step.frequency, startTime);
  oscillator.frequency.linearRampToValueAtTime(step.endFrequency ?? step.frequency, endTime);

  gainNode.gain.setValueAtTime(0.0001, startTime);
  gainNode.gain.exponentialRampToValueAtTime(step.volume, peakTime);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, endTime);

  oscillator.connect(gainNode);
  gainNode.connect(destination);
  oscillator.start(startTime);
  oscillator.stop(endTime + 0.02);
};

const shouldSkipPlayback = (kind: TradeSoundKind, cooldownMs: number) => {
  if (cooldownMs <= 0) {
    return false;
  }

  const now = Date.now();
  const lastPlayed = lastPlaybackAt[kind] ?? 0;
  if (now - lastPlayed < cooldownMs) {
    return true;
  }

  lastPlaybackAt[kind] = now;
  return false;
};

const playPattern = async (kind: TradeSoundKind, steps: ToneStep[], cooldownMs = 0) => {
  if (!getTradeSoundEffectsEnabled() || shouldSkipPlayback(kind, cooldownMs)) {
    return;
  }

  const nodes = getAudioNodes();
  if (!nodes) {
    return;
  }

  try {
    if (nodes.audioContext.state === "suspended") {
      await nodes.audioContext.resume();
    }
  } catch {
    return;
  }

  const originTime = nodes.audioContext.currentTime + 0.01;
  steps.forEach((step) => scheduleTone(nodes.audioContext, nodes.masterGain as GainNode, step, originTime));
};

export const getTradeSoundEffectsEnabled = () => {
  if (typeof window === "undefined") {
    return true;
  }

  try {
    return window.localStorage.getItem(TRADE_SOUND_EFFECTS_KEY) !== "false";
  } catch {
    return true;
  }
};

export const setTradeSoundEffectsEnabled = (enabled: boolean) => {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(TRADE_SOUND_EFFECTS_KEY, String(enabled));
  } catch {
    // Ignore storage failures so trade actions are never blocked.
  }
};

export const playTradeOpenSound = () =>
  playPattern("open", [
    { delay: 0, duration: 0.09, frequency: 520, endFrequency: 600, volume: 0.12, type: "triangle" },
    { delay: 0.06, duration: 0.12, frequency: 700, endFrequency: 860, volume: 0.11, type: "sine" },
    { delay: 0.13, duration: 0.18, frequency: 920, endFrequency: 1160, volume: 0.08, type: "triangle" },
  ]);

export const playTradeCloseSound = () =>
  playPattern(
    "close",
    [
      { delay: 0, duration: 0.14, frequency: 980, endFrequency: 760, volume: 0.1, type: "sine" },
      { delay: 0.07, duration: 0.18, frequency: 620, endFrequency: 470, volume: 0.09, type: "triangle" },
      { delay: 0.16, duration: 0.12, frequency: 360, endFrequency: 420, volume: 0.06, type: "sine" },
    ],
    180,
  );
