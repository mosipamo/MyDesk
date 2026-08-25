import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
} from "date-fns";
import { ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import { api } from "../api.js";

const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function CalendarPage() {
  const [cursor, setCursor] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [todos, setTodos] = useState([]);
  const [selectedDay, setSelectedDay] = useState(new Date());
  const [newTitle, setNewTitle] = useState("");
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const requestedDate = searchParams.get("date");
    if (!requestedDate) return;
    const d = new Date(`${requestedDate}T00:00:00`);
    if (Number.isNaN(d.getTime())) return;
    setCursor(d);
    setSelectedDay(d);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(cursor));
    const end = endOfWeek(endOfMonth(cursor));
    return eachDayOfInterval({ start, end });
  }, [cursor]);

  function refresh() {
    const start = format(days[0], "yyyy-MM-dd");
    const end = format(days[days.length - 1], "yyyy-MM-dd");
    api.listEvents(start, end).then(setEvents).catch(console.error);
    api.listTodos().then(setTodos).catch(console.error);
  }

  useEffect(refresh, [cursor]); // eslint-disable-line react-hooks/exhaustive-deps

  function itemsFor(day) {
    const key = format(day, "yyyy-MM-dd");
    return [
      ...events
        .filter((e) => e.event_date === key)
        .map((e) => ({ kind: "event", id: `ev-${e.id}`, title: e.title })),
      ...todos
        .filter((t) => t.due_date === key)
        .map((t) => ({ kind: "todo", id: `td-${t.id}`, title: t.text, done: t.done })),
    ];
  }

  async function addEvent(e) {
    e.preventDefault();
    if (!newTitle.trim()) return;
    await api.createEvent({
      title: newTitle.trim(),
      event_date: format(selectedDay, "yyyy-MM-dd"),
      all_day: true,
    });
    setNewTitle("");
    refresh();
  }

  async function removeEvent(id) {
    await api.deleteEvent(id);
    refresh();
  }

  const selectedKey = format(selectedDay, "yyyy-MM-dd");
  const selectedEvents = events.filter((e) => e.event_date === selectedKey);
  const selectedTodos = todos
    .filter((t) => t.due_date === selectedKey)
    .sort((a, b) => Number(a.done) - Number(b.done) || b.priority - a.priority);

  async function toggleTodo(todo) {
    await api.updateTodo(todo.id, { done: !todo.done });
    refresh();
  }
  return (
    <div>
      <div className="page-header">Schedule</div>
      <h1 className="page-title">Calendar</h1>

      <div style={{ display: "flex", gap: 28 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
            <button className="btn btn-icon" onClick={() => setCursor((c) => subMonths(c, 1))}>
              <ChevronLeft size={16} />
            </button>
            <div style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 15, width: 150, textAlign: "center" }}>
              {format(cursor, "MMMM yyyy")}
            </div>
            <button className="btn btn-icon" onClick={() => setCursor((c) => addMonths(c, 1))}>
              <ChevronRight size={16} />
            </button>
            <button className="btn" onClick={() => { setCursor(new Date()); setSelectedDay(new Date()); }}>
              Today
            </button>
          </div>

          <div className="calendar-grid">
            {DOW.map((d) => (
              <div key={d} className="calendar-dow">{d}</div>
            ))}
            {days.map((day) => {
              const items = itemsFor(day);
              return (
                <div
                  key={day.toISOString()}
                  className={`calendar-cell${!isSameMonth(day, cursor) ? " outside" : ""}${isSameDay(day, new Date()) ? " today" : ""}`}
                  style={isSameDay(day, selectedDay) ? { outline: "2px solid var(--accent)" } : undefined}
                  onClick={() => setSelectedDay(day)}
                >
                  <div className="calendar-daynum">{format(day, "d")}</div>
                  {items.slice(0, 3).map((item) =>
                    item.kind === "event" ? (
                      <div key={item.id} className="calendar-event-pill">{item.title}</div>
                    ) : (
                      <div key={item.id} className={`calendar-todo-pill${item.done ? " done" : ""}`}>
                        {item.title}
                      </div>
                    )
                  )}
                  {items.length > 3 && (
                    <div className="calendar-more">+{items.length - 3} more</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ width: 260, flexShrink: 0 }}>
          <div className="page-header">{format(selectedDay, "EEEE, MMM d")}</div>
          <form onSubmit={addEvent} style={{ display: "flex", gap: 6, marginBottom: 14 }}>
            <input
              type="text"
              placeholder="Add event…"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              style={{ flex: 1 }}
            />
            <button type="submit" className="btn btn-primary">Add</button>
          </form>
          {selectedEvents.length === 0 && selectedTodos.length === 0 && (
            <p style={{ color: "var(--ink-faint)", fontSize: 13.5 }}>Nothing on this day.</p>
          )}
          {selectedEvents.length > 0 && (
            <div className="page-header" style={{ marginBottom: 8 }}>Events</div>
          )}
          {selectedEvents.map((ev) => (
            <div
              key={ev.id}
              className="card"
              style={{ padding: "8px 12px", marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}
            >
              <span style={{ fontSize: 13.5 }}>{ev.title}</span>
              <button
                className="btn btn-icon"
                onClick={() => removeEvent(ev.id)}
                style={{ border: "none", background: "transparent" }}
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
          {selectedTodos.length > 0 && (
            <>
              <div className="page-header" style={{ margin: "16px 0 8px" }}>Due tasks</div>
              {selectedTodos.map((t) => (
                <div
                  key={t.id}
                  className="card"
                  style={{ padding: "8px 12px", marginBottom: 8, display: "flex", gap: 8, alignItems: "center", opacity: t.done ? 0.6 : 1 }}
                >
                  <input
                    type="checkbox"
                    checked={t.done}
                    onChange={() => toggleTodo(t)}
                    style={{ accentColor: "var(--accent)" }}
                  />
                  <span
                    style={{
                      fontSize: 13.5,
                      flex: 1,
                      textDecoration: t.done ? "line-through" : "none",
                    }}
                  >
                    {t.text}
                  </span>
                  <span className={`priority-badge p${t.priority}`}>P{t.priority}</span>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
