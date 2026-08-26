import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  PenLine,
  ListTodo,
  FileText,
  CalendarDays,
  Search,
  CornerDownLeft,
  Compass,
  Timer,
  BarChart3,
} from "lucide-react";
import { api } from "../api.js";

const GROUP_ICONS = {
  Pages: Compass,
  Notes: FileText,
  Todos: ListTodo,
  Events: CalendarDays,
};

const PAGE_ITEMS = [
  { key: "page-home", group: "Pages", label: "Home", sub: "Dashboard overview", to: "/" },
  { key: "page-stats", group: "Pages", label: "Stats", sub: "Productivity plots", to: "/stats" },
  { key: "page-todos", group: "Pages", label: "Todos", sub: "Task list", to: "/todos" },
  { key: "page-notes", group: "Pages", label: "Notes", sub: "Live markdown editor", to: "/notes" },
  { key: "page-calendar", group: "Pages", label: "Calendar", sub: "Month view", to: "/calendar" },
  { key: "page-canvas", group: "Pages", label: "Canvas", sub: "Drawing board", to: "/canvas" },
  { key: "page-focus", group: "Pages", label: "Focus", sub: "Pomodoro timer", to: "/focus" },
];

export default function CommandPalette() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [notes, setNotes] = useState([]);
  const [todos, setTodos] = useState([]);
  const [events, setEvents] = useState([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
    setActiveIndex(0);
  }, []);

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    Promise.all([api.listNotes(), api.listTodos(), api.listEvents()])
      .then(([n, t, e]) => {
        setNotes(n);
        setTodos(t);
        setEvents(e);
      })
      .catch(() => {});
  }, [open]);

  useEffect(() => {
    function onKeydown(e) {
      // Capture phase + unconditional preventDefault so the browser never
      // gets a chance to run its own Ctrl+K behaviour (address-bar search,
      // Edge tab actions, …).
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        e.stopPropagation();
        setOpen((o) => !o);
        return;
      }
      if (e.key === "Escape") {
        setOpen(false);
        return;
      }
      if (e.key === "/" && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const typing = e.target?.closest?.(
          "input, textarea, select, [contenteditable]"
        );
        if (!typing) {
          e.preventDefault();
          setOpen(true);
        }
      }
    }
    function onOpenEvent() {
      setOpen(true);
    }
    window.addEventListener("keydown", onKeydown, true);
    window.addEventListener("cmdk-open", onOpenEvent);
    return () => {
      window.removeEventListener("keydown", onKeydown, true);
      window.removeEventListener("cmdk-open", onOpenEvent);
    };
  }, []);

  const items = useMemo(() => {
    const noteItems = notes.slice(0, 50).map((n) => ({
      key: `note-${n.id}`,
      group: "Notes",
      label: n.title || "Untitled",
      sub: (n.content || "").replace(/[#*`>\-\[\]]/g, "").slice(0, 60),
      haystack: `${n.title || ""} ${n.content || ""}`.toLowerCase(),
      run: () => navigate(`/notes?note=${n.id}`),
    }));
    const todoItems = todos.slice(0, 200).map((t) => ({
      key: `todo-${t.id}`,
      group: "Todos",
      label: t.text,
      sub: t.due_date
        ? `Due ${t.due_date} · P${t.priority}`
        : `Priority ${t.priority}`,
      haystack: `${t.text || ""} ${t.description || ""}`.toLowerCase(),
      run: () => navigate("/todos"),
    }));
    const eventItems = events.slice(0, 200).map((e) => ({
      key: `event-${e.id}`,
      group: "Events",
      label: e.title,
      sub: e.event_date,
      haystack: `${e.title || ""}`.toLowerCase(),
      run: () => navigate(`/calendar?date=${e.event_date}`),
    }));
    return [...PAGE_ITEMS.map((p) => ({ ...p, haystack: `${p.label} ${p.sub}`.toLowerCase(), run: () => navigate(p.to) })), ...noteItems, ...todoItems, ...eventItems];
  }, [notes, todos, events, navigate]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((i) => i.haystack.includes(q));
  }, [items, query]);

  const groups = useMemo(() => {
    const order = ["Pages", "Notes", "Todos", "Events"];
    return order
      .map((g) => ({ name: g, items: filtered.filter((i) => i.group === g).slice(0, 6) }))
      .filter((g) => g.items.length > 0);
  }, [filtered]);

  const flat = useMemo(() => groups.flatMap((g) => g.items), [groups]);

  useEffect(() => {
    setActiveIndex((i) => Math.min(i, Math.max(flat.length - 1, 0)));
  }, [flat.length]);

  useEffect(() => {
    const el = listRef.current?.querySelector('[data-active="true"]');
    el?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  function runItem(item) {
    if (!item) return;
    close();
    item.run();
  }

  function onInputKeyDown(e) {
    if (e.key === "Escape") {
      e.preventDefault();
      close();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (flat.length === 0 ? 0 : (i + 1) % flat.length));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (flat.length === 0 ? 0 : (i - 1 + flat.length) % flat.length));
    } else if (e.key === "Enter") {
      e.preventDefault();
      runItem(flat[activeIndex]);
    }
  }

  let flatIdx = -1;

  if (!open) return null;

  return (
    <div
      className="cmdk-overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div className="cmdk-panel">
        <div className="cmdk-input-row">
          <Search size={17} />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search notes, todos, events…"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveIndex(0);
            }}
            onKeyDown={onInputKeyDown}
            aria-label="Quick find"
          />
          <kbd>esc</kbd>
        </div>

        <div className="cmdk-results" ref={listRef}>
          {flat.length === 0 && (
            <div className="cmdk-empty">No matches for “{query.trim()}”</div>
          )}
          {groups.map((group) => {
            const GroupIcon = GROUP_ICONS[group.name];
            return (
              <div key={group.name}>
                <div className="cmdk-group-label">
                  {GroupIcon && <GroupIcon size={12} />}
                  {group.name}
                </div>
                {group.items.map((item) => {
                  flatIdx += 1;
                  const idx = flatIdx;
                  const isActive = idx === activeIndex;
                  return (
                    <button
                      key={item.key}
                      type="button"
                      className={`cmdk-item${isActive ? " active" : ""}`}
                      data-active={isActive}
                      onMouseEnter={() => setActiveIndex(idx)}
                      onClick={() => runItem(item)}
                    >
                      {isActive && <CornerDownLeft size={14} />}
                      <span className="cmdk-item-label">
                        {highlight(item.label, query)}
                      </span>
                      {item.sub && <span className="cmdk-item-sub">{item.sub}</span>}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>

        <div className="cmdk-footer">
          <span><kbd>↑</kbd><kbd>↓</kbd> navigate</span>
          <span><CornerDownLeft size={11} /> open</span>
          <span style={{ marginLeft: "auto" }}>Ctrl K</span>
        </div>
      </div>
    </div>
  );
}

function highlight(text, query) {
  const q = query.trim();
  if (!q) return text;
  const idx = text.toLowerCase().indexOf(q.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark>{text.slice(idx, idx + q.length)}</mark>
      {text.slice(idx + q.length)}
    </>
  );
}
