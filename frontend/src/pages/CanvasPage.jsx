import { useEffect, useRef, useState, useCallback } from "react";
import { Trash2, Save, FilePlus2, Undo2, Eraser, Pencil } from "lucide-react";
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
  const cursorDiameter = Math.max(4, effectiveSize * 1.6); // matches the max stroke width at full pressure

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
  }, [strokes]);

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
    const full = await api.getDrawing(d.id);
    setCurrentId(full.id);
    setTitle(full.title);
    setStrokes(JSON.parse(full.strokes || "[]"));
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
    await api.deleteDrawing(id);
    if (id === currentId) startNew();
    refreshList();
  }

  return (
    <div>
      <div className="page-header">Pen</div>
      <h1 className="page-title">Canvas</h1>

      <div style={{ display: "flex", gap: 24 }}>
        <div style={{ flex: 1 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              marginBottom: 14,
              flexWrap: "wrap",
            }}
          >
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              style={{ width: 220 }}
            />
            <button
              className="btn btn-icon"
              onClick={() => setTool("pen")}
              title="Pen"
              style={
                tool === "pen"
                  ? {
                      borderColor: "var(--accent)",
                      background: "var(--accent-soft)",
                    }
                  : undefined
              }
            >
              <Pencil size={16} />
            </button>
            <button
              className="btn btn-icon"
              onClick={() => setTool("eraser")}
              title="Eraser"
              style={
                tool === "eraser"
                  ? {
                      borderColor: "var(--accent)",
                      background: "var(--accent-soft)",
                    }
                  : undefined
              }
            >
              <Eraser size={16} />
            </button>
            {COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                aria-label={`Color ${c}`}
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: "50%",
                  background: c,
                  border:
                    color === c
                      ? "2px solid var(--ink)"
                      : "1px solid var(--line)",
                  padding: 0,
                }}
              />
            ))}
            <input
              type="range"
              min="1"
              max="12"
              value={size}
              onChange={(e) => setSize(Number(e.target.value))}
              style={{ width: 100 }}
            />
            <button
              className="btn btn-icon"
              onClick={undo}
              title="Undo last stroke"
            >
              <Undo2 size={16} />
            </button>
            <button
              className="btn btn-icon"
              onClick={clearCanvas}
              title="Clear canvas"
            >
              <Trash2 size={16} />
            </button>
            <button
              className="btn btn-icon"
              onClick={startNew}
              title="New drawing"
            >
              <FilePlus2 size={16} />
            </button>
            <button
              className="btn btn-primary"
              onClick={save}
              disabled={saving}
            >
              <Save size={16} />
              {saving ? "Saving…" : "Save"}
            </button>
          </div>

          <div
            style={{
              position: "relative",
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
          <p
            style={{ color: "var(--ink-faint)", fontSize: 12.5, marginTop: 8 }}
          >
            Works with a pressure-sensitive pen/stylus, or mouse and touch as a
            fallback.
          </p>
        </div>

        <div style={{ width: 220, flexShrink: 0 }}>
          <div className="page-header">Saved</div>
          {drawings.length === 0 && (
            <p style={{ color: "var(--ink-faint)", fontSize: 13.5 }}>
              No drawings yet.
            </p>
          )}
          {drawings.map((d) => (
            <div
              key={d.id}
              onClick={() => loadDrawing(d)}
              className="card"
              style={{
                padding: "10px 12px",
                marginBottom: 8,
                cursor: "pointer",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                borderColor:
                  d.id === currentId ? "var(--accent)" : "var(--line)",
              }}
            >
              <span
                style={{
                  fontSize: 13.5,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {d.title}
              </span>
              <button
                className="btn btn-icon"
                onClick={(e) => removeDrawing(d.id, e)}
                style={{ border: "none", background: "transparent" }}
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
