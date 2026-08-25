import { useEffect, useState, useCallback, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Plus, Trash2 } from "lucide-react";
import { api } from "../api.js";
import EmptyState from "../components/EmptyState.jsx";

export default function NotesPage() {
  const [searchParams] = useSearchParams();
  const [notes, setNotes] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [saveState, setSaveState] = useState("idle"); // idle | saving | saved
  const saveTimer = useRef(null);
  const savedSnapshot = useRef(null);

  const applyNote = (n) => {
    setActiveId(n.id);
    setTitle(n.title);
    setContent(n.content);
    savedSnapshot.current = `${n.id}|${n.title}|${n.content}`;
    setSaveState("idle");
  };

  const refresh = useCallback(async (selectId) => {
    const list = await api.listNotes();
    setNotes(list);
    if (selectId) {
      const n = list.find((x) => x.id === selectId);
      if (n) applyNote(n);
    } else {
      setActiveId((current) => {
        if (current) return current;
        if (list.length > 0) {
          const first = list[0];
          setTitle(first.title);
          setContent(first.content);
          savedSnapshot.current = `${first.id}|${first.title}|${first.content}`;
          return first.id;
        }
        return current;
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const requestedNoteId = Number(searchParams.get("note")) || null;

  useEffect(() => {
    if (!requestedNoteId || notes.length === 0) return;
    if (requestedNoteId === activeId) return;
    const n = notes.find((x) => x.id === requestedNoteId);
    if (n) applyNote(n);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestedNoteId, notes]);

  function selectNote(n) {
    applyNote(n);
  }

  async function newNote() {
    const created = await api.createNote({ title: "Untitled", content: "" });
    await refresh(created.id);
  }

  async function removeNote(id, e) {
    e.stopPropagation();
    if (!window.confirm("Delete this note? This cannot be undone.")) return;
    await api.deleteNote(id);
    if (id === activeId) {
      setActiveId(null);
      setTitle("");
      setContent("");
      savedSnapshot.current = null;
    }
    refresh();
  }

  // Debounced autosave whenever title/content change for the active note.
  useEffect(() => {
    if (!activeId) return;
    const snapshot = `${activeId}|${title}|${content}`;
    if (snapshot === savedSnapshot.current) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      setSaveState("saving");
      try {
        await api.updateNote(activeId, { title, content });
      } catch {
        setSaveState("error");
        return;
      }
      savedSnapshot.current = snapshot;
      setNotes((prev) =>
        prev.map((n) => (n.id === activeId ? { ...n, title, content } : n))
      );
      setSaveState("saved");
      setTimeout(() => setSaveState((s) => (s === "saved" ? "idle" : s)), 1800);
    }, 500);
    return () => clearTimeout(saveTimer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, content, activeId]);

  const words = content.trim() ? content.trim().split(/\s+/).length : 0;

  return (
    <div>
      <div className="page-header">Markdown</div>
      <div className="page-title-row">
        <div>
          <h1 className="page-title">Notes</h1>
          <p className="page-sub">Write in markdown — it saves itself as you type.</p>
        </div>
      </div>

      <div className="notes-layout">
        <div className="notes-nav">
          <button className="btn btn-primary" onClick={newNote} style={{ width: "100%" }}>
            <Plus size={16} />
            New note
          </button>
          {notes.map((n, i) => (
            <div
              key={n.id}
              onClick={() => selectNote(n)}
              className={`list-row${n.id === activeId ? " active" : ""}`}
              style={{ animationDelay: `${Math.min(i * 0.04, 0.3)}s` }}
            >
              <span className="row-title">{n.title || "Untitled"}</span>
              <button
                type="button"
                className="delete-inline"
                aria-label={`Delete ${n.title || "note"}`}
                onClick={(e) => removeNote(n.id, e)}
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
          {notes.length > 0 && (
            <div className="notes-count">
              {notes.length} note{notes.length === 1 ? "" : "s"}
            </div>
          )}
        </div>

        {activeId ? (
          <div className="editor-grid">
            <div className="editor-pane">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Title"
                className="title-input"
                aria-label="Note title"
              />
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Write markdown…"
                className="card editor-area"
                style={{ fontFamily: "var(--font-display)" }}
                aria-label="Note content"
              />
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginTop: 8,
                  fontSize: 12.5,
                  color: "var(--muted)",
                }}
              >
                <span>
                  {words} word{words === 1 ? "" : "s"} · {content.length} chars
                </span>
                <span className={`save-pill${saveState === "saving" ? " saving" : ""}${saveState === "saved" ? " saved" : ""}`}>
                  <span className="save-dot" />
                  {saveState === "saving"
                    ? "Saving…"
                    : saveState === "saved"
                      ? "Saved"
                      : saveState === "error"
                        ? "Save failed"
                        : "Autosave on"}
                </span>
              </div>
            </div>
            <div className="card markdown-preview preview-card">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {content || "*Nothing to preview yet.*"}
              </ReactMarkdown>
            </div>
          </div>
        ) : (
          <EmptyState
            variant="note"
            title={notes.length ? "Select a note" : "No notes yet"}
            hint={
              notes.length
                ? "Pick a note from the list, or create a new one."
                : "Create your first note — markdown supported."
            }
            action={
              <button className="btn btn-primary" onClick={newNote}>
                <Plus size={15} />
                New note
              </button>
            }
          />
        )}
      </div>
    </div>
  );
}
