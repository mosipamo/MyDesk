import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Trash2, Save, FilePlus2, Undo2, Eraser, Pencil, RefreshCw } from "lucide-react";
import { api } from "../api.js";

const COLORS = ["#23262b", "#1f6f5c", "#b94a3f", "#d9a32c", "#3a5a9b"];

// Redraws the full stroke list onto a canvas context. Defensive about
// malformed stroke data (e.g. hand-edited or older saved drawings) so a
// bad record can't take the whole page down on load.
function paintStrokes(ctx, strokes, width, height) {
  if (!ctx) return;
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#fdfdfb";
  ctx.fillRect(0, 0, width, height);
  for (const stroke of strokes || []) {
    const points = stroke?.points;
    if (!Array.isArray(points) || points.length < 2) continue;
    ctx.globalCompositeOperation = stroke.erase
      ? "destination-out"
      : "source-over";
    ctx.strokeStyle = stroke.erase
      ? "rgba(0,0,0,1)"
      : stroke.color || "#23262b";
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    for (let i = 1; i < points.length; i++) {
      const p0 = points[i - 1];
      const p1 = points[i];
      if (!p0 || !p1) continue;
      const pressure = typeof p1.p === "number" ? p1.p : 0.5;
      ctx.lineWidth = Math.max(1, (stroke.size || 3) * (0.4 + pressure * 1.2));
      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      ctx.lineTo(p1.x, p1.y);
      ctx.stroke();
    }
  }
  ctx.globalCompositeOperation = "source-over";
}

function parseStrokes(raw) {
  try {
    const data = JSON.parse(raw || "[]");
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function DrawingThumb({ raw }) {
  const ref = useRef(null);
  const strokes = useMemo(() => parseStrokes(raw), [raw]);

  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    const scale = Math.min(c.width / 760, c.height / 520);
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    paintStrokes(ctx, strokes, 760, 520);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }, [strokes]);

  return <canvas ref={ref} width={206} height={140} aria-hidden="true" />;
}

export default function CanvasPage() {
  const canvasRef = useRef(null);
  const [drawings, setDrawings] = useState([]);
  const [currentId, setCurrentId] = useState(null);
  const [title, setTitle] = useState("Untitled drawing");
  const [strokes, setStrokes] = useState([]);
  const [color, setColor] = useState(COLORS[0]);
  const [size, setSize] = useState(3);
  const [tool, setTool] = useState("pen"); // "pen" | "eraser"
  const [saving, setSaving] = useState(false);
  const drawingStrokeRef = useRef(null);
  const cursorRef = useRef(null);
  const dims = { width: 760, height: 520 };
  const effectiveSize = tool === "eraser" ? size * 3 : size;
  const cursorDiameter = Math.max(4, effectiveSize * 1.6);

  // Moves the tool-size indicator with the pointer via direct DOM writes
  // (not React state) so hovering/dragging stays smooth at high event rates.
  function updateCursorPosition(e) {
    const canvas = canvasRef.current;
    if (!canvas || !cursorRef.current) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    cursorRef.current.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`;
  }

  function showCursor() {
    if (cursorRef.current) cursorRef.current.style.opacity = "1";
  }

  function hideCursor() {
    if (cursorRef.current) cursorRef.current.style.opacity = "0";
  }

  const refreshList = useCallback(() => {
    api.listDrawings().then(setDrawings).catch(console.error);
  }, []);

  useEffect(() => {
    refreshList();
  }, [refreshList]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    paintStrokes(ctx, strokes, dims.width, dims.height);
  }, [strokes]); // eslint-disable-line react-hooks/exhaustive-deps

  function getPos(e) {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const pressure = e.pointerType === "pen" ? e.pressure : 0.5;
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      // Some browsers report 0 pressure on the very first sample of a pen
      // stroke (before the tip is fully registered) — that would draw an
      // invisible sliver, so treat 0 the same as "no pressure info".
      p: pressure && pressure > 0 ? pressure : 0.5,
    };
  }

  function handlePointerDown(e) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      canvas.setPointerCapture(e.pointerId);
    } catch {
      // Some browsers/devices raise if the pointer is already released by
      // the time this runs — safe to ignore, drawing still works.
    }
    const point = getPos(e);
    if (!point) return;
    drawingStrokeRef.current = {
      color,
      size: tool === "eraser" ? size * 3 : size,
      erase: tool === "eraser",
      points: [point],
    };
  }

  function handlePointerMove(e) {
    if (!drawingStrokeRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    // High-frequency pens/tablets can fire well over 100 events/sec.
    // Use the browser's coalesced-event API when available so we capture
    // the true path without pushing an unbounded number of near-duplicate
    // points into state on every single stroke.
    const events =
      typeof e.getCoalescedEvents === "function" ? e.getCoalescedEvents() : [e];
    const pts = drawingStrokeRef.current.points;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    for (const evt of events.length ? events : [e]) {
      const point = getPos(evt);
      if (!point) continue;
      const prev = pts[pts.length - 1];
      // Skip points that are essentially on top of the last one — cuts
      // down noise from high sample rates without visibly changing the line.
      if (
        prev &&
        Math.abs(point.x - prev.x) < 0.5 &&
        Math.abs(point.y - prev.y) < 0.5
      ) {
        continue;
      }
      pts.push(point);
      if (prev) {
        ctx.globalCompositeOperation = drawingStrokeRef.current.erase
          ? "destination-out"
          : "source-over";
        ctx.strokeStyle = drawingStrokeRef.current.erase
          ? "rgba(0,0,0,1)"
          : drawingStrokeRef.current.color;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.lineWidth = Math.max(
          1,
          drawingStrokeRef.current.size * (0.4 + point.p * 1.2),
        );
        ctx.beginPath();
        ctx.moveTo(prev.x, prev.y);
        ctx.lineTo(point.x, point.y);
        ctx.stroke();
        ctx.globalCompositeOperation = "source-over";
      }
    }
  }

  function handlePointerUp() {
    // Capture into a local before clearing the ref: setStrokes's updater
    // runs slightly later, so if it read drawingStrokeRef.current directly
    // it would see null by the time React calls it.
    const finished = drawingStrokeRef.current;
    if (!finished) return;
    drawingStrokeRef.current = null;
    setStrokes((prev) => [...prev, finished]);
  }

  function undo() {
    setStrokes((prev) => prev.slice(0, -1));
  }

  function clearCanvas() {
    setStrokes([]);
  }

  function startNew() {
    setCurrentId(null);
    setTitle("Untitled drawing");
    setStrokes([]);
  }

  async function loadDrawing(d) {
    const full = drawings.find((x) => x.id === d.id) ?? (await api.getDrawing(d.id));
    setCurrentId(full.id);
    setTitle(full.title);
    setStrokes(parseStrokes(full.strokes));
  }

  async function save() {
    setSaving(true);
    try {
      const payload = { title, strokes: JSON.stringify(strokes) };
      if (currentId) {
        await api.updateDrawing(currentId, payload);
      } else {
        const created = await api.createDrawing(payload);
        setCurrentId(created.id);
      }
      refreshList();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  async function removeDrawing(id, e) {
    e.stopPropagation();
    if (!window.confirm("Delete this drawing? This cannot be undone.")) return;
    await api.deleteDrawing(id);
    if (id === currentId) startNew();
    refreshList();
  }

  // Latest-action refs so the Ctrl+S / Ctrl+Z handlers below always call
  // the current closures without re-binding the listener on every render.
  const saveRef = useRef(save);
  const undoRef = useRef(undo);
  saveRef.current = save;
  undoRef.current = undo;

  useEffect(() => {
    function onKey(e) {
      const mod = e.ctrlKey || e.metaKey;
      if (!mod) return;
      const key = e.key.toLowerCase();
      if (key === "s") {
        e.preventDefault();
        saveRef.current();
      } else if (key === "z" && !e.shiftKey) {
        if (e.target.closest?.("input, textarea, select")) return;
        e.preventDefault();
        undoRef.current();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div>
      <div className="page-header">Sketch</div>
      <div className="page-title-row">
        <div>
          <h1 className="page-title">Canvas</h1>
          <p className="page-sub">
            Pressure-sensitive drawing. Save with <kbd>Ctrl S</kbd>, undo with{" "}
            <kbd>Ctrl Z</kbd>.
          </p>
        </div>
      </div>

      <div className="canvas-layout">
        <div className="canvas-main">
          <div className="canvas-toolbar">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              style={{ width: 200 }}
              aria-label="Drawing title"
            />

            <div className="tool-divider" />

            <div className="tool-seg" role="group" aria-label="Tool">
              <button
                type="button"
                className={tool === "pen" ? "active" : ""}
                onClick={() => setTool("pen")}
                title="Pen"
                aria-pressed={tool === "pen"}
              >
                <Pencil size={16} />
              </button>
              <button
                type="button"
                className={tool === "eraser" ? "active" : ""}
                onClick={() => setTool("eraser")}
                title="Eraser"
                aria-pressed={tool === "eraser"}
              >
                <Eraser size={16} />
              </button>
            </div>

            <div className="tool-divider" />

            {COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                aria-label={`Color ${c}`}
                aria-pressed={color === c}
                className={`swatch${color === c ? " active" : ""}`}
                style={{
                  background: c,
                  boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.25)",
                  border: "none",
                }}
              />
            ))}

            <div className="tool-divider" />

            <div className="size-wrap">
              <input
                type="range"
                min="1"
                max="12"
                value={size}
                onChange={(e) => setSize(Number(e.target.value))}
                style={{ width: 90 }}
                aria-label="Brush size"
              />
              <span
                className="size-dot"
                style={{
                  width: Math.min(20, Math.max(4, size * 1.6)),
                  height: Math.min(20, Math.max(4, size * 1.6)),
                  opacity: 0.75,
                }}
              />
            </div>

            <div className="tool-divider" />

            <button type="button" className="btn btn-icon btn-ghost" onClick={undo} title="Undo last stroke (Ctrl+Z)">
              <Undo2 size={16} />
            </button>
            <button type="button" className="btn btn-icon btn-ghost" onClick={clearCanvas} title="Clear canvas">
              <Trash2 size={16} />
            </button>
            <button type="button" className="btn btn-icon btn-ghost" onClick={startNew} title="New drawing">
              <FilePlus2 size={16} />
            </button>

            <button
              type="button"
              className="btn btn-primary"
              onClick={save}
              disabled={saving}
              style={{ marginLeft: "auto" }}
            >
              {saving ? <RefreshCw className="spin" size={15} /> : <Save size={16} />}
              {saving ? "Saving…" : "Save"}
            </button>
          </div>

          <div
            className="canvas-board"
            style={{
              width: dims.width,
              height: dims.height,
            }}
          >
            <canvas
              ref={canvasRef}
              width={dims.width}
              height={dims.height}
              className="card"
              style={{ touchAction: "none", cursor: "none", display: "block" }}
              onPointerDown={handlePointerDown}
              onPointerMove={(e) => {
                handlePointerMove(e);
                updateCursorPosition(e);
              }}
              onPointerUp={handlePointerUp}
              onPointerEnter={showCursor}
              onPointerLeave={(e) => {
                handlePointerUp();
                hideCursor();
              }}
            />
            <div
              ref={cursorRef}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: cursorDiameter,
                height: cursorDiameter,
                borderRadius: "50%",
                border:
                  tool === "eraser"
                    ? "1.5px dashed var(--ink-soft)"
                    : `1.5px solid ${color}`,
                background:
                  tool === "eraser" ? "rgba(253,253,251,0.55)" : "transparent",
                boxSizing: "border-box",
                pointerEvents: "none",
                opacity: 0,
              }}
            />
          </div>
          <p className="canvas-hint">
            Works with a pressure-sensitive pen/stylus, or mouse and touch as a fallback.
          </p>
        </div>

        <div className="drawing-list">
          <div className="page-header" style={{ marginBottom: 2 }}>
            Saved ({drawings.length})
          </div>
          {drawings.map((d, i) => (
            <div
              key={d.id}
              onClick={() => loadDrawing(d)}
              className={`drawing-card${d.id === currentId ? " active" : ""}`}
              style={{ animationDelay: `${Math.min(i * 0.05, 0.35)}s` }}
            >
              <DrawingThumb raw={d.strokes} />
              <div className="drawing-card-meta">
                <span className="drawing-card-title">{d.title}</span>
                <button
                  type="button"
                  className="delete-inline"
                  aria-label={`Delete ${d.title}`}
                  onClick={(e) => removeDrawing(d.id, e)}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
          {drawings.length === 0 && (
            <p style={{ color: "var(--muted)", fontSize: 13.5, margin: 0 }}>
              Nothing saved yet — sketch something and hit Save.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
