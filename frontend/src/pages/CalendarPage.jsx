import { useEffect, useMemo, useRef, useState } from "react";
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
import { ChevronLeft, ChevronRight, Trash2, CalendarPlus } from "lucide-react";
import { api } from "../api.js";

const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function CalendarPage() {
  const [cursor, setCursor] = useState(new Date());
  const [direction, setDirection] = useState(null); // "prev" | "next"
  const [events, setEvents] = useState([]);
  const [todos, setTodos] = useState([]);
  const [selectedDay, setSelectedDay] = useState(new Date());
  const [newTitle, setNewTitle] = useState("");
  const [searchParams] = useSearchParams();
  const inputRef = useRef(null);

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

  function goMonth(fn) {
    setDirection(fn === addMonths ? "next" : "prev");
    setCursor((c) => fn(c, 1));
  }

  function itemsFor(day) {
    const key = format(day, "yyyy-MM-dd");
    return [
      ...events
        .filter((e) => e.event_date === key)
        .map((e) => ({ kind: "event", id: `ev-${e.id}`, title: e.title })),
      ...todos
        .filter((t) => t.due_date === key)
        .map((t) => ({
          kind: "todo",
          id: `td-${t.id}`,
          title: t.text,
          done: t.done,
          priority: t.priority,
        })),
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
    if (!window.confirm("Delete this event?")) return;
    await api.deleteEvent(id);
    refresh();
  }

  const selectedKey = format(selectedDay, "yyyy-MM-dd");
  const today = format(new Date(), "yyyy-MM-dd");
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
      <div className="page-title-row">
        <div>
          <h1 className="page-title">Calendar</h1>
          <p className="page-sub">Events and task due dates, side by side.</p>
        </div>
      </div>

      <div style={{ display: "flex", gap: 28, alignItems: "flex-start", flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 480 }}>
          <div className="calendar-toolbar">
            <button
              type="button"
              className="btn btn-icon"
              onClick={() => goMonth(subMonths)}
              aria-label="Previous month"
            >
              <ChevronLeft size={16} />
            </button>
            <div className="calendar-month-label">{format(cursor, "MMMM yyyy")}</div>
            <button
              type="button"
              className="btn btn-icon"
              onClick={() => goMonth(addMonths)}
              aria-label="Next month"
            >
              <ChevronRight size={16} />
            </button>
            <button
              type="button"
              className="btn btn-sm"
              onClick={() => {
                setCursor(new Date());
                setSelectedDay(new Date());
                setDirection(null);
              }}
            >
              Today
            </button>
          </div>

          <div className="calendar-frame">
            <div
              key={format(cursor, "yyyy-MM")}
              className={`calendar-grid${
                direction ? ` slide-in-${direction}` : ""
              }`}
            >
              {DOW.map((d) => (
                <div key={d} className="calendar-dow">
                  {d}
                </div>
              ))}
              {days.map((day) => {
                const items = itemsFor(day);
                const isToday = isSameDay(day, new Date());
                const isSelected = isSameDay(day, selectedDay);
                return (
                  <div
                    key={day.toISOString()}
                    className={[
                      "calendar-cell",
                      !isSameMonth(day, cursor) ? "outside" : "",
                      isSelected ? "selected" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    onClick={() => setSelectedDay(day)}
                  >
                    <div className="calendar-daynum">
                      {isToday && <span className="today-dot" />}
                      {format(day, "d")}
                    </div>
                    {items.slice(0, 3).map((item) =>
                      item.kind === "event" ? (
                        <div key={item.id} className="calendar-event-pill">
                          {item.title}
                        </div>
                      ) : (
                        <div
                          key={item.id}
                          className={`calendar-todo-pill${item.priority <= 2 ? " prio-low" : ""}${
                            item.done ? " done" : ""
                          }`}
                        >
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
        </div>

        <div className="day-panel" style={{ width: 280 }}>
          <input
            ref={inputRef}
            type="date"
            value={selectedKey}
            onChange={(e) => {
              if (!e.target.value) return;
              const d = new Date(`${e.target.value}T00:00:00`);
              if (!Number.isNaN(d.getTime())) {
                setCursor(d);
                setSelectedDay(d);
              }
            }}
            aria-label="Selected day"
            style={{ width: "100%", marginBottom: 12, fontWeight: 600 }}
          />

          <form onSubmit={addEvent} className="add-event-form">
            <input
              type="text"
              placeholder={`Add event on ${format(selectedDay, "MMM d")}…`}
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              aria-label="New event title"
            />
            <button type="submit" className="btn btn-primary btn-icon" aria-label="Add event">
              <CalendarPlus size={16} />
            </button>
          </form>

          {selectedEvents.length === 0 && selectedTodos.length === 0 && (
            <p style={{ color: "var(--muted)", fontSize: 13.5, textAlign: "center", padding: "18px 0 10px" }}>
              Nothing planned. Enjoy the open day ✨
            </p>
          )}

          {selectedEvents.length > 0 && (
            <>
              <div className="day-section-label">Events</div>
              {selectedEvents.map((ev, i) => (
                <div key={ev.id}                   className={`day-row${!t.done && t.due_date < today ? " overdue" : ""}`}
                  style={{ animationDelay: `${i * 0.05}s` }}>
                  <span className="grow">{ev.title}</span>
                  <button
                    type="button"
                    className="delete-inline"
                    style={{ opacity: 1 }}
                    aria-label={`Delete ${ev.title}`}
                    onClick={() => removeEvent(ev.id)}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </>
          )}

          {selectedTodos.length > 0 && (
            <>
              <div className="day-section-label">Due tasks</div>
              {selectedTodos.map((t, i) => (
                <label
                  key={t.id}
                  className={`day-row${!t.done && t.due_date < today ? " overdue" : ""}`}
                  style={{
                    animationDelay: `${(selectedEvents.length + i) * 0.05}s`,
                    cursor: "pointer",
                    opacity: t.done ? 0.65 : 1,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={t.done}
                    onChange={() => toggleTodo(t)}
                    style={{ accentColor: "var(--accent)" }}
                  />
                  <span className={`grow${t.done ? " done-text" : ""}`}>{t.text}</span>
                  <span className={`priority-badge p${t.priority}`}>
                    <span className="dot" />
                    P{t.priority}
                  </span>
                </label>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
