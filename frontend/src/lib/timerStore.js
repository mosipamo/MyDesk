/* Global Pomodoro store. Lives outside React so the timer keeps running
 * while you browse other pages; components subscribe via useSyncExternalStore. */

import { useSyncExternalStore } from "react";

export const DEFAULT_DURATIONS = {
  focus: 25 * 60,
  short: 5 * 60,
  long: 15 * 60,
};

export const MODE_LABELS = {
  focus: "Focus",
  short: "Short break",
  long: "Long break",
};

const DURATIONS_KEY = "mydesk-timer-durations";
const MIN_SEC = 60;
const MAX_SEC = 4 * 60 * 60;

// User-configurable per-mode lengths, persisted across visits.
function loadDurations() {
  try {
    const saved = JSON.parse(localStorage.getItem(DURATIONS_KEY) || "null");
    if (
      saved &&
      ["focus", "short", "long"].every(
        (k) => Number.isFinite(saved[k]) && saved[k] >= MIN_SEC && saved[k] <= MAX_SEC
      )
    ) {
      return { ...DEFAULT_DURATIONS, ...saved };
    }
  } catch {
    /* fall through to defaults */
  }
  return { ...DEFAULT_DURATIONS };
}

let durations = loadDurations();

let state = {
  mode: "focus",
  running: false,
  remaining: durations.focus,
  durations,
  sessions: Number(sessionStorage.getItem("mydesk-sessions") || 0),
  justFinished: false,
};

const listeners = new Set();
let tick = null;
let audioCtx = null;

function emit() {
  for (const fn of listeners) fn();
}

function setState(patch) {
  state = { ...state, ...patch };
  emit();
}

function baseTitle() {
  document.title = "MyDesk";
}

function runningTitle() {
  const m = Math.floor(state.remaining / 60);
  const s = String(state.remaining % 60).padStart(2, "0");
  document.title = `${m}:${s} · ${MODE_LABELS[state.mode]} — MyDesk`;
}

function stopTick() {
  if (tick) {
    clearInterval(tick);
    tick = null;
  }
}

function ensureAudio() {
  try {
    audioCtx ??= new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === "suspended") audioCtx.resume();
  } catch {
    audioCtx = null;
  }
}

function chime() {
  if (!audioCtx) return;
  const t0 = audioCtx.currentTime;
  [880, 1108, 1318].forEach((freq, i) => {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, t0 + i * 0.18);
    gain.gain.exponentialRampToValueAtTime(0.18, t0 + i * 0.18 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + i * 0.18 + 0.5);
    osc.connect(gain).connect(audioCtx.destination);
    osc.start(t0 + i * 0.18);
    osc.stop(t0 + i * 0.18 + 0.55);
  });
}

function onTick() {
  const left = Math.max(0, Math.round((state.endAt - Date.now()) / 1000));
  if (left === state.remaining) return;
  setState({ remaining: left });
  runningTitle();
  if (left <= 0) {
    stopTick();
    const finishedFocus = state.mode === "focus";
    const sessions = finishedFocus ? state.sessions + 1 : state.sessions;
    if (finishedFocus) sessionStorage.setItem("mydesk-sessions", String(sessions));
    chime();
    setState({
      running: false,
      endAt: undefined,
      sessions,
      justFinished: true,
      mode: finishedFocus ? ((sessions % 4 === 0) ? "long" : "short") : "focus",
      remaining: finishedFocus
        ? ((sessions % 4 === 0) ? durations.long : durations.short)
        : durations.focus,
    });
    baseTitle();
  }
}

export const timer = {
  subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
  getSnapshot() {
    return state;
  },
  start() {
    if (state.running || state.remaining <= 0) return;
    ensureAudio();
    setState({ running: true, endAt: Date.now() + state.remaining * 1000, justFinished: false });
    runningTitle();
    stopTick();
    tick = setInterval(onTick, 250);
  },
  pause() {
    stopTick();
    setState({ running: false, endAt: undefined });
    baseTitle();
  },
  reset() {
    stopTick();
    setState({ running: false, endAt: undefined, remaining: durations[state.mode], justFinished: false });
    baseTitle();
  },
  dismissFinished() {
    if (state.justFinished) setState({ justFinished: false });
  },
  setMode(mode) {
    stopTick();
    setState({ mode, running: false, endAt: undefined, remaining: durations[mode], justFinished: false });
    baseTitle();
  },
  setDuration(mode, seconds) {
    const sec = Math.max(MIN_SEC, Math.min(MAX_SEC, Math.round(seconds)));
    durations = { ...durations, [mode]: sec };
    localStorage.setItem(DURATIONS_KEY, JSON.stringify(durations));
    const patch = { durations };
    if (state.mode === mode && !state.running) {
      patch.remaining = sec;
      patch.justFinished = false;
    }
    setState(patch);
  },
};

export function fmt(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function useTimer() {
  return useSyncExternalStore(timer.subscribe, timer.getSnapshot);
}
