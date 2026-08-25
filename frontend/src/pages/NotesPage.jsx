import { useEffect, useState, useCallback, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Plus, Trash2 } from "lucide-react";
import { api } from "../api.js";

export default function NotesPage() {
  const [searchParams] = useSearchParams();
  const [notes, setNotes] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const saveTimer = useRef(null);

  const refresh = useCallback(async (selectId) => {
    const list = await api.listNotes();
    setNotes(list);
    if (selectId) {
      const n = list.find((x) => x.id === selectId);
      if (n) {
        setActiveId(n.id);
        setTitle(n.title);
        setContent(n.content);
      }
    } else if (!activeId && list.length > 0) {
      setActiveId(list[0].id);
      setTitle(list[0].title);
      setContent(list[0].content);
    }
  }, [activeId]);

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const requestedNoteId = Number(searchParams.get("note")) || null;

  useEffect(() => {
    if (!requestedNoteId || notes.length === 0) return;
    if (requestedNoteId === activeId) return;
    const n = notes.find((x) => x.id === requestedNoteId);
    if (n) selectNote(n);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestedNoteId, notes]);

  function selectNote(n) {
    setActiveId(n.id);
    setTitle(n.title);
    setContent(n.content);
  }

  async function newNote() {
    const created = await api.createNote({ title: "Untitled", content: "" });
    await refresh(created.id);
  }

  async function removeNote(id, e) {
    e.stopPropagation();
    await api.deleteNote(id);
    if (id === activeId) {
      setActiveId(null);
      setTitle("");
      setContent("");
    }
    refresh();
  }

  // Debounced autosave whenever title/content change for the active note.
  useEffect(() => {
    if (!activeId) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      await api.updateNote(activeId, { title, content });
      setNotes((prev) =>
        prev.map((n) => (n.id === activeId ? { ...n, title, content } : n))
      );
    }, 500);
    return () => clearTimeout(saveTimer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, content]);

  return (
    <div>
      <div className="page-header">Markdown</div>
      <h1 className="page-title">Notes</h1>

      <div style={{ display: "flex", gap: 24, alignItems: "flex-start" }}>
        <div style={{ width: 220, flexShrink: 0 }}>
          <button className="btn btn-primary" onClick={newNote} style={{ width: "100%", marginBottom: 12 }}>
            <Plus size={16} />
            New note
          </button>
          {notes.map((n) => (
            <div
              key={n.id}
              onClick={() => selectNote(n)}
              className="card"
              style={{
                padding: "10px 12px",
                marginBottom: 8,
                cursor: "pointer",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                borderColor: n.id === activeId ? "var(--accent)" : "var(--line)",
              }}
            >
              <span
                style={{
                  fontSize: 13.5,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {n.title || "Untitled"}
              </span>
              <button
                className="btn btn-icon"
                onClick={(e) => removeNote(n.id, e)}
                style={{ border: "none", background: "transparent" }}
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>

        {activeId ? (
          <div style={{ flex: 1, display: "flex", gap: 16 }}>
            <div style={{ flex: 1 }}>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Title"
                style={{ width: "100%", fontSize: 16, fontWeight: 600, marginBottom: 10 }}
              />
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Write markdown…"
                className="card"
                style={{ width: "100%", minHeight: 420, resize: "vertical", padding: 12, fontFamily: "var(--font-display)", fontSize: 13.5, lineHeight: 1.6 }}
              />
            </div>
            <div className="card markdown-preview" style={{ flex: 1, padding: "16px 20px", minHeight: 460, overflowY: "auto" }}>
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{content || "*Nothing to preview yet.*"}</ReactMarkdown>
            </div>
          </div>
        ) : (
          <p style={{ color: "var(--ink-faint)" }}>Create a note to get started.</p>
        )}
      </div>
    </div>
  );
}
