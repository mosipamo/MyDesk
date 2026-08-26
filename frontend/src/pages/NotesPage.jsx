import { useEffect, useState, useCallback, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { Plus, Trash2, Star, Sparkles, Code2 } from "lucide-react";
import { api } from "../api.js";
import EmptyState from "../components/EmptyState.jsx";
import LiveMarkdown from "../components/LiveMarkdown.jsx";

const MODE_KEY = "mydesk-notes-mode";

export default function NotesPage() {
  const [searchParams] = useSearchParams();
  const [notes, setNotes] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [pinned, setPinned] = useState(false);
  const [mode, setMode] = useState(
    () => localStorage.getItem(MODE_KEY) === "source" ? "source" : "live"
  );
  const [saveState, setSaveState] = useState("idle"); // idle | saving | saved | error
  const saveTimer = useRef(null);
  const savedSnapshot = useRef(null);

  useEffect(() => {
    localStorage.setItem(MODE_KEY, mode);
  }, [mode]);

  useEffect(() => {
    function onKey(e) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "e") {
        // Capture phase keeps Chromium from treating Ctrl+E as omnibox search.
        e.preventDefault();
        e.stopPropagation();
        setMode((m) => (m === "live" ? "source" : "live"));
      }
    }
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, []);

  const applyNote = (n) => {
    setActiveId(n.id);
    setTitle(n.title);
    setContent(n.content);
    setPinned(Boolean(n.pinned));
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
          setPinned(Boolean(first.pinned));
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
      setPinned(false);
      savedSnapshot.current = null;
    }
    refresh();
  }

  async function togglePin(noteId) {
    const next = !pinned;
    setPinned(next);
    // Reorder locally so pinned notes float to the top without a refetch
    // (a refetch would clobber in-progress edits).
    setNotes((prev) => {
      const flipped = prev.map((n) => (n.id === noteId ? { ...n, pinned: next } : n));
      const head = flipped.filter((n) => n.pinned);
      const tail = flipped.filter((n) => !n.pinned);
      return [...head, ...tail];
    });
    try {
      await api.updateNote(noteId, { pinned: next });
    } catch {
      setPinned(!next);
    }
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
          <p className="page-sub">Live markdown — type it, see it, no separate preview.</p>
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
              {n.pinned && (
                <Star size={12} fill="var(--warn)" color="var(--warn)" className="pin-flag" />
              )}
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
          <div className="editor-column">
            <div className="editor-topbar">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Title"
                className="title-input"
                aria-label="Note title"
              />
              <div className="editor-tools">
                <button
                  type="button"
                  className={`pin-btn${pinned ? " on" : ""}`}
                  onClick={() => togglePin(activeId)}
                  aria-pressed={pinned}
                  title={pinned ? "Unpin note" : "Pin note to top"}
                >
                  <Star size={15} fill={pinned ? "currentColor" : "none"} />
                </button>
                <div className="tool-seg" role="group" aria-label="Editor mode">
                  <button
                    type="button"
                    className={mode === "live" ? "active" : ""}
                    onClick={() => setMode("live")}
                    title="Live preview (Ctrl+E)"
                    aria-pressed={mode === "live"}
                  >
                    <Sparkles size={15} />
                  </button>
                  <button
                    type="button"
                    className={mode === "source" ? "active" : ""}
                    onClick={() => setMode("source")}
                    title="Raw markdown source (Ctrl+E)"
                    aria-pressed={mode === "source"}
                  >
                    <Code2 size={15} />
                  </button>
                </div>
                <span
                  className={`save-pill${saveState === "saving" ? " saving" : ""}${saveState === "saved" ? " saved" : ""}`}
                >
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

            {mode === "live" ? (
              <LiveMarkdown
                key={activeId}
                value={content}
                onChange={setContent}
                placeholder="Start writing… markdown works instantly (# heading, **bold**, - list)"
              />
            ) : (
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Write markdown…"
                className="card editor-area source-area"
                style={{ fontFamily: "var(--font-display)" }}
                aria-label="Note content"
              />
            )}

            <div className="editor-footmeta">
              <span>
                {words} word{words === 1 ? "" : "s"} · {content.length} chars ·{" "}
                <kbd>Ctrl E</kbd> toggles raw view
              </span>
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
