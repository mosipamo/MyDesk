import { useEffect, useMemo, useState } from "react";
import { api } from "../api.js";

const PRIORITIES = [
  { value: 1, label: "1 · Low" },
  { value: 2, label: "2 · Mild" },
  { value: 3, label: "3 · Normal" },
  { value: 4, label: "4 · High" },
  { value: 5, label: "5 · Urgent" },
];

const emptyForm = { text: "", description: "", priority: 3, due_date: "", done: false };

function formatDue(value) {
  const d = new Date(`${value}T00:00:00`);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function isOverdue(todo) {
  if (!todo.due_date || todo.done) return false;
  return todo.due_date < new Date().toISOString().slice(0, 10);
}

export default function TodosPage() {
  const [todos, setTodos] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("priority-desc");
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(emptyForm);
  const [toastMsg, setToastMsg] = useState("");
  const [toastVisible, setToastVisible] = useState(false);

  function showToast(message) {
    setToastMsg(message);
    setToastVisible(true);
    clearTimeout(showToast._timer);
    showToast._timer = setTimeout(() => setToastVisible(false), 2600);
  }

  function refresh() {
    api
      .listTodos()
      .then(setTodos)
      .catch(() => showToast("Could not load todos"));
  }

  useEffect(refresh, []);

  async function addTodo(e) {
    e.preventDefault();
    if (!form.text.trim()) {
      showToast("Give the task a title first");
      return;
    }
    try {
      await api.createTodo({
        text: form.text.trim(),
        description: form.description.trim(),
        priority: Number(form.priority),
        due_date: form.due_date || null,
        position: todos.length,
      });
      setForm(emptyForm);
      refresh();
      showToast("Todo added");
    } catch (err) {
      console.error(err);
      showToast("Could not add todo");
    }
  }

  async function toggle(todo) {
    const next = !todo.done;
    setTodos((ts) => ts.map((t) => (t.id === todo.id ? { ...t, done: next } : t)));
    try {
      await api.updateTodo(todo.id, { done: next });
      showToast(next ? "Marked complete" : "Marked active");
    } catch (err) {
      console.error(err);
      showToast("Could not update status");
      refresh();
    }
  }

  function startEdit(todo) {
    setEditingId(todo.id);
    setEditForm({
      text: todo.text,
      description: todo.description || "",
      priority: todo.priority ?? 3,
      due_date: todo.due_date || "",
      done: Boolean(todo.done),
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setEditForm(emptyForm);
  }

  async function saveEdit(e) {
    e.preventDefault();
    if (!editForm.text.trim()) {
      showToast("Title cannot be empty");
      return;
    }
    try {
      await api.updateTodo(editingId, {
        text: editForm.text.trim(),
        description: editForm.description.trim(),
        priority: Number(editForm.priority),
        due_date: editForm.due_date || null,
        done: editForm.done,
      });
      setEditingId(null);
      refresh();
      showToast("Todo updated");
    } catch (err) {
      console.error(err);
      showToast("Could not update todo");
    }
  }

  async function remove(todo) {
    if (!window.confirm("Delete this todo? This cannot be undone.")) return;
    try {
      await api.deleteTodo(todo.id);
      if (editingId === todo.id) cancelEdit();
      refresh();
      showToast("Todo deleted");
    } catch (err) {
      console.error(err);
      showToast("Could not delete todo");
    }
  }

  const total = todos.length;
  const doneCount = todos.filter((t) => t.done).length;
  const activeCount = total - doneCount;

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
      <div className="todos-hero">
        <div>
          <h1>Your todos</h1>
          <p>Plan, prioritize, and clear your list without the clutter.</p>
        </div>
      </div>

      <div className="stats-row">
        <div className="stat-chip">
          <span className="label">Total</span>
          <span className="value">{total}</span>
        </div>
        <div className="stat-chip warn">
          <span className="label">Active</span>
          <span className="value">{activeCount}</span>
        </div>
        <div className="stat-chip accent">
          <span className="label">Done</span>
          <span className="value">{doneCount}</span>
        </div>
      </div>

      <div className="panel">
        <div className="panel-header">
          <strong>Task list</strong>
          <span style={{ color: "var(--muted)", fontSize: 13 }}>{visible.length} shown</span>
        </div>
        <div className="panel-body">
          <form onSubmit={addTodo} className="todo-form">
            <div className="form-group span-2">
              <label htmlFor="new-title">Title</label>
              <input
                id="new-title"
                type="text"
                className="form-control"
                placeholder="e.g. Finish project report"
                value={form.text}
                onChange={(e) => setForm({ ...form, text: e.target.value })}
              />
            </div>
            <div className="form-group span-2">
              <label htmlFor="new-description">Description</label>
              <textarea
                id="new-description"
                rows={2}
                className="form-control"
                placeholder="What needs to happen?"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label htmlFor="new-priority">Priority</label>
              <select
                id="new-priority"
                className="sort-select form-control"
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: Number(e.target.value) })}
              >
                {PRIORITIES.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="new-due">Due date</label>
              <input
                id="new-due"
                type="date"
                className="form-control"
                value={form.due_date}
                onChange={(e) => setForm({ ...form, due_date: e.target.value })}
              />
            </div>
            <div className="todo-form-actions">
              <button type="submit" className="btn btn-primary">Add todo</button>
            </div>
          </form>

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
              {visible.map((todo, i) =>
                editingId === todo.id ? (
                  <li key={todo.id} className="todo-item editing">
                    <form onSubmit={saveEdit} className="todo-form" style={{ borderBottom: "none", marginBottom: 0, paddingBottom: 0 }}>
                      <div className="form-group span-2">
                        <label htmlFor={`edit-title-${todo.id}`}>Title</label>
                        <input
                          id={`edit-title-${todo.id}`}
                          type="text"
                          className="form-control"
                          value={editForm.text}
                          onChange={(e) => setEditForm({ ...editForm, text: e.target.value })}
                        />
                      </div>
                      <div className="form-group span-2">
                        <label htmlFor={`edit-description-${todo.id}`}>Description</label>
                        <textarea
                          id={`edit-description-${todo.id}`}
                          rows={2}
                          className="form-control"
                          value={editForm.description}
                          onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                        />
                      </div>
                      <div className="form-group">
                        <label htmlFor={`edit-priority-${todo.id}`}>Priority</label>
                        <select
                          id={`edit-priority-${todo.id}`}
                          className="sort-select form-control"
                          value={editForm.priority}
                          onChange={(e) => setEditForm({ ...editForm, priority: Number(e.target.value) })}
                        >
                          {PRIORITIES.map((p) => (
                            <option key={p.value} value={p.value}>{p.label}</option>
                          ))}
                        </select>
                      </div>
                      <div className="form-group">
                        <label htmlFor={`edit-due-${todo.id}`}>Due date</label>
                        <input
                          id={`edit-due-${todo.id}`}
                          type="date"
                          className="form-control"
                          value={editForm.due_date}
                          onChange={(e) => setEditForm({ ...editForm, due_date: e.target.value })}
                        />
                      </div>
                      <div className="form-group span-2">
                        <label className="todo-form-inline-check">
                          <input
                            type="checkbox"
                            checked={editForm.done}
                            onChange={(e) => setEditForm({ ...editForm, done: e.target.checked })}
                          />
                          Mark as completed
                        </label>
                      </div>
                      <div className="todo-form-actions">
                        <button type="button" className="btn btn-ghost btn-sm" onClick={cancelEdit}>
                          Cancel
                        </button>
                        <button type="button" className="btn btn-danger btn-sm" onClick={() => remove(todo)}>
                          Delete
                        </button>
                        <button type="submit" className="btn btn-primary btn-sm">
                          Save changes
                        </button>
                      </div>
                    </form>
                  </li>
                ) : (
                  <li
                    key={todo.id}
                    className={`todo-item${todo.done ? " complete" : ""}`}
                    style={{ animationDelay: `${i * 0.04}s` }}
                  >
                    <button
                      type="button"
                      className={`todo-check${todo.done ? " checked" : ""}`}
                      onClick={() => toggle(todo)}
                      aria-label={todo.done ? "Mark as active" : "Mark as complete"}
                      title="Toggle complete"
                    />
                    <div className="todo-main">
                      <h3 className="todo-title">{todo.text}</h3>
                      {todo.description && <p className="todo-desc">{todo.description}</p>}
                      <div className="todo-meta">
                        <span className={`priority-badge p${todo.priority}`}>
                          Priority {todo.priority}
                        </span>
                        <span className={`status-pill${todo.done ? " done" : ""}`}>
                          {todo.done ? "Completed" : "In progress"}
                        </span>
                        {todo.due_date && (
                          <span className={`due-chip${isOverdue(todo) ? " overdue" : ""}`}>
                            Due {formatDue(todo.due_date)}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="todo-actions">
                      <button type="button" className="btn btn-info btn-sm" onClick={() => startEdit(todo)}>
                        Edit
                      </button>
                    </div>
                  </li>
                )
              )}
            </ul>
          )}

          {total === 0 && (
            <div className="empty-state">
              <h3>No todos yet</h3>
              <p>Add your first task and start clearing the day.</p>
            </div>
          )}

          {total > 0 && visible.length === 0 && (
            <div className="empty-state">
              <h3>Nothing matches</h3>
              <p>Try another filter or search term.</p>
            </div>
          )}
        </div>
      </div>

      <div className={`toast-msg${toastVisible ? " show" : ""}`} role="status">
        {toastMsg}
      </div>
    </div>
  );
}
