import { useEffect, useState } from "react";
import { X, Save, Trash2, Loader2 } from "lucide-react";
import { api } from "../api.js";

export const PRIORITIES = [
  { value: 1, label: "1 · Low" },
  { value: 2, label: "2 · Mild" },
  { value: 3, label: "3 · Normal" },
  { value: 4, label: "4 · High" },
  { value: 5, label: "5 · Urgent" },
];

const emptyForm = { text: "", description: "", priority: 3, due_date: "" };

export default function TodoFormModal({ open, todo, onSaved, onClose }) {
  const isEdit = Boolean(todo);
  const [form, setForm] = useState(emptyForm);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setError("");
    setForm(
      todo
        ? {
            text: todo.text,
            description: todo.description || "",
            priority: todo.priority ?? 3,
            due_date: todo.due_date || "",
          }
        : emptyForm
    );
  }, [open, todo]);

  useEffect(() => {
    if (!open) return;
    function onKey(e) {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    }
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [open, onClose]);

  if (!open) return null;

  async function submit(e) {
    e.preventDefault();
    if (!form.text.trim()) {
      setError("Give the task a title first.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      if (todo) {
        await api.updateTodo(todo.id, {
          text: form.text.trim(),
          description: form.description.trim(),
          priority: Number(form.priority),
          due_date: form.due_date || null,
        });
        onSaved("Todo updated");
      } else {
        await api.createTodo({
          text: form.text.trim(),
          description: form.description.trim(),
          priority: Number(form.priority),
          due_date: form.due_date || null,
          position: 0,
        });
        onSaved("Todo added");
      }
      onClose();
    } catch {
      setError("Could not save — please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function del() {
    if (!todo) return;
    if (!window.confirm("Delete this todo? This cannot be undone.")) return;
    setBusy(true);
    setError("");
    try {
      await api.deleteTodo(todo.id);
      onSaved("Todo deleted");
      onClose();
    } catch {
      setError("Could not delete — please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="modal-overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-panel" role="dialog" aria-modal="true" aria-label={isEdit ? "Edit todo" : "New todo"}>
        <div className="modal-head">
          <h3>{isEdit ? "Edit todo" : "New todo"}</h3>
          <button
            type="button"
            className="modal-x"
            onClick={onClose}
            aria-label="Close"
            title="Close (Esc)"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={submit} className="modal-body">
          <div className="form-group">
            <label htmlFor="todo-text">Title</label>
            <input
              id="todo-text"
              type="text"
              className="form-control"
              placeholder="e.g. Finish project report"
              value={form.text}
              onChange={(e) => setForm({ ...form, text: e.target.value })}
              autoFocus
            />
          </div>

          <div className="form-group">
            <label htmlFor="todo-desc">Description</label>
            <textarea
              id="todo-desc"
              rows={3}
              className="form-control"
              placeholder="What needs to happen?"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>

          <div className="modal-row">
            <div className="form-group">
              <label htmlFor="todo-priority">Priority</label>
              <select
                id="todo-priority"
                className="form-control"
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: Number(e.target.value) })}
              >
                {PRIORITIES.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="todo-due">Due date</label>
              <input
                id="todo-due"
                type="date"
                className="form-control"
                value={form.due_date}
                onChange={(e) => setForm({ ...form, due_date: e.target.value })}
              />
            </div>
          </div>

          {error && <p className="form-error">{error}</p>}

          <div className="modal-actions">
            {isEdit && (
              <button type="button" className="btn btn-danger" onClick={del} disabled={busy}>
                <Trash2 size={14} />
                Delete
              </button>
            )}
            <span className="spacer" />
            <button type="button" className="btn btn-ghost" onClick={onClose} disabled={busy}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={busy}>
              {busy ? <Loader2 className="spin" size={14} /> : <Save size={15} />}
              {isEdit ? "Save changes" : "Add todo"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
