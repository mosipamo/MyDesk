// Shared drawing-stroke utilities: safe JSON parsing + scaled thumbnails.

export function parseStrokes(raw) {
  try {
    const data = JSON.parse(raw || "[]");
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export function paintStrokes(ctx, strokes, width, height) {
  if (!ctx) return;
  ctx.clearRect(0, 0, width, height);
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

export default function DrawingThumb({ strokes }) {
  return (
    <canvas
      width={206}
      height={140}
      aria-hidden="true"
      ref={(el) => {
        if (!el) return;
        const ctx = el.getContext("2d");
        const scale = Math.min(el.width / 760, el.height / 520);
        ctx.setTransform(scale, 0, 0, scale, 0, 0);
        paintStrokes(ctx, strokes, 760, 520);
        ctx.setTransform(1, 0, 0, 1, 0, 0);
      }}
    />
  );
}
