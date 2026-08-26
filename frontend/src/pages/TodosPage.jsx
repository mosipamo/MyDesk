import { useEffect, useMemo, useRef, useState } from "react";
import { Plus, Pencil, Trash2, AlarmClock, ListTodo, CircleDot } from "lucide-react";
import { api } from "../api.js";
import EmptyState from "../components/EmptyState.jsx";
import ProgressRing from "../components/ProgressRing.jsx";
import TodoFormModal from "../components/TodoFormModal.jsx";

function formatDue(value) {
  const d = new Date(`${value}T00:00:00`);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function isOverdue(todo) {
  if (!todo.due_date || todo.done) return false;
  return todo.due_date < todayStr();
}

function overdueDays(todo) {
  const due = new Date(`${todo.due_date}T00:00:00`).getTime();
  const now = new Date(`${todayStr()}T00:00:00`).getTime();
  return Math.max(0, Math.round((now - due) / 86400000));
}

function TodoCheck({ checked, onClick }) {
  return (
    <button
      type="button"
      className={`todo-check${checked ? " checked" : ""}`}
      onClick={onClick}
      aria-label={checked ? "Mark as active" : "Mark as complete"}
      title="Toggle complete"
    >
      <svg viewBox="0 0 16 16" aria-hidden="true">
        <path d="M3 8.5l3.5 3.5L13 4.5" pathLength="1" />
      </svg>
    </button>
  );
}

export default function TodosPage() {
  const [todos, setTodos] = useState([]);
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("priority-desc");
  const [toastMsg, setToastMsg] = useState("");
  const [toastVisible, setToastVisible] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTodo, setEditingTodo] = useState(null);
  const notifiedRef = useRef(false);

  function showToast(message) {
    setToastMsg(message);
    setToastVisible(true);
    clearTimeout(showToast._timer);
    showToast._timer = setTimeout(() => setToastVisible(false), 2600);
  }

  function refresh() {
    api
      .listTodos()
      .then((list) => {
        setTodos(list);
        if (!notifiedRef.current) {
          notifiedRef.current = true;
          const overdue = list.filter(isOverdue).length;
          if (overdue > 0) {
            showToast(`Heads up — ${overdue} task${overdue > 1 ? "s are" : " is"} overdue`);
          }
        }
      })
      .catch(() => showToast("Could not load todos"));
  }

  useEffect(refresh, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function toggle(todo) {
    const next = !todo.done;
    setTodos((ts) => ts.map((t) => (t.id === todo.id ? { ...t, done: next } : t)));
    try {
      await api.updateTodo(todo.id, { done: next });
      showToast(next ? "Marked complete" : "Marked active");
    } catch {
      showToast("Could not update status");
      refresh();
    }
  }

  function openNew() {
    setEditingTodo(null);
    setModalOpen(true);
  }

  function openEdit(todo) {
    setEditingTodo(todo);
    setModalOpen(true);
  }

  async function remove(todo) {
    if (!window.confirm("Delete this todo? This cannot be undone.")) return;
    try {
      await api.deleteTodo(todo.id);
      refresh();
      showToast("Todo deleted");
    } catch {
      showToast("Could not delete todo");
    }
  }

  function handleSaved(message) {
    refresh();
    showToast(message);
  }

  const total = todos.length;
  const doneCount = todos.filter((t) => t.done).length;
  const activeCount = total - doneCount;
  const overdueCount = todos.filter(isOverdue).length;

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = todos.filter((t) => {
      const matchesFilter =
        filter === "all" ||
        (filter === "active" && !t.done) ||
        (filter === "done" && t.done);
      const haystack = `${t.text || ""} ${t.description || ""}`.toLowerCase();
      return matchesFilter && (!q || haystack.includes(q));
    });
    const sorted = [...filtered];
    switch (sort) {
      case "priority-asc":
        sorted.sort((a, b) => a.priority - b.priority);
        break;
      case "title-asc":
        sorted.sort((a, b) => (a.text || "").localeCompare(b.text || ""));
        break;
      case "title-desc":
        sorted.sort((a, b) => (b.text || "").localeCompare(a.text || ""));
        break;
      default:
        sorted.sort((a, b) => b.priority - a.priority);
    }
    return sorted;
  }, [todos, filter, query, sort]);

  return (
    <div>
      <div className="page-header">Tasks</div>
      <div className="page-title-row">
        <div>
          <h1 className="page-title">Todos</h1>
          <p className="page-sub">
            {activeCount === 0 && total > 0
              ? "All clear — enjoy the calm."
              : `Plan, prioritize, and clear your list. ${activeCount} active.`}
          </p>
        </div>
        <button type="button" className="btn btn-primary" onClick={openNew}>
          <Plus size={16} />
          New todo
        </button>
      </div>

      <div className="stats-row four">
        <div className="stat-chip ring-card accent">
          <ProgressRing value={doneCount} max={total} label={`${doneCount} of ${total} done`} />
          <div>
            <span className="label">Progress</span>
            <span className="value" style={{ fontSize: "1.15rem" }}>
              {doneCount} / {total} done
            </span>
          </div>
        </div>
        <div className="stat-chip">
          <span className="stat-icon"><ListTodo size={20} /></span>
          <div>
            <span className="label">Total</span>
            <span className="value">{total}</span>
          </div>
        </div>
        <div className="stat-chip warn">
          <span className="stat-icon"><CircleDot size={20} /></span>
          <div>
            <span className="label">Active</span>
            <span className="value">{activeCount}</span>
          </div>
        </div>
        <div className={`stat-chip danger${overdueCount === 0 ? " calm" : ""}`}>
          <span className="stat-icon"><AlarmClock size={20} /></span>
          <div>
            <span className="label">Overdue</span>
            <span className="value">{overdueCount}</span>
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-header">
          <strong>Task list</strong>
          <span style={{ color: "var(--muted)", fontSize: 13 }}>{visible.length} shown</span>
        </div>
        <div className="panel-body">
          <div className="todo-toolbar">
            <div className="filter-group" role="group" aria-label="Filter todos">
              {[
                ["all", "All"],
                ["active", "Active"],
                ["done", "Done"],
              ].map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  className={`filter-btn${filter === key ? " active" : ""}`}
                  onClick={() => setFilter(key)}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="search-wrap">
              <input
                type="search"
                placeholder="Search title or description…"
                aria-label="Search todos"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <select
              className="sort-select"
              aria-label="Sort todos"
              value={sort}
              onChange={(e) => setSort(e.target.value)}
            >
              <option value="priority-desc">Priority: high → low</option>
              <option value="priority-asc">Priority: low → high</option>
              <option value="title-asc">Title: A → Z</option>
              <option value="title-desc">Title: Z → A</option>
            </select>
          </div>

          {visible.length > 0 && (
            <ul className="todo-list">
              {visible.map((todo, i) => (
                <li
                  key={todo.id}
                  className={`todo-item${todo.done ? " complete" : ""}${isOverdue(todo) ? " overdue" : ""}`}
                  style={{ animationDelay: `${i * 0.04}s` }}
                >
                  <TodoCheck checked={todo.done} onClick={() => toggle(todo)} />
                  <div className="todo-main">
                    <h3 className="todo-title">{todo.text}</h3>
                    {todo.description && <p className="todo-desc">{todo.description}</p>}
                    <div className="todo-meta">
                      <span className={`priority-badge p${todo.priority}`}>
                        <span className="dot" />
                        Priority {todo.priority}
                      </span>
                      <span className={`status-pill${todo.done ? " done" : ""}`}>
                        {todo.done ? "Completed" : "In progress"}
                      </span>
                      {todo.due_date && (
                        <span className={`due-chip${isOverdue(todo) ? " overdue" : ""}`}>
                          {isOverdue(todo)
                            ? `${overdueDays(todo)} day${overdueDays(todo) > 1 ? "s" : ""} overdue`
                            : `Due ${formatDue(todo.due_date)}`}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="todo-actions">
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => openEdit(todo)}
                      title="Edit todo"
                    >
                      <Pencil size={13} />
                      Edit
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm btn-danger-ghost"
                      onClick={() => remove(todo)}
                      title="Delete todo"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {total === 0 && (
            <EmptyState
              variant="todo"
              title="No todos yet"
              hint="Add your first task and start clearing the day."
              action={
                <button className="btn btn-primary" onClick={openNew}>
                  <Plus size={15} />
                  New todo
                </button>
              }
            />
          )}

          {total > 0 && visible.length === 0 && (
            <EmptyState
              variant="search"
              title="Nothing matches"
              hint="Try another filter or search term."
            />
          )}
        </div>
      </div>

      <TodoFormModal
        open={modalOpen}
        todo={editingTodo}
        onSaved={handleSaved}
        onClose={() => setModalOpen(false)}
      />

      <div className={`toast-msg${toastVisible ? " show" : ""}`} role="status">
        {toastMsg}
      </div>
    </div>
  );
}
