import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import {
  ListTodo,
  CalendarDays,
  FileText,
  PenLine,
  Star,
  Sun,
  Sunset,
  Moon,
  Plus,
  AlarmClock,
  CalendarPlus,
} from "lucide-react";
import { api } from "../api.js";
import DrawingThumb, { parseStrokes } from "../components/DrawingThumb.jsx";

function greeting() {
  const h = new Date().getHours();
  if (h < 5) return { text: "Burning the midnight oil", Icon: Moon };
  if (h < 12) return { text: "Good morning", Icon: Sun };
  if (h < 18) return { text: "Good afternoon", Icon: Sun };
  return { text: "Good evening", Icon: Sunset };
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const [todos, setTodos] = useState([]);
  const [notes, setNotes] = useState([]);
  const [drawings, setDrawings] = useState([]);
  const [weekEvents, setWeekEvents] = useState([]);
  const today = format(new Date(), "yyyy-MM-dd");
  const weekEnd = format(new Date(Date.now() + 7 * 86400000), "yyyy-MM-dd");

  useEffect(() => {
    api.listTodos().then(setTodos).catch(console.error);
    api.listNotes().then(setNotes).catch(console.error);
    api.listDrawings().then(setDrawings).catch(console.error);
    api.listEvents(today, weekEnd).then(setWeekEvents).catch(console.error);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const open = todos.filter((t) => !t.done);
  const dueToday = open.filter((t) => t.due_date === today);
  const overdue = open.filter((t) => t.due_date && t.due_date < today);
  const todaysEvents = weekEvents.filter((e) => e.event_date === today);

  async function toggleTodo(todo) {
    const next = !todo.done;
    setTodos((ts) => ts.map((t) => (t.id === todo.id ? { ...t, done: next } : t)));
    try {
      await api.updateTodo(todo.id, { done: next });
    } catch {
      setTodos((ts) => ts.map((t) => (t.id === todo.id ? { ...t, done: !next } : t)));
    }
  }

  async function quickNote() {
    const created = await api.createNote({ title: "Untitled", content: "" });
    navigate(`/notes?note=${created.id}`);
  }

  const recentNotes = useMemo(() => notes.slice(0, 6), [notes]);
  const recentDrawings = useMemo(
    () =>
      drawings.slice(0, 4).map((d) => ({
        ...d,
        strokes: parseStrokes(d.strokes),
      })),
    [drawings]
  );

  const { text, Icon } = greeting();

  return (
    <div>
      <div className="dash-hero">
        <h1 className="page-title">
          <Icon size={30} strokeWidth={2} />
          {text}
        </h1>
        <p className="dash-date">
          {format(new Date(), "EEEE, MMMM d, yyyy")}
          {" · "}
          {open.length === 0 && todos.length > 0
            ? "everything's done"
            : `${open.length} open task${open.length === 1 ? "" : "s"}`}
          {overdue.length > 0 && `, ${overdue.length} overdue`}
        </p>
      </div>

      <div className="quick-actions" style={{ marginBottom: 22 }}>
        <button className="btn btn-primary" onClick={quickNote}>
          <Plus size={15} />
          New note
        </button>
        <button className="btn" onClick={() => navigate("/canvas")}>
          <PenLine size={15} />
          Start drawing
        </button>
        <button className="btn" onClick={() => navigate("/todos")}>
          <ListTodo size={15} />
          Add a task
        </button>
        <button className="btn" onClick={() => navigate("/calendar")}>
          <CalendarPlus size={15} />
          Plan the week
        </button>
      </div>

      <div className="dash-grid">
        <section className="dash-card span-4">
          <div className="dash-card-head">
            <span className="dash-card-title">
              <AlarmClock size={14} />
              Due today
            </span>
            <span className="sub" style={{ color: "var(--muted)", fontSize: 12 }}>
              {dueToday.length}
            </span>
          </div>
          {dueToday.length === 0 && (
            <p className="dash-empty">Nothing due today — nice.</p>
          )}
          {dueToday.map((t, i) => (
            <label key={t.id} className="mini-row" style={{ animationDelay: `${i * 0.05}s`, cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={false}
                onChange={() => toggleTodo(t)}
                style={{ accentColor: "var(--accent)" }}
              />
              <span className="grow">{t.text}</span>
              <span className={`priority-badge p${t.priority}`}>
                <span className="dot" />
                P{t.priority}
              </span>
            </label>
          ))}
          {overdue.length > 0 && (
            <>
              <div className="day-section-label">Overdue</div>
              {overdue.map((t, i) => (
                <label key={t.id} className="mini-row" style={{ cursor: "pointer", animationDelay: `${i * 0.05}s` }}>
                  <input
                    type="checkbox"
                    checked={false}
                    onChange={() => toggleTodo(t)}
                    style={{ accentColor: "var(--danger)" }}
                  />
                  <span className="grow done-text">{t.text}</span>
                  <span className="due-chip overdue">{t.due_date}</span>
                </label>
              ))}
            </>
          )}
        </section>

        <section className="dash-card span-4">
          <div className="dash-card-head">
            <span className="dash-card-title">
              <CalendarDays size={14} />
              Today & this week
            </span>
            <span className="sub" style={{ color: "var(--muted)", fontSize: 12 }}>
              {weekEvents.length}
            </span>
          </div>
          {todaysEvents.length === 0 && weekEvents.length === 0 && (
            <p className="dash-empty">A quiet week ahead.</p>
          )}
          {todaysEvents.map((e) => (
            <div key={`t-${e.id}`} className="mini-row" onClick={() => navigate(`/calendar?date=${today}`)}>
              <span className="calendar-event-pill" style={{ flexShrink: 0 }}>today</span>
              <span className="grow">{e.title}</span>
            </div>
          ))}
          {weekEvents
            .filter((e) => e.event_date !== today)
            .slice(0, 6)
            .map((e, i) => (
              <div key={e.id} className="mini-row" style={{ animationDelay: `${i * 0.04}s` }} onClick={() => navigate(`/calendar?date=${e.event_date}`)}>
                <span className="sub" style={{ minWidth: 46 }}>{format(new Date(`${e.event_date}T00:00:00`), "EEE d")}</span>
                <span className="grow">{e.title}</span>
              </div>
            ))}
        </section>

        <section className="dash-card span-4">
          <div className="dash-card-head">
            <span className="dash-card-title">
              <FileText size={14} />
              Recent notes
            </span>
            <span className="sub" style={{ color: "var(--muted)", fontSize: 12 }}>
              {notes.length}
            </span>
          </div>
          {recentNotes.length === 0 && <p className="dash-empty">No notes yet.</p>}
          {recentNotes.map((n, i) => (
            <div
              key={n.id}
              className="mini-row"
              style={{ animationDelay: `${i * 0.05}s` }}
              onClick={() => navigate(`/notes?note=${n.id}`)}
            >
              {n.pinned && <Star size={12} fill="var(--warn)" color="var(--warn)" />}
              <span className="grow">{n.title || "Untitled"}</span>
            </div>
          ))}
        </section>

        <section className="dash-card span-12">
          <div className="dash-card-head">
            <span className="dash-card-title">
              <ListTodo size={14} />
              Open tasks
            </span>
            <span className="sub" style={{ color: "var(--muted)", fontSize: 12 }}>
              {open.length}
            </span>
          </div>
          {open.length === 0 && <p className="dash-empty">Inbox zero energy.</p>}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "2px 18px" }}>
            {open.slice(0, 10).map((t, i) => (
              <label key={t.id} className="mini-row" style={{ cursor: "pointer", animationDelay: `${Math.min(i * 0.04, 0.3)}s` }}>
                <input
                  type="checkbox"
                  checked={false}
                  onChange={() => toggleTodo(t)}
                  style={{ accentColor: "var(--accent)" }}
                />
                <span className="grow">{t.text}</span>
                {t.due_date && (
                  <span className={`due-chip${t.due_date < today ? " overdue" : ""}`}>
                    {t.due_date === today ? "today" : t.due_date}
                  </span>
                )}
                <span className={`priority-badge p${t.priority}`}>
                  <span className="dot" />
                  P{t.priority}
                </span>
              </label>
            ))}
          </div>
        </section>

        {recentDrawings.length > 0 && (
          <section className="dash-card span-12">
            <div className="dash-card-head">
              <span className="dash-card-title">
                <PenLine size={14} />
                Recent drawings
              </span>
            </div>
            <div className="thumb-grid">
              {recentDrawings.map((d, i) => (
                <div
                  key={d.id}
                  className="thumb-card"
                  style={{ animationDelay: `${i * 0.07}s` }}
                  onClick={() => navigate("/canvas")}
                  title={`${d.title} — open canvas`}
                >
                  <DrawingThumb strokes={d.strokes} />
                  <div className="thumb-card-name">{d.title}</div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
