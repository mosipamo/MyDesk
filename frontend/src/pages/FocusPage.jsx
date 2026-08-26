import { useEffect, useState } from "react";
import { Play, Pause, RotateCcw, Timer as TimerIcon, Minus, Plus } from "lucide-react";
import { api } from "../api.js";
import ProgressRing from "../components/ProgressRing.jsx";
import { MODE_LABELS, fmt, timer, useTimer } from "../lib/timerStore.js";

const MODE_ORDER = ["focus", "short", "long"];

const PRESETS = {
  focus: [15, 20, 25, 30, 45, 60],
  short: [3, 5, 10, 15],
  long: [10, 15, 20, 30],
};

function stepFor(mode) {
  return mode === "focus" ? 5 : 1;
}

export default function FocusPage() {
  const t = useTimer();
  const [todos, setTodos] = useState([]);
  const [workingOn, setWorkingOn] = useState("");
  const [draft, setDraft] = useState(null); // minutes being typed, null when idle

  useEffect(() => {
    api.listTodos().then((all) => setTodos(all.filter((x) => !x.done))).catch(console.error);
  }, []);

  useEffect(() => {
    if (!t.justFinished) return;
    const id = setTimeout(() => timer.dismissFinished(), 6000);
    return () => clearTimeout(id);
  }, [t.justFinished]);

  const dur = t.durations[t.mode];
  const step = stepFor(t.mode);

  function commitMinutes() {
    if (draft === null) return;
    const n = Number(draft);
    if (Number.isFinite(n) && n >= 1) timer.setDuration(t.mode, n * 60);
    setDraft(null);
  }

  return (
    <div>
      <div className="page-header">Pomodoro</div>
      <div className="page-title-row">
        <div>
          <h1 className="page-title">Focus</h1>
          <p className="page-sub">
            The timer keeps running even when you wander off to other pages.
          </p>
        </div>
      </div>

      <div className="dash-grid">
        <section className="dash-card span-8 focus-card">
          <div className="tool-seg text-seg" role="group" aria-label="Timer mode">
            {MODE_ORDER.map((m) => (
              <button
                key={m}
                type="button"
                className={t.mode === m ? "active" : ""}
                onClick={() => timer.setMode(m)}
                aria-pressed={t.mode === m}
              >
                {MODE_LABELS[m]}
              </button>
            ))}
          </div>

          <ProgressRing
            value={dur - t.remaining}
            max={dur}
            size={230}
            stroke={11}
            label={`${fmt(t.remaining)} remaining`}
          >
            <span className="focus-time">{fmt(t.remaining)}</span>
          </ProgressRing>

          <div className="duration-picker">
            <span className="dp-label">
              {MODE_LABELS[t.mode]} length
            </span>
            <div className="dp-row">
              <button
                type="button"
                className="dp-step"
                onClick={() => timer.setDuration(t.mode, dur - step * 60)}
                aria-label={`Decrease by ${step} minutes`}
                disabled={t.running}
              >
                <Minus size={14} />
              </button>
              <span className="dp-input-wrap">
                <input
                  className="dp-input"
                  type="number"
                  min="1"
                  max="240"
                  value={draft ?? Math.round(dur / 60)}
                  onChange={(e) => setDraft(e.target.value)}
                  onBlur={commitMinutes}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") e.target.blur();
                  }}
                  disabled={t.running}
                  aria-label="Minutes"
                />
                <span className="dp-unit">min</span>
              </span>
              <button
                type="button"
                className="dp-step"
                onClick={() => timer.setDuration(t.mode, dur + step * 60)}
                aria-label={`Increase by ${step} minutes`}
                disabled={t.running}
              >
                <Plus size={14} />
              </button>
            </div>
            <div className="dp-row">
              {PRESETS[t.mode].map((m) => (
                <button
                  key={m}
                  type="button"
                  className={`dp-pill${dur === m * 60 ? " on" : ""}`}
                  onClick={() => timer.setDuration(t.mode, m * 60)}
                  disabled={t.running}
                  aria-pressed={dur === m * 60}
                >
                  {m}m
                </button>
              ))}
            </div>
          </div>

          <div className="session-dots" aria-label={`${t.sessions} focus sessions completed`}>
            {Array.from({ length: Math.max(4, ((t.sessions / 4 | 0) + 1) * 4) }).map((_, i) => (
              <span key={i} className={`s-dot${i < t.sessions ? " filled" : ""}${i % 4 === 3 ? " milestone" : ""}`} />
            ))}
          </div>

          <div className="focus-controls">
            {t.running ? (
              <button type="button" className="btn btn-danger" onClick={timer.pause}>
                <Pause size={16} />
                Pause
              </button>
            ) : (
              <button type="button" className="btn btn-primary" onClick={timer.start}>
                <Play size={16} />
                {t.remaining === dur ? "Start" : "Resume"}
              </button>
            )}
            <button type="button" className="btn btn-ghost" onClick={timer.reset}>
              <RotateCcw size={15} />
              Reset
            </button>
          </div>

          {t.justFinished && (
            <div className="focus-done-msg">
              {t.mode === "focus"
                ? "Session complete — time for a break."
                : "Break's over — back to it."}
            </div>
          )}
        </section>

        <section className="dash-card span-4">
          <div className="dash-card-head">
            <span className="dash-card-title">
              <TimerIcon size={14} />
              Working on
            </span>
          </div>
          <select
            className="form-control"
            value={workingOn}
            onChange={(e) => setWorkingOn(e.target.value)}
            aria-label="Pick the task you are focusing on"
          >
            <option value="">Nothing specific</option>
            {todos.map((td) => (
              <option key={td.id} value={td.id}>
                {td.text}
              </option>
            ))}
          </select>
          {workingOn && (
            <p className="focus-now">
              Focusing: <strong>{todos.find((x) => String(x.id) === workingOn)?.text}</strong>
            </p>
          )}
          <div className="day-section-label">How it works</div>
          <ul className="focus-howto">
            <li>Pick any length above — it's remembered.</li>
            <li>After each focus session a break is suggested.</li>
            <li>A chime plays when time is up.</li>
            <li>Completed sessions are counted below the dial.</li>
          </ul>
        </section>
      </div>
    </div>
  );
}
